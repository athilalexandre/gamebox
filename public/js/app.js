const API_URL = 'http://localhost:3000/api';

// State
let currentState = {
    botStatus: { connected: false },
    games: [],
    users: [],
    settings: {}
};

// DOM Elements
const pages = document.querySelectorAll('.page');
const navItems = document.querySelectorAll('nav li');
const botStatusIndicator = document.getElementById('bot-status-indicator');
const botStatusText = document.getElementById('bot-status-text');
const btnConnect = document.getElementById('btn-connect');
const btnDisconnect = document.getElementById('btn-disconnect');

// Init
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    loadAllData();
    setupEventListeners();
    setupSSE();

    // Poll status every 5 seconds
    setInterval(fetchStatus, 5000);
});

// --- SSE (Real-time Logs) ---
function setupSSE() {
    const logList = document.getElementById('activity-log');
    if (!logList) return;

    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        // Se for mensagem de conexão inicial, limpa o log
        if (data.type === 'connected') {
            logList.innerHTML = '';
        }

        const li = document.createElement('li');
        li.className = `log-${data.type}`; // log-info, log-error, log-success
        li.innerHTML = `<span class="timestamp">[${data.timestamp}]</span> ${data.message}`;

        // Adiciona no topo
        if (logList.firstChild) {
            logList.insertBefore(li, logList.firstChild);
        } else {
            logList.appendChild(li);
        }

        // Limita a 50 itens
        if (logList.children.length > 50) {
            logList.removeChild(logList.lastChild);
        }
    };

    eventSource.onerror = () => {
        console.log('SSE Error. Tentando reconectar...');
        eventSource.close();
        setTimeout(setupSSE, 5000);
    };
}

function setupNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const pageId = item.dataset.page;

            // Update UI
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            pages.forEach(page => page.classList.remove('active'));
            document.getElementById(pageId).classList.add('active');

            // Refresh data for that page
            if (pageId === 'games') fetchGames();
            if (pageId === 'users') fetchUsers();
            if (pageId === 'settings') fetchSettings();
            if (pageId === 'commands') loadCommands();
        });
    });
}

async function loadAllData() {
    await Promise.all([
        fetchStatus(),
        fetchSettings(),
        fetchGames(),
        fetchUsers(),
        loadCommands()
    ]);
    updateDashboard();
}

// --- API Calls ---

async function fetchStatus() {
    try {
        const res = await fetch(`${API_URL}/status`);
        const data = await res.json();
        currentState.botStatus = data;
        updateStatusUI();
    } catch (err) {
        console.error('Erro ao buscar status', err);
    }
}

async function fetchSettings() {
    const res = await fetch(`${API_URL}/settings`);
    currentState.settings = await res.json();
    fillSettingsForm();
}

async function fetchGames() {
    const res = await fetch(`${API_URL}/games`);
    currentState.games = await res.json();
    renderGamesTable();
    updateStats();
}

async function fetchUsers() {
    const res = await fetch(`${API_URL}/users`);
    currentState.users = await res.json();
    renderUsersTable();
    updateStats();
}

async function loadCommands() {
    try {
        const res = await fetch(`${API_URL}/commands`);
        const commands = await res.json();
        const tbody = document.querySelector('#commands-table tbody');
        tbody.innerHTML = '';

        commands.forEach(cmd => {
            const aliases = cmd.aliases ? cmd.aliases.join(', ') : '-';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${cmd.name}</strong></td>
                <td><small>${aliases}</small></td>
                <td>${cmd.description}</td>
                <td><span class="badge ${cmd.level === 'admin' ? 'badge-admin' : 'badge-viewer'}">${cmd.level}</span></td>
                <td>${cmd.cooldown}s</td>
                <td>
                    <button class="btn secondary" onclick="alert('Edição de comandos em breve! Edite o arquivo commands.json por enquanto.')"><i class="fa-solid fa-pen"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Erro ao carregar comandos:', error);
    }
}

// --- UI Updates ---

function updateStatusUI() {
    const connected = currentState.botStatus.connected;

    if (connected) {
        botStatusIndicator.classList.add('connected');
        botStatusText.textContent = 'Conectado';
        btnConnect.classList.add('hidden');
        btnDisconnect.classList.remove('hidden');
    } else {
        botStatusIndicator.classList.remove('connected');
        botStatusText.textContent = 'Desconectado';
        btnConnect.classList.remove('hidden');
        btnDisconnect.classList.add('hidden');
    }
}

function updateStats() {
    document.getElementById('stat-users').textContent = currentState.users.length;
    document.getElementById('stat-games').textContent = currentState.games.length;

    // Calculate total boxes opened (sum of all inventories)
    const totalBoxes = currentState.users.reduce((acc, user) => acc + (user.inventory ? user.inventory.length : 0), 0);
    document.getElementById('stat-boxes').textContent = totalBoxes;
}

function renderGamesTable() {
    const tbody = document.querySelector('#games-table tbody');
    const filterRarity = document.getElementById('filter-rarity').value;
    const search = document.getElementById('search-games').value.toLowerCase();

    tbody.innerHTML = '';

    const filtered = currentState.games.filter(game => {
        const matchesRarity = !filterRarity || game.rarity === filterRarity;
        const matchesSearch = game.name.toLowerCase().includes(search) ||
            game.console.toLowerCase().includes(search);
        return matchesRarity && matchesSearch;
    });

    filtered.forEach(game => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${game.id}</td>
            <td>${game.name}</td>
            <td class="rarity-${game.rarity}">${game.rarity}</td>
            <td>${game.console}</td>
            <td>${game.releaseYear}</td>
            <td>
                <button class="btn secondary" onclick="editGame(${game.id})"><i class="fa-solid fa-pen"></i></button>
                <button class="btn danger" onclick="deleteGame(${game.id})"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderUsersTable() {
    const tbody = document.querySelector('#users-table tbody');
    const search = document.getElementById('search-users').value.toLowerCase();

    tbody.innerHTML = '';

    const filtered = currentState.users.filter(user =>
        user.username.toLowerCase().includes(search)
    );

    filtered.forEach(user => {
        const tr = document.createElement('tr');
        const gameCount = user.inventory ? user.inventory.length : 0;

        tr.innerHTML = `
            <td>${user.username} <span style="font-size:0.8em; color:#666">(${user.role})</span></td>
            <td>${user.coins}</td>
            <td>${user.boxCount}</td>
            <td>${gameCount}</td>
            <td>
                <button class="btn secondary" onclick="alert('Funcionalidade em breve!')"><i class="fa-solid fa-eye"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function fillSettingsForm() {
    const s = currentState.settings;
    document.getElementById('conf-bot-name').value = s.twitchBotUsername || '';
    document.getElementById('conf-token').value = s.twitchOAuthToken || '';
    document.getElementById('conf-channel').value = s.twitchChannels.join(', ') || '';
    document.getElementById('conf-currency').value = s.currencyName || 'Coins';
    document.getElementById('conf-price').value = s.boxPrice || 100;

    // Novos campos
    document.getElementById('conf-timer-interval').value = s.currencyTimerInterval || 600;
    document.getElementById('conf-timer-amount').value = s.currencyTimerAmount || 50;
    document.getElementById('conf-sub-amount').value = s.coinsPerSub || 500;
    document.getElementById('conf-gift-amount').value = s.coinsPerSubGift || 250;
    document.getElementById('conf-bit-amount').value = s.coinsPerBit || 1;
}

// --- Actions ---

function setupEventListeners() {
    // Bot Connection
    btnConnect.addEventListener('click', async () => {
        btnConnect.textContent = 'Conectando...';
        const res = await fetch(`${API_URL}/bot/connect`, { method: 'POST' });
        const data = await res.json();

        if (!data.success) {
            alert('Erro: ' + data.error);
        }

        btnConnect.textContent = 'Conectar Bot';
        fetchStatus();
    });

    btnDisconnect.addEventListener('click', async () => {
        await fetch(`${API_URL}/bot/disconnect`, { method: 'POST' });
        fetchStatus();
    });

    // Settings Save
    document.getElementById('btn-save-settings').addEventListener('click', async () => {
        let token = document.getElementById('conf-token').value.trim();

        // Auto-add oauth: prefix
        if (token && !token.startsWith('oauth:')) {
            token = 'oauth:' + token;
        }

        const newSettings = {
            ...currentState.settings,
            twitchBotUsername: document.getElementById('conf-bot-name').value,
            twitchOAuthToken: token,
            twitchChannels: document.getElementById('conf-channel').value.split(',').map(c => c.trim()),
            currencyName: document.getElementById('conf-currency').value,
            boxPrice: parseInt(document.getElementById('conf-price').value),

            // Novos campos
            currencyTimerInterval: parseInt(document.getElementById('conf-timer-interval').value),
            currencyTimerAmount: parseInt(document.getElementById('conf-timer-amount').value),
            coinsPerSub: parseInt(document.getElementById('conf-sub-amount').value),
            coinsPerSubGift: parseInt(document.getElementById('conf-gift-amount').value),
            coinsPerBit: parseInt(document.getElementById('conf-bit-amount').value)
        };

        const res = await fetch(`${API_URL}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSettings)
        });

        if (res.ok) {
            alert('Configurações salvas!');
            fetchSettings();
        } else {
            alert('Erro ao salvar configurações.');
        }
    });

    // Filters
    document.getElementById('search-games').addEventListener('input', renderGamesTable);
    document.getElementById('filter-rarity').addEventListener('change', renderGamesTable);
    document.getElementById('search-users').addEventListener('input', renderUsersTable);

    // Modal
    document.getElementById('btn-add-game').addEventListener('click', () => {
        document.getElementById('modal-title').textContent = 'Adicionar Jogo';
        document.getElementById('game-form').reset();
        document.getElementById('game-id').value = '';
        document.getElementById('game-modal').classList.remove('hidden');
    });

    document.getElementById('game-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('game-id').value;
        const gameData = {
            name: document.getElementById('game-name').value,
            rarity: document.getElementById('game-rarity').value,
            console: document.getElementById('game-console').value,
            releaseYear: parseInt(document.getElementById('game-year').value)
        };

        let res;
        if (id) {
            res = await fetch(`${API_URL}/games/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gameData)
            });
        } else {
            res = await fetch(`${API_URL}/games`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gameData)
            });
        }

        if (res.ok) {
            closeModal();
            fetchGames();
        }
    });
}

// Global functions for HTML onclick
window.closeModal = () => {
    document.getElementById('game-modal').classList.add('hidden');
};

window.deleteGame = async (id) => {
    if (confirm('Tem certeza que deseja excluir este jogo?')) {
        await fetch(`${API_URL}/games/${id}`, { method: 'DELETE' });
        fetchGames();
    }
};

window.editGame = (id) => {
    const game = currentState.games.find(g => g.id === id);
    if (!game) return;

    document.getElementById('modal-title').textContent = 'Editar Jogo';
    document.getElementById('game-id').value = game.id;
    document.getElementById('game-name').value = game.name;
    document.getElementById('game-rarity').value = game.rarity;
    document.getElementById('game-console').value = game.console;
    document.getElementById('game-year').value = game.releaseYear;

    document.getElementById('game-modal').classList.remove('hidden');
};

function updateDashboard() {
    // Placeholder
}
