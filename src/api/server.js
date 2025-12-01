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

// Reset Database (DANGER ZONE)
app.post('/api/reset-database', async (req, res) => {
    try {
        const fs = await import('fs');
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        const { resetCustomCommands } = await import('../utils/storage.js');

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const dataDir = path.join(__dirname, '../../data');

        // Deleta arquivos de dados de usuários e jogos
        const filesToDelete = ['games.json', 'users.json'];

        filesToDelete.forEach(file => {
            const filePath = path.join(dataDir, file);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });

        // Recria arquivos vazios/padrão
        fs.writeFileSync(path.join(dataDir, 'games.json'), JSON.stringify([], null, 2));
        fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify({}, null, 2));

        // Remove apenas comandos customizados (preserva core)
        resetCustomCommands();

        res.json({
            success: true,
            message: 'Banco de dados resetado com sucesso. Comandos core foram preservados.'
        });
    } catch (error) {
        console.error('Erro ao resetar banco de dados:', error);
        res.status(500).json({ success: false, error: error.message });
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

    const existingCommand = commands[index];
    const isCore = existingCommand.type === 'core' || existingCommand.core === true;

    if (isCore) {
        // Para comandos core, apenas permite editar campos específicos
        commands[index] = {
            ...existingCommand,
            // Campos editáveis
            enabled: updatedData.enabled !== undefined ? updatedData.enabled : existingCommand.enabled,
            cooldown: updatedData.cooldown !== undefined ? updatedData.cooldown : existingCommand.cooldown,
            // Campos protegidos - nunca mudam
            type: 'core',
            core: true,
            name: commandName, // Nome nunca muda
            aliases: existingCommand.aliases, // Aliases são fixos
            description: existingCommand.description, // Descrição é fixa
            level: existingCommand.level, // Level é fixo para core commands
            category: existingCommand.category,
            hidden: existingCommand.hidden,
            response: existingCommand.response
        };
    } else {
        // Para comandos custom, permite editar tudo exceto o nome
        commands[index] = {
            ...existingCommand,
            ...updatedData,
            name: commandName, // Nome nunca muda
            type: 'custom' // Garante que permanece custom
        };
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

// IGDB Bulk Sync with Rarity Balancing
app.post('/api/igdb/sync', async (req, res) => {
    try {
        // 1. Buscar 500 jogos do IGDB
        const igdbGames = await IgdbService.getTopGames();

        // 2. Carregar jogos existentes
        let allGames = GameService.getAllGames();

        // 3. Mesclar novos jogos (evitando duplicatas por nome)
        let addedCount = 0;

        igdbGames.forEach(igdbGame => {
            const existingIndex = allGames.findIndex(g =>
                g.name.toLowerCase().trim() === igdbGame.name.toLowerCase().trim()
            );

            const gameData = {
                name: igdbGame.name,
                console: igdbGame.platforms ? igdbGame.platforms.map(p => p.name).join(', ') : 'N/A',
                releaseYear: igdbGame.first_release_date
                    ? new Date(igdbGame.first_release_date * 1000).getFullYear()
                    : 2000,
                originalRating: igdbGame.aggregated_rating || 0, // Metacritic-based rating
                cover: igdbGame.cover ? igdbGame.cover.url : null
            };

            if (existingIndex >= 0) {
                // Atualiza dados existentes (preserva ID e raridade atual temporariamente)
                allGames[existingIndex] = {
                    ...allGames[existingIndex],
                    ...gameData
                };
            } else {
                // Novo jogo
                const newId = allGames.length > 0
                    ? Math.max(...allGames.map(g => g.id)) + 1 + addedCount
                    : 1 + addedCount;
                allGames.push({ id: newId, rarity: 'E', ...gameData });
                addedCount++;
            }
        });

        // 4. Ordenar todos os jogos por rating (decrescente)
        allGames.sort((a, b) => (b.originalRating || 0) - (a.originalRating || 0));

        // 5. Aplicar Distribuição de Raridade Balanceada
        const total = allGames.length;

        // Percentuais conforme solicitado
        const distribution = [
            { rarity: 'SSS', percent: 0.005 },  // 0.5%
            { rarity: 'SS', percent: 0.015 },   // 1.5%
            { rarity: 'S', percent: 0.03 },     // 3%
            { rarity: 'A', percent: 0.05 },     // 5%
            { rarity: 'B', percent: 0.10 },     // 10%
            { rarity: 'C', percent: 0.15 },     // 15%
            { rarity: 'D', percent: 0.25 },     // 25%
            // E = resto (40%)
        ];

        let currentIndex = 0;

        distribution.forEach(({ rarity, percent }) => {
            const count = Math.ceil(total * percent);
            for (let i = 0; i < count && currentIndex < total; i++) {
                allGames[currentIndex].rarity = rarity;
                currentIndex++;
            }
        });

        // Resto recebe E
        while (currentIndex < total) {
            allGames[currentIndex].rarity = 'E';
            currentIndex++;
        }

        // 6. Salvar tudo
        const success = GameService.saveAllGames(allGames);

        if (success) {
            res.json({
                success: true,
                total: total,
                added: addedCount,
                distribution: {
                    SSS: allGames.filter(g => g.rarity === 'SSS').length,
                    SS: allGames.filter(g => g.rarity === 'SS').length,
                    S: allGames.filter(g => g.rarity === 'S').length,
                    A: allGames.filter(g => g.rarity === 'A').length,
                    B: allGames.filter(g => g.rarity === 'B').length,
                    C: allGames.filter(g => g.rarity === 'C').length,
                    D: allGames.filter(g => g.rarity === 'D').length,
                    E: allGames.filter(g => g.rarity === 'E').length
                }
            });
        } else {
            res.status(500).json({ error: 'Erro ao salvar jogos' });
        }

    } catch (error) {
        console.error('Erro no sync IGDB:', error);
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
