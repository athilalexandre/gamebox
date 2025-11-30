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
    // Main Navigation
    document.querySelectorAll('nav li').forEach(item => {
        item.addEventListener('click', () => {
            const pageId = item.dataset.page;

            // Update UI
            document.querySelectorAll('nav li').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
            document.getElementById(pageId).classList.add('active');

            // Refresh data for that page
            if (pageId === 'games') fetchGames();
            if (pageId === 'settings') {
                fetchSettings();
                fetchUsers();
                loadCommands();
            }
        });
    });

    // Settings Tabs Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            // Add active class to clicked button
            btn.classList.add('active');

            // Show corresponding content
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
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
            const type = cmd.type || 'core';
            const typeBadge = type === 'custom' ? '<span style="background: rgba(112, 0, 255, 0.2); color: var(--primary); padding: 3px 8px; border-radius: 4px; font-size: 0.75rem;">CUSTOM</span>' : '<span style="background: rgba(0, 240, 255, 0.1); color: var(--secondary); padding: 3px 8px; border-radius: 4px; font-size: 0.75rem;">CORE</span>';
            const statusBadge = cmd.enabled ? '<span style="color: var(--success);">✓ Ativo</span>' : '<span style="color: var(--danger);">✗ Desativado</span>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${cmd.name}</strong></td>
                <td>${typeBadge}</td>
                <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${cmd.description}">${cmd.description}</td>
                <td><span class="badge ${cmd.level === 'admin' ? 'badge-admin' : 'badge-viewer'}">${cmd.level}</span></td>
                <td>${cmd.cooldown}s</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn secondary" onclick="editCommand('${cmd.name}')"><i class="fa-solid fa-pen"></i></button>
                    ${type === 'custom' ? `<button class="btn danger" onclick="confirmDeleteCommand('${cmd.name}')"><i class="fa-solid fa-trash"></i></button>` : ''}
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
        const xp = user.xp || 0;

        tr.innerHTML = `
            <td>${user.username} <span style="font-size:0.8em; color:#666">(${user.role})</span></td>
            <td>${user.coins}</td>
            <td>${user.boxCount}</td>
            <td>${gameCount} <span style="font-size:0.8em; color:#666">(${xp} XP)</span></td>
            <td>
                <button class="btn secondary" onclick="viewUserStatus('${user.username}')"><i class="fa-solid fa-eye"></i> Ver Status</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// User Modal Functions
window.viewUserStatus = async (username) => {
    // Busca dados atualizados do usuário
    await fetchUsers();
    const user = currentState.users.find(u => u.username === username);

    if (!user) return;

    document.getElementById('user-modal-title').textContent = `Status de ${user.username}`;
    document.getElementById('user-coins-display').textContent = user.coins;
    document.getElementById('user-boxes-display').textContent = user.boxCount;

    // XP e Nível
    const xp = user.xp || 0;
    document.getElementById('user-xp-display').textContent = `${xp} XP`;
    document.getElementById('user-level-display').textContent = Math.floor(Math.sqrt(xp / 100)) + 1;

    // Inventário Stats
    const inventory = user.inventory || [];
    const rarities = ['SSS', 'SS', 'S', 'A+', 'A', 'B', 'C', 'D', 'E'];
    const statsContainer = document.getElementById('user-inventory-stats');
    statsContainer.innerHTML = '';

    const counts = {};
    rarities.forEach(r => counts[r] = 0);
    inventory.forEach(item => {
        if (counts[item.rarity] !== undefined) counts[item.rarity]++;
    });

    rarities.forEach(r => {
        if (counts[r] > 0) {
            const div = document.createElement('div');
            div.className = `rarity-${r}`;
            div.style.border = '1px solid currentColor';
            div.style.padding = '5px';
            div.style.borderRadius = '4px';
            div.style.textAlign = 'center';
            div.style.fontSize = '0.8rem';
            div.innerHTML = `<strong>${r}</strong>: ${counts[r]}`;
            statsContainer.appendChild(div);
        }
    });

    if (inventory.length === 0) {
        statsContainer.innerHTML = '<div style="grid-column: span 3; text-align: center; color: var(--text-muted);">Nenhum jogo coletado</div>';
    }

    // Recent Games
    const recentList = document.getElementById('user-recent-games');
    recentList.innerHTML = '';
    const recentGames = [...inventory].reverse().slice(0, 5);

    recentGames.forEach(item => {
        const li = document.createElement('li');
        li.style.padding = '5px 0';
        li.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        li.innerHTML = `<span class="rarity-${item.rarity}" style="font-weight:bold;">[${item.rarity}]</span> ${item.gameName || 'Jogo Desconhecido'} <small style="color:#666">(${item.console})</small>`;
        recentList.appendChild(li);
    });

    document.getElementById('user-modal').classList.remove('hidden');
};

window.closeUserModal = () => {
    document.getElementById('user-modal').classList.add('hidden');
};

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

    renderLevelTable(s.levelTable || []);
}

function renderLevelTable(levels) {
    const tbody = document.getElementById('levels-table-body');
    tbody.innerHTML = '';

    // Ordena por nível
    levels.sort((a, b) => a.level - b.level);

    levels.forEach((lvl) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="number" class="lvl-level" value="${lvl.level}" style="width: 60px; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); color: #fff; padding: 5px; border-radius: 4px;"></td>
            <td><input type="number" class="lvl-xp" value="${lvl.xp}" style="width: 80px; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); color: #fff; padding: 5px; border-radius: 4px;"></td>
            <td><input type="text" class="lvl-name" value="${lvl.name}" style="width: 100%; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); color: #fff; padding: 5px; border-radius: 4px;"></td>
            <td><button class="btn danger" style="padding: 5px 10px;" onclick="removeLevelRow(this)"><i class="fa-solid fa-trash"></i></button></td>
        `;
        tbody.appendChild(tr);
    });
}

window.removeLevelRow = (btn) => {
    btn.closest('tr').remove();
};

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
                    <button class="btn secondary" onclick="editCommand('${cmd.name}')"><i class="fa-solid fa-pen"></i></button>
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
            coinsPerBit: parseInt(document.getElementById('conf-bit-amount').value),
            levelTable: (() => {
                const levels = [];
                document.querySelectorAll('#levels-table-body tr').forEach(tr => {
                    const level = parseInt(tr.querySelector('.lvl-level').value);
                    const xp = parseInt(tr.querySelector('.lvl-xp').value);
                    const name = tr.querySelector('.lvl-name').value;

                    if (level && !isNaN(xp) && name) {
                        levels.push({ level, xp, name });
                    }
                });
                return levels;
            })()
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

    // Game Modal
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

    // Command Modal
    document.getElementById('btn-add-command').addEventListener('click', createNewCommand);

    document.getElementById('command-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const isEditing = document.getElementById('cmd-is-editing').value === 'true';
        const nameInput = document.getElementById('cmd-name').value.trim();
        const originalName = document.getElementById('cmd-name-original').value;
        const aliases = document.getElementById('cmd-aliases').value.split(',').map(a => a.trim()).filter(a => a);

        const commandData = {
            name: nameInput,
            description: document.getElementById('cmd-description').value.trim(),
            response: document.getElementById('cmd-response').value.trim(),
            type: 'custom',
            aliases: aliases,
            cooldown: parseInt(document.getElementById('cmd-cooldown').value),
            level: document.getElementById('cmd-level').value,
            enabled: document.getElementById('cmd-enabled').checked
        };

        let res;
        if (isEditing) {
            // Update existing command
            res = await fetch(`${API_URL}/commands/${encodeURIComponent(originalName)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(commandData)
            });
        } else {
            // Create new command
            res = await fetch(`${API_URL}/commands`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(commandData)
            });
        }

        if (res.ok) {
            closeCommandModal();
            loadCommands();
            alert(isEditing ? 'Comando atualizado!' : 'Comando criado com sucesso!');
        } else {
            const data = await res.json();
            alert('Erro: ' + (data.error || 'Não foi possível salvar o comando'));
        }
    });
}

// Global functions for HTML onclick
window.closeModal = () => {
    document.getElementById('game-modal').classList.add('hidden');
};

window.closeCommandModal = () => {
    document.getElementById('command-modal').classList.add('hidden');
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

window.editCommand = async (name) => {
    const res = await fetch('/api/commands');
    const commands = await res.json();
    const cmd = commands.find(c => c.name === name);

    if (!cmd) return;

    const isCustom = cmd.type === 'custom';

    document.getElementById('command-modal-title').textContent = 'Editar Comando';
    document.getElementById('cmd-name-original').value = cmd.name;
    document.getElementById('cmd-is-editing').value = 'true';
    document.getElementById('cmd-name').value = cmd.name;
    document.getElementById('cmd-name').disabled = true;
    document.getElementById('cmd-description').value = cmd.description || '';
    document.getElementById('cmd-response').value = cmd.response || '';
    document.getElementById('cmd-aliases').value = cmd.aliases ? cmd.aliases.join(', ') : '';
    document.getElementById('cmd-cooldown').value = cmd.cooldown;
    document.getElementById('cmd-level').value = cmd.level;
    document.getElementById('cmd-enabled').checked = cmd.enabled;

    // Show/hide response field based on command type
    const responseGroup = document.getElementById('cmd-response-group');
    if (isCustom) {
        responseGroup.style.display = 'block';
        document.getElementById('btn-delete-command').classList.remove('hidden');
    } else {
        responseGroup.style.display = 'none';
        document.getElementById('btn-delete-command').classList.add('hidden');
    }

    document.getElementById('command-modal').classList.remove('hidden');
};

window.createNewCommand = () => {
    document.getElementById('command-modal-title').textContent = 'Criar Novo Comando';
    document.getElementById('cmd-is-editing').value = '';
    document.getElementById('cmd-name').disabled = false;
    document.getElementById('cmd-name').value = '!';
    document.getElementById('cmd-description').value = '';
    document.getElementById('cmd-response').value = '';
    document.getElementById('cmd-aliases').value = '';
    document.getElementById('cmd-cooldown').value = '3';
    document.getElementById('cmd-level').value = 'viewer';
    document.getElementById('cmd-enabled').checked = true;
    document.getElementById('cmd-response-group').style.display = 'block';
    document.getElementById('btn-delete-command').classList.add('hidden');

    document.getElementById('command-modal').classList.remove('hidden');
};

window.confirmDeleteCommand = async () => {
    const name = document.getElementById('cmd-name-original').value;
    if (!confirm(`Tem certeza que deseja deletar o comando ${name}?`)) return;

    const res = await fetch(`${API_URL}/commands/${encodeURIComponent(name)}`, {
        method: 'DELETE'
    });

    if (res.ok) {
        closeCommandModal();
        loadCommands();
        alert('Comando deletado com sucesso!');
    } else {
        const data = await res.json();
        alert('Erro: ' + (data.error || 'Não foi possível deletar o comando'));
    }
};

function updateDashboard() {
    // Placeholder
}
