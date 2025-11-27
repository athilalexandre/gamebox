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
    res.json(loadConfig());
});

app.put('/api/settings', (req, res) => {
    const success = saveConfig(req.body);
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

app.put('/api/commands', (req, res) => {
    const success = saveCommands(req.body);
    res.json({ success });
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

export function startServer(port = 3000) {
    app.listen(port, () => {
        console.log(`[SERVER] Dashboard rodando em http://localhost:${port}`);
    });
}
