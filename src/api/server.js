import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { startBot, stopBot, getBotStatus } from '../bot/index.js';
import { loadConfig, saveConfig, loadCommands, saveCommands } from '../utils/storage.js';
import * as UserService from '../services/userService.js';
import * as GameService from '../services/gameService.js';
import * as IgdbService from '../services/igdbService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do dashboard
app.use(express.static(path.join(__dirname, '../../public')));

// --- API Routes ---

// Bot Control
app.get('/api/bot/status', (req, res) => {
    res.json(getBotStatus());
});

app.post('/api/bot/connect', async (req, res) => {
    try {
        await startBot();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/bot/disconnect', async (req, res) => {
    try {
        await stopBot();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Configurações
app.get('/api/settings', (req, res) => {
    const config = loadConfig();
    res.json(config);
});

app.put('/api/settings', (req, res) => {
    const newConfig = req.body;
    const currentConfig = loadConfig();

    if (newConfig.boxPrice < 0) {
        return res.status(400).json({ success: false, error: 'O preço da caixa não pode ser negativo.' });
    }

    if (newConfig.twitchOAuthToken && newConfig.twitchOAuthToken.includes('***')) {
        newConfig.twitchOAuthToken = currentConfig.twitchOAuthToken;
    }

    if (newConfig.twitchOAuthToken === '') {
        newConfig.twitchOAuthToken = '';
    }

    const success = saveConfig(newConfig);
    if (success) {
        res.json({ success: true });
    } else {
        res.status(500).json({ success: false, error: 'Erro ao salvar configurações' });
    }
});

// Comandos
app.get('/api/commands', (req, res) => {
    res.json(loadCommands());
});

app.post('/api/commands', (req, res) => {
    const { name, description, response, type, level, cooldown, aliases, enabled } = req.body;
    const commands = loadCommands();

    if (!name || !name.startsWith('!')) {
        return res.status(400).json({ success: false, error: 'Nome do comando deve começar com !' });
    }

    if (commands.find(c => c.name === name)) {
        return res.status(400).json({ success: false, error: 'Comando já existe' });
    }

    if (type === 'custom' && !response) {
        return res.status(400).json({ success: false, error: 'Comandos customizados precisam de uma resposta' });
    }

    const newCommand = {
        name,
        type: type || 'custom',
        description: description || '',
        response: response || '',
        level: level || 'viewer',
        cooldown: cooldown || 0,
        aliases: aliases || [],
        enabled: enabled !== undefined ? enabled : true
    };

    commands.push(newCommand);
    saveCommands(commands);
    res.json({ success: true, command: newCommand });
});

app.put('/api/commands/:name', (req, res) => {
    const commandName = decodeURIComponent(req.params.name);
    const updatedData = req.body;
    let commands = loadCommands();

    const index = commands.findIndex(c => c.name === commandName);
    if (index === -1) {
        return res.status(404).json({ success: false, error: 'Comando não encontrado' });
    }

    commands[index] = { ...commands[index], ...updatedData };

    if (commands[index].type === 'core') {
        commands[index].name = commandName;
    }

    saveCommands(commands);
    res.json({ success: true, command: commands[index] });
});

app.delete('/api/commands/:name', (req, res) => {
    const commandName = decodeURIComponent(req.params.name);
    let commands = loadCommands();

    const cmd = commands.find(c => c.name === commandName);
    if (!cmd) {
        return res.status(404).json({ success: false, error: 'Comando não encontrado' });
    }

    if (cmd.type === 'core') {
        return res.status(403).json({ success: false, error: 'Não é possível deletar comandos do sistema' });
    }

    commands = commands.filter(c => c.name !== commandName);
    saveCommands(commands);
    res.json({ success: true });
});

// Jogos
app.get('/api/games', (req, res) => {
    const games = GameService.getAllGames();
    res.json(games);
});

app.post('/api/games', (req, res) => {
    const game = GameService.addGame(req.body);
    res.json(game);
});

app.put('/api/games/:id', (req, res) => {
    const game = GameService.updateGame(parseInt(req.params.id), req.body);
    if (game) {
        res.json(game);
    } else {
        res.status(404).json({ error: 'Jogo não encontrado' });
    }
});

app.delete('/api/games/:id', (req, res) => {
    const success = GameService.deleteGame(parseInt(req.params.id));
    if (success) {
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Jogo não encontrado' });
    }
});

// Usuários
app.get('/api/users', (req, res) => {
    const users = UserService.getAllUsers();
    const usersList = Object.entries(users).map(([username, data]) => ({
        username,
        ...data
    }));
    res.json(usersList);
});

app.get('/api/users/:username', (req, res) => {
    const user = UserService.getOrCreateUser(req.params.username);
    res.json(user);
});

app.put('/api/users/:username', (req, res) => {
    const user = UserService.updateUser(req.params.username, req.body);
    res.json(user);
});

// IGDB Proxy
app.get('/api/igdb/search', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    try {
        const results = await IgdbService.searchGames(query);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/igdb/top', async (req, res) => {
    try {
        const results = await IgdbService.getTopGames();
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- SSE (Server-Sent Events) para Logs em Tempo Real ---
// IMPORTANTE: Esta rota deve vir ANTES da rota catch-all (*)
let clients = [];

app.get('/api/events', (req, res) => {
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    res.writeHead(200, headers);

    const clientId = Date.now();
    const newClient = {
        id: clientId,
        res
    };
    clients.push(newClient);

    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Log conectado' })}\n\n`);

    req.on('close', () => {
        clients = clients.filter(c => c.id !== clientId);
    });
});

export function broadcastLog(message, type = 'info') {
    const logEntry = {
        timestamp: new Date().toLocaleTimeString(),
        message,
        type
    };

    clients.forEach(client => {
        client.res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
    });
}

// Rota padrão para SPA (catch-all)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/index.html'));
});

export function startServer(port = 3000) {
    app.listen(port, () => {
        console.log(`[SERVER] Dashboard rodando em http://localhost:${port}`);
    });
}
