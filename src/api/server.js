import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { startBot, stopBot, getBotStatus } from '../bot/index.js';
import { ConfigRepository, UserRepository, GameRepository, CommandRepository, TradeRepository } from '../db/repositories/index.js';
import SeedService from '../db/services/SeedService.js';
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

// ========== CONFIGURAÇÕES ==========
app.get('/api/settings', async (req, res) => {
    try {
        const config = await ConfigRepository.getConfig();
        // Ocultar token OAuth sensível
        const safeConfig = {
            ...config.toObject(),
            twitchOAuthToken: config.twitchOAuthToken ? '***HIDDEN***' : ''
        };
        res.json(safeConfig);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/settings', async (req, res) => {
    try {
        const newConfig = req.body;
        const currentConfig = await ConfigRepository.getConfig();

        // Validações
        if (newConfig.boxPrice < 0) {
            return res.status(400).json({ success: false, error: 'O preço da caixa não pode ser negativo.' });
        }

        // Se token OAuth contém ***, mantém o atual (não substituir)
        if (newConfig.twitchOAuthToken && newConfig.twitchOAuthToken.includes('***')) {
            newConfig.twitchOAuthToken = currentConfig.twitchOAuthToken;
        }

        // Atualizar config
        await ConfigRepository.updateConfig(newConfig);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== TRADES ==========
app.get('/api/trades', async (req, res) => {
    try {
        const trades = await TradeRepository.getRecentTrades(50);

        // Formatar resposta para o frontend
        const formattedTrades = trades.map(trade => ({
            _id: trade._id,
            timestamp: trade.timestamp,
            initiator: trade.initiator,
            target: trade.target,
            gameFromInitiator: trade.gameFromInitiator?.name || 'Unknown',
            gameFromTarget: trade.gameFromTarget?.name || 'Unknown',
            status: trade.status,
            coinCostEach: trade.coinCostEach
        }));

        res.json(formattedTrades);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== COMANDOS ==========
app.get('/api/commands', async (req, res) => {
    try {
        const commands = await CommandRepository.getAllCommands();
        res.json(commands);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/commands', async (req, res) => {
    try {
        const { name, description, response, type, level, cooldown, aliases, enabled, category } = req.body;

        // Validações
        if (!name || !name.startsWith('!')) {
            return res.status(400).json({ success: false, error: 'Nome do comando deve começar com !' });
        }

        const exists = await CommandRepository.exists(name);
        if (exists) {
            return res.status(400).json({ success: false, error: 'Comando já existe' });
        }

        if (type === 'custom' && !response) {
            return res.status(400).json({ success: false, error: 'Comandos customizados precisam de uma resposta' });
        }

        const newCommand = await CommandRepository.createCommand({
            name,
            type: type || 'custom',
            description: description || '',
            response: response || '',
            level: level || 'viewer',
            cooldown: cooldown || 0,
            aliases: aliases || [],
            enabled: enabled !== undefined ? enabled : true,
            category: category || 'util',
            isCore: false
        });

        res.json({ success: true, command: newCommand });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/commands/:name', async (req, res) => {
    try {
        const commandName = decodeURIComponent(req.params.name);
        const updatedData = req.body;

        const command = await CommandRepository.getCommandByNameOrAlias(commandName);
        if (!command) {
            return res.status(404).json({ success: false, error: 'Comando não encontrado' });
        }

        // Se é comando core, apenas permite editar enabled e cooldown
        if (command.isCore) {
            const updates = {
                enabled: updatedData.enabled !== undefined ? updatedData.enabled : command.enabled,
                cooldown: updatedData.cooldown !== undefined ? updatedData.cooldown : command.cooldown
            };

            const updated = await CommandRepository.updateCommand(commandName, updates);
            res.json({ success: true, command: updated });
        } else {
            // Comandos custom podem editar tudo exceto nome
            const { name, ...allowedUpdates } = updatedData;
            const updated = await CommandRepository.updateCommand(commandName, allowedUpdates);
            res.json({ success: true, command: updated });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/commands/:name', async (req, res) => {
    try {
        const commandName = decodeURIComponent(req.params.name);
        await CommandRepository.deleteCommand(commandName);
        res.json({ success: true });
    } catch (error) {
        if (error.message.includes('Cannot delete core command')) {
            res.status(403).json({ success: false, error: 'Não é possível deletar comandos do sistema' });
        } else {
            res.status(500).json({ success: false, error: error.message });
        }
    }
});

// ========== JOGOS ==========
app.get('/api/games', async (req, res) => {
    try {
        const games = await GameRepository.getAllGames();
        // Map _id to id for frontend compatibility
        const formattedGames = games.map(game => ({
            id: game._id.toString(),
            _id: game._id,
            name: game.name,
            rarity: game.rarity,
            console: game.console,
            releaseYear: game.releaseYear,
            cover: game.cover,
            metacriticScore: game.metacriticScore,
            igdbId: game.igdbId,
            disabled: game.disabled,
            tradeable: game.tradeable
        }));
        res.json(formattedGames);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/games', async (req, res) => {
    try {
        const game = await GameRepository.createGame(req.body);
        res.json(game);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/games/:id', async (req, res) => {
    try {
        const game = await GameRepository.updateGame(req.params.id, req.body);
        if (game) {
            res.json(game);
        } else {
            res.status(404).json({ error: 'Jogo não encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/games/:id', async (req, res) => {
    try {
        await GameRepository.deleteGame(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== USUÁRIOS ==========
app.get('/api/users', async (req, res) => {
    try {
        const users = await UserRepository.getAllUsers();

        // Formatar para o frontend (incluir stats de inventário)
        const formattedUsers = users.map(user => ({
            username: user.username,
            coins: user.coins,
            boxCount: user.boxCount,
            xp: user.xp,
            level: user.level,
            inventoryCount: user.inventory?.length || 0,
            totalBoxesOpened: user.totalBoxesOpened,
            role: user.role
        }));

        res.json(formattedUsers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/users/:username', async (req, res) => {
    try {
        const user = await UserRepository.getUserByName(req.params.username);
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/users/:username', async (req, res) => {
    try {
        const user = await UserRepository.updateUser(req.params.username, req.body);
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== RESET DATABASE (DANGER ZONE) ==========
app.post('/api/reset-database', async (req, res) => {
    try {
        console.log('[RESET] 🚨 Iniciando reset do banco de dados...');

        // 1. Limpar usuários
        await UserRepository.deleteAll();
        console.log('[RESET] ✅ Usuários deletados');

        // 2. Limpar trades
        await TradeRepository.deleteAll();
        console.log('[RESET] ✅ Trades deletados');

        // 3. Limpar apenas comandos custom (PRESERVAR CORE)
        await CommandRepository.deleteAllCustomCommands();
        console.log('[RESET] ✅ Comandos custom deletados (core preservados)');

        // 4. Re-seed comandos core (garantir que existem)
        await SeedService.seedCoreCommands();
        console.log('[RESET] ✅ Comandos core re-seeded');

        // 5. (Opcional) Resetar config para defaults
        // await ConfigRepository.resetToDefaults();

        console.log('[RESET] ✅ Reset completo!');

        res.json({
            success: true,
            message: 'Banco de dados resetado com sucesso. Comandos core foram preservados.'
        });
    } catch (error) {
        console.error('[RESET] ❌ Erro ao resetar banco de dados:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== IGDB INTEGRATION ==========

app.get('/api/twitch/user/:username', async (req, res) => {
    try {
        const userInfo = await IgdbService.getUserInfo(req.params.username);
        if (userInfo) {
            res.json(userInfo);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

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

// IGDB Bulk Sync with Metacritic Rarity
app.post('/api/igdb/sync', async (req, res) => {
    try {
        console.log('[IGDB SYNC] 🔄 Iniciando sync com IGDB...');

        // 1. Buscar jogos do IGDB
        const igdbGames = await IgdbService.getTopGames();
        console.log(`[IGDB SYNC] Encontrados ${igdbGames.length} jogos no IGDB`);

        let addedCount = 0;
        let updatedCount = 0;

        // 2. Para cada jogo, fazer upsert no MongoDB
        for (const igdbGame of igdbGames) {
            const gameData = {
                igdbId: igdbGame.id,
                igdbSlug: igdbGame.slug,
                name: igdbGame.name,
                console: igdbGame.platforms ? igdbGame.platforms.map(p => p.name).join(', ') : 'N/A',
                releaseYear: igdbGame.first_release_date
                    ? new Date(igdbGame.first_release_date * 1000).getFullYear()
                    : null,
                originalRating: igdbGame.aggregated_rating || null,
                cover: igdbGame.cover ? igdbGame.cover.url : null,
                genres: igdbGame.genres ? igdbGame.genres.map(g => g.name) : [],
                // Metacritic score será adicionado posteriormente se disponível
                metacriticScore: igdbGame.aggregated_rating || null // Usar IGDB rating como placeholder
            };

            const existing = await GameRepository.getGameByIgdbId(igdbGame.id);

            if (existing) {
                await GameRepository.upsertGame(gameData);
                updatedCount++;
            } else {
                await GameRepository.upsertGame(gameData);
                addedCount++;
            }
        }

        // 3. Obter estatísticas de distribuição
        const stats = await GameRepository.getGameStats();
        const total = await GameRepository.getCount();

        console.log('[IGDB SYNC] ✅ Sync completo!');

        res.json({
            success: true,
            total: total,
            added: addedCount,
            updated: updatedCount,
            distribution: stats
        });

    } catch (error) {
        console.error('[IGDB SYNC] ❌ Erro no sync:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== SSE (Server-Sent Events) para Logs em Tempo Real ==========
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
