import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { startBot, stopBot, getBotStatus } from '../bot/index.js';
import { loadConfig, saveConfig, loadCommands, saveCommands } from '../utils/storage.js';
import * as UserService from '../services/userService.js';
import * as GameService from '../services/gameService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do dashboard
app.use(express.static(path.join(__dirname, '../../public')));

// --- API Routes ---

// Status do Bot
app.get('/api/status', (req, res) => {
    res.json(getBotStatus());
});

app.post('/api/bot/connect', async (req, res) => {
    const client = await startBot();
    if (client) {
        res.json({ success: true, status: 'connected' });
    } else {
        res.status(500).json({ success: false, error: 'Falha ao conectar. Verifique as configurações.' });
    }
});

app.post('/api/bot/disconnect', async (req, res) => {
    const success = await stopBot();
    res.json({ success });
});

// Configurações
app.get('/api/settings', (req, res) => {
    const config = loadConfig();
    // Segurança: Mascarar o token antes de enviar para o frontend
    if (config.twitchOAuthToken) {
        config.twitchOAuthToken = 'oauth:****************';
    }
    res.json(config);
});

app.put('/api/settings', (req, res) => {
    const newConfig = req.body;
    const currentConfig = loadConfig();

    // Validação básica
    if (newConfig.boxPrice < 0) {
        return res.status(400).json({ success: false, error: 'O preço da caixa não pode ser negativo.' });
    }

    // Segurança: Se o token vier mascarado, manter o token antigo
    if (newConfig.twitchOAuthToken && newConfig.twitchOAuthToken.includes('***')) {
        newConfig.twitchOAuthToken = currentConfig.twitchOAuthToken;
    }

    // Se o usuário limpou o campo (string vazia), salvar vazio
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

    // Validação
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
        description: description || 'Comando customizado',
        type: type || 'custom',
        response: response || '',
        enabled: enabled !== undefined ? enabled : true,
        cooldown: parseInt(cooldown) || 3,
        level: level || 'viewer',
        aliases: aliases || []
    };

    commands.push(newCommand);

    if (saveCommands(commands)) {
        broadcastLog(`Comando ${name} criado com sucesso.`, 'success');
        res.json({ success: true, command: newCommand });
    } else {
        res.status(500).json({ success: false, error: 'Erro ao salvar comando' });
    }
});

app.put('/api/commands/:name', (req, res) => {
    const commandName = req.params.name;
    const updatedData = req.body;
    const commands = loadCommands();

    const index = commands.findIndex(c => c.name === commandName);
    if (index === -1) {
        return res.status(404).json({ success: false, error: 'Comando não encontrado' });
    }

    // Atualiza os campos permitidos
    commands[index] = {
        ...commands[index],
        description: updatedData.description || commands[index].description,
        response: updatedData.response !== undefined ? updatedData.response : commands[index].response,
        aliases: updatedData.aliases || [],
        cooldown: parseInt(updatedData.cooldown) || 0,
        level: updatedData.level || 'viewer',
        enabled: updatedData.enabled !== undefined ? updatedData.enabled : true
    };

    if (saveCommands(commands)) {
        broadcastLog(`Comando ${commandName} atualizado.`, 'info');
        res.json({ success: true });
    } else {
        res.status(500).json({ success: false, error: 'Erro ao salvar comando' });
    }
});

app.delete('/api/commands/:name', (req, res) => {
    const commandName = req.params.name;
    const commands = loadCommands();

    const index = commands.findIndex(c => c.name === commandName);
    if (index === -1) {
        return res.status(404).json({ success: false, error: 'Comando não encontrado' });
    }

    // Não permitir deletar comandos core
    if (commands[index].type !== 'custom') {
        return res.status(403).json({ success: false, error: 'Não é possível deletar comandos do sistema' });
    }

    commands.splice(index, 1);

    if (saveCommands(commands)) {
        broadcastLog(`Comando ${commandName} removido.`, 'warning');
        res.json({ success: true });
    } else {
        res.status(500).json({ success: false, error: 'Erro ao remover comando' });
    }
});

// Jogos
app.get('/api/games', (req, res) => {
    res.json(GameService.getAllGames());
});

app.post('/api/games', (req, res) => {
    const game = GameService.addGame(req.body);
    res.json(game);
});

app.put('/api/games/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const game = GameService.updateGame(id, req.body);
    if (game) res.json(game);
    else res.status(404).json({ error: 'Jogo não encontrado' });
});

app.delete('/api/games/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const success = GameService.deleteGame(id);
    res.json({ success });
});

// Usuários
app.get('/api/users', (req, res) => {
    const users = UserService.getAllUsers();
    // Converte objeto para array para facilitar no frontend
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

// Rota padrão para SPA (se necessário, mas aqui é simples)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// --- SSE (Server-Sent Events) para Logs em Tempo Real ---
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

    // Envia mensagem inicial
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

export function startServer(port = 3000) {
    app.listen(port, () => {
        console.log(`[SERVER] Dashboard rodando em http://localhost:${port}`);
    });
}
