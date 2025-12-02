const API_URL = 'http://localhost:3000/api';

// State
let currentState = {
    botStatus: { connected: false },
    games: [],
    users: [],
    settings: {},
    gamesPagination: {
        currentPage: 1,
        totalPages: 1,
        totalGames: 0,
        gamesPerPage: 50
    }
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
            if (pageId === 'management') {
                fetchUsers();
                loadCommands();
            }
            if (pageId === 'settings') fetchSettings();
            if (pageId === 'trading') {
                fetchSettings();
                fetchTrades();
            }
        });
    });
}

async function loadAllData() {
    await fetchStatus();
    await fetchGames();
    // Users and commands are loaded on demand or initially if needed
}

// --- API Calls ---

async function fetchStatus() {
    try {
        const res = await fetch(`${API_URL}/bot/status`);
        const data = await res.json();
        currentState.botStatus = data;
        updateBotStatusUI();
    } catch (e) {
        console.error('Erro ao buscar status:', e);
    }
}

async function fetchGames(page = 1) {
    try {
        const res = await fetch(`${API_URL}/games?page=${page}&limit=50`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        currentState.games = data.games;
        currentState.gamesPagination = data.pagination;

        renderGamesTable();
        renderGamesPagination();

        document.getElementById('stat-games').textContent = data.pagination.totalGames;
    } catch (e) {
        console.error('Erro ao buscar jogos:', e);
        const tbody = document.querySelector('#games-table tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: #ff5555;">Erro ao carregar jogos: ${e.message}. Verifique se o servidor está rodando.</td></tr>`;
    }
}

async function fetchUsers() {
    try {
        const res = await fetch(`${API_URL}/users`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        currentState.users = await res.json();
        renderUsersTable();
        document.getElementById('stat-users').textContent = currentState.users.length;

        // Calculate total boxes opened (sum of all inventories)
        const totalBoxes = currentState.users.reduce((acc, user) => acc + (user.inventory ? user.inventory.length : 0), 0);
        document.getElementById('stat-boxes').textContent = totalBoxes;
    } catch (e) {
        console.error('Erro ao buscar usuários:', e);
        const tbody = document.querySelector('#users-table tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: #ff5555;">Erro ao carregar usuários: ${e.message}</td></tr>`;
    }
}

async function loadCommands() {
    try {
        const res = await fetch(`${API_URL}/commands`);
        const commands = await res.json();
        renderCommandsTable(commands);
    } catch (e) {
        console.error('Erro ao carregar comandos:', e);
    }
}

async function fetchSettings() {
    try {
        const res = await fetch(`${API_URL}/settings`);
        currentState.settings = await res.json();
        fillSettingsForm();
    } catch (e) {
        console.error('Erro ao buscar configurações:', e);
    }
}

// --- Rendering ---

function updateBotStatusUI() {
    const { connected, username } = currentState.botStatus;
    if (connected && username) {
        botStatusIndicator.classList.add('connected');
        botStatusText.textContent = `Conectado como ${username}`;
        btnConnect.classList.add('hidden');
        btnDisconnect.classList.remove('hidden');
    } else {
        botStatusIndicator.classList.remove('connected');
        botStatusText.textContent = 'Desconectado';
        btnConnect.classList.remove('hidden');
        btnDisconnect.classList.add('hidden');
    }
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

function renderGamesPagination() {
    const paginationContainer = document.getElementById('games-pagination');
    if (!paginationContainer) return;

    const { currentPage, totalPages } = currentState.gamesPagination;

    let paginationHTML = '<div class="pagination-controls" style="display: flex; gap: 10px; align-items: center; justify-content: center; margin-top: 20px;">';

    // Previous button
    if (currentPage > 1) {
        paginationHTML += `<button class="btn secondary" onclick="fetchGames(${currentPage - 1})"><i class="fa-solid fa-chevron-left"></i> Anterior</button>`;
    } else {
        paginationHTML += `<button class="btn secondary" disabled style="opacity: 0.5;"><i class="fa-solid fa-chevron-left"></i> Anterior</button>`;
    }

    // Page info
    paginationHTML += `<span style="color: var(--text-primary);">Página ${currentPage} de ${totalPages}</span>`;

    // Next button
    if (currentPage < totalPages) {
        paginationHTML += `<button class="btn secondary" onclick="fetchGames(${currentPage + 1})">Próxima <i class="fa-solid fa-chevron-right"></i></button>`;
    } else {
        paginationHTML += `<button class="btn secondary" disabled style="opacity: 0.5;">Próxima <i class="fa-solid fa-chevron-right"></i></button>`;
    }

    paginationHTML += '</div>';
    paginationContainer.innerHTML = paginationHTML;
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
            <td>${user.username} <span style="font-size:0.8em; color:#666">(${user.role || 'viewer'})</span></td>
            <td>${user.coins}</td>
            <td>${user.boxCount}</td>
            <td>${gameCount} (XP: ${xp})</td>
            <td>
                <button class="btn secondary" onclick="viewUserStatus('${user.username}')"><i class="fa-solid fa-eye"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderCommandsTable(commands) {
    const tbody = document.querySelector('#commands-table tbody');
    tbody.innerHTML = '';

    commands.forEach(cmd => {
        const isCore = cmd.type === 'core' || cmd.core === true;
        const isCustom = cmd.type === 'custom';
        const statusClass = cmd.enabled ? 'status-enabled' : 'status-disabled';
        const statusText = cmd.enabled ? 'Ativo' : 'Inativo';

        // Badge visual
        let badgeHTML = '';
        if (isCore) {
            badgeHTML = `<span class="badge badge-core core-tooltip" data-tooltip="Comando do sistema - Não pode ser deletado">CORE</span>`;
        } else if (isCustom) {
            badgeHTML = `<span class="badge badge-custom">CUSTOM</span>`;
        }

        // Botão de editar (sempre visível)
        const editBtn = `<button class="btn secondary small" onclick="editCommand('${cmd.name}')" title="Editar comando">
            <i class="fa-solid fa-pen"></i>
        </button>`;

        // Botão de deletar (desabilitado para core)
        const deleteBtn = isCore
            ? `<button class="btn danger small btn-disabled" title="Comandos core não podem ser deletados">
                <i class="fa-solid fa-lock"></i>
               </button>`
            : `<button class="btn danger small" onclick="deleteCommand('${cmd.name}')" title="Deletar comando">
                <i class="fa-solid fa-trash"></i>
               </button>`;

        const tr = document.createElement('tr');
        if (isCore) tr.classList.add('core-command');

        tr.innerHTML = `
            <td>
                ${cmd.name}
                ${isCore ? '<i class="fa-solid fa-lock core-lock-icon" title="Comando protegido"></i>' : ''}
            </td>
            <td>${badgeHTML}</td>
            <td>${cmd.description || '-'}</td>
            <td>${cmd.level}</td>
            <td>${cmd.cooldown}s</td>
            <td><span class="status-dot ${statusClass}"></span> ${statusText}</td>
            <td style="display: flex; gap: 5px;">
                ${editBtn}
                ${deleteBtn}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function fillSettingsForm() {
    const s = currentState.settings;
    document.getElementById('conf-bot-name').value = s.twitchBotUsername || '';
    document.getElementById('conf-token').value = s.twitchOAuthToken || '';
    document.getElementById('conf-channel').value = s.twitchChannels ? s.twitchChannels.join(', ') : '';
    document.getElementById('conf-currency').value = s.currencyName || 'Coins';
    document.getElementById('conf-price').value = s.boxPrice || 100;

    // Novos campos
    document.getElementById('conf-timer-interval').value = s.currencyTimerInterval || 600;
    document.getElementById('conf-timer-amount').value = s.currencyTimerAmount || 50;
    document.getElementById('conf-sub-amount').value = s.coinsPerSub || 500;
    document.getElementById('conf-gift-amount').value = s.coinsPerSubGift || 250;
    document.getElementById('conf-bit-amount').value = s.coinsPerBit || 1;

    // IGDB
    document.getElementById('conf-igdb-id').value = s.igdbClientId || '';
    document.getElementById('conf-igdb-secret').value = s.igdbClientSecret || '';

    // Trading
    if (document.getElementById('trading-enabled')) {
        document.getElementById('trading-enabled').checked = s.tradingEnabled !== false;
        document.getElementById('trade-cost').value = s.tradeCoinCost || 50;
        document.getElementById('trade-min-coins').value = s.tradeMinCoinsRequired || 100;
        document.getElementById('trade-cooldown').value = s.tradeCommandCooldownSeconds || 60;
    }

    // Level Table
    renderLevelTable(s.levelTable || []);
}

function renderLevelTable(levels) {
    const tbody = document.getElementById('levels-table-body');
    tbody.innerHTML = '';

    levels.sort((a, b) => a.level - b.level);

    levels.forEach((lvl) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="number" class="lvl-level" value="${lvl.level}" placeholder="Nvl" style="width: 60px; padding: 5px; background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); color: #fff; border-radius: 4px;"></td>
            <td><input type="number" class="lvl-xp" value="${lvl.xp}" placeholder="XP" style="width: 100px; padding: 5px; background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); color: #fff; border-radius: 4px;"></td>
            <td><input type="text" class="lvl-name" value="${lvl.name}" placeholder="Título" style="width: 100%; padding: 5px; background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); color: #fff; border-radius: 4px;"></td>
            <td><button class="btn danger small" onclick="removeLevelRow(this)"><i class="fa-solid fa-trash"></i></button></td>
        `;
        tbody.appendChild(tr);
    });
}

// Calcula raridade baseada no Metacritic score (aggregated_rating)
// aggregated_rating vai de 0-100 (similar ao Metacritic)
function calculateRarity(aggregatedRating) {
    if (!aggregatedRating) return 'E';

    // Distribuição baseada em score Metacritic
    if (aggregatedRating >= 95) return 'SSS';  // Masterpieces
    if (aggregatedRating >= 90) return 'SS';   // Exceptional
    if (aggregatedRating >= 85) return 'S';    // Excellent
    if (aggregatedRating >= 80) return 'A';    // Great
    if (aggregatedRating >= 70) return 'B';    // Good
    if (aggregatedRating >= 60) return 'C';    // Average
    if (aggregatedRating >= 50) return 'D';    // Below Average
    return 'E';  // Poor
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

            // IGDB
            igdbClientId: document.getElementById('conf-igdb-id').value.trim(),
            igdbClientSecret: document.getElementById('conf-igdb-secret').value.trim(),

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
            alert('✅ Configurações salvas com sucesso!\n\nAs alterações foram aplicadas.');
            fetchSettings();
        } else {
            alert('❌ Erro ao salvar configurações.\n\nVerifique os dados e tente novamente.');
        }
    });

    // Filters
    document.getElementById('search-games').addEventListener('input', renderGamesTable);
    document.getElementById('filter-rarity').addEventListener('change', renderGamesTable);
    document.getElementById('search-users').addEventListener('input', renderUsersTable);



    // Save Trade Config
    const btnSaveTrade = document.getElementById('btn-save-trade-config');
    if (btnSaveTrade) {
        btnSaveTrade.addEventListener('click', async () => {
            const config = {
                ...currentState.settings,
                tradingEnabled: document.getElementById('trading-enabled').checked,
                tradeCoinCost: parseInt(document.getElementById('trade-cost').value),
                tradeMinCoinsRequired: parseInt(document.getElementById('trade-min-coins').value),
                tradeCommandCooldownSeconds: parseInt(document.getElementById('trade-cooldown').value)
            };

            const res = await fetch(`${API_URL}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (res.ok) {
                alert('Configurações de troca salvas com sucesso!');
                fetchSettings();
            } else {
                alert('Erro ao salvar configurações.');
            }
        });
    }

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

    document.getElementById('btn-delete-command').addEventListener('click', confirmDeleteCommand);

    // Level Table
    document.getElementById('btn-add-level').addEventListener('click', () => {
        const tbody = document.getElementById('levels-table-body');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="number" class="lvl-level" value="" placeholder="Nvl" style="width: 60px; padding: 5px; background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); color: #fff; border-radius: 4px;"></td>
            <td><input type="number" class="lvl-xp" value="" placeholder="XP" style="width: 100px; padding: 5px; background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); color: #fff; border-radius: 4px;"></td>
            <td><input type="text" class="lvl-name" value="" placeholder="Título" style="width: 100%; padding: 5px; background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); color: #fff; border-radius: 4px;"></td>
            <td><button class="btn danger small" onclick="removeLevelRow(this)"><i class="fa-solid fa-trash"></i></button></td>
        `;
        tbody.appendChild(tr);
    });

    // IGDB Integration
    const btnImportIgdb = document.getElementById('btn-import-igdb');
    if (btnImportIgdb) {
        btnImportIgdb.addEventListener('click', () => {
            document.getElementById('igdb-modal').classList.remove('hidden');
            document.getElementById('igdb-search-input').focus();
        });
    }

    const btnSyncIgdb = document.getElementById('btn-sync-igdb');
    if (btnSyncIgdb) {
        btnSyncIgdb.addEventListener('click', syncTopGames);
    }

    const btnIgdbSearch = document.getElementById('btn-igdb-search');
    if (btnIgdbSearch) {
        btnIgdbSearch.addEventListener('click', searchIgdb);
    }

    const inputIgdbSearch = document.getElementById('igdb-search-input');
    if (inputIgdbSearch) {
        inputIgdbSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchIgdb();
        });
    }

    // Reset Database Button
    const btnResetDatabase = document.getElementById('btn-reset-database');
    if (btnResetDatabase) {
        btnResetDatabase.addEventListener('click', resetDatabase);
    }
}

// Global functions for HTML onclick
window.closeModal = () => {
    document.getElementById('game-modal').classList.add('hidden');
};

window.closeCommandModal = () => {
    document.getElementById('command-modal').classList.add('hidden');
};

window.closeUserModal = () => {
    document.getElementById('user-modal').classList.add('hidden');
};

window.closeIgdbModal = () => {
    document.getElementById('igdb-modal').classList.add('hidden');
    document.getElementById('igdb-results-body').innerHTML = '';
    document.getElementById('igdb-search-input').value = '';
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

window.viewUserStatus = async (username) => {
    const user = currentState.users.find(u => u.username === username);
    if (!user) return;

    document.getElementById('user-modal-title').textContent = `Status de ${user.username}`;

    // Basic Stats
    document.getElementById('user-level-display').textContent = user.level ? user.level.level : '?';
    document.getElementById('user-xp-display').textContent = `${user.xp || 0} XP`;
    document.getElementById('user-coins-display').textContent = user.coins;
    document.getElementById('user-boxes-display').textContent = user.boxCount;

    // Inventory Stats
    const inventoryStats = document.getElementById('user-inventory-stats');
    inventoryStats.innerHTML = '';

    // Calculate stats
    const stats = { total: 0, byRarity: {} };
    if (user.inventory) {
        stats.total = user.inventory.length;
        user.inventory.forEach(gameId => {
            const game = currentState.games.find(g => g.id === gameId);
            if (game) {
                stats.byRarity[game.rarity] = (stats.byRarity[game.rarity] || 0) + 1;
            }
        });
    }

    const rarities = ['SSS', 'SS', 'S', 'A+', 'A', 'B', 'C', 'D', 'E'];
    rarities.forEach(r => {
        if (stats.byRarity[r]) {
            const div = document.createElement('div');
            div.className = `rarity-${r}`;
            div.style.padding = '5px';
            div.style.borderRadius = '4px';
            div.style.textAlign = 'center';
            div.style.border = '1px solid currentColor';
            div.innerHTML = `<strong>${r}</strong>: ${stats.byRarity[r]}`;
            inventoryStats.appendChild(div);
        }
    });

    // Recent Games
    const recentList = document.getElementById('user-recent-games');
    recentList.innerHTML = '';
    if (user.inventory && user.inventory.length > 0) {
        // Show last 5 games (assuming order is preserved, last added at end)
        const lastGames = user.inventory.slice(-5).reverse();
        lastGames.forEach(gameId => {
            const game = currentState.games.find(g => g.id === gameId);
            if (game) {
                const li = document.createElement('li');
                li.innerHTML = `<span class="rarity-${game.rarity}">[${game.rarity}]</span> ${game.name} (${game.console})`;
                li.style.marginBottom = '5px';
                recentList.appendChild(li);
            }
        });
    } else {
        recentList.innerHTML = '<li>Nenhum jogo ainda.</li>';
    }

    document.getElementById('user-modal').classList.remove('hidden');
};

window.removeLevelRow = (btn) => {
    btn.closest('tr').remove();
};

async function searchIgdb() {
    const query = document.getElementById('igdb-search-input').value;
    if (!query) return;

    const loading = document.getElementById('igdb-loading');
    const tbody = document.getElementById('igdb-results-body');

    loading.classList.remove('hidden');
    tbody.innerHTML = '';

    try {
        const res = await fetch(`${API_URL}/igdb/search?q=${encodeURIComponent(query)}`);
        const games = await res.json();

        if (games.error) {
            alert('Erro na busca: ' + games.error);
            return;
        }

        if (games.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum jogo encontrado.</td></tr>';
        }

        games.forEach(game => {
            const tr = document.createElement('tr');
            const coverUrl = game.cover ? game.cover.url.replace('t_thumb', 't_cover_small') : '';
            const platforms = game.platforms ? game.platforms.map(p => p.name).join(', ') : 'N/A';
            const year = game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : 'N/A';
            const rating = game.rating ? Math.round(game.rating) : 'N/A';

            // Escapar aspas simples para o JSON
            const gameJson = JSON.stringify(game).replace(/'/g, "&#39;");

            tr.innerHTML = `
                <td>${coverUrl ? `<img src="${coverUrl}" style="height: 50px; border-radius: 4px;">` : '<div style="width: 35px; height: 50px; background: #333; border-radius: 4px;"></div>'}</td>
                <td style="font-weight: bold;">${game.name}</td>
                <td style="font-size: 0.85rem; color: var(--text-muted);">${platforms}</td>
                <td>${year}</td>
                <td><span style="color: var(--primary); font-weight: bold;">${rating}</span></td>
                <td><button class="btn primary small" onclick='importGame(${gameJson})'><i class="fa-solid fa-download"></i></button></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
        alert('Erro ao buscar no IGDB. Verifique se as credenciais estão configuradas.');
    } finally {
        loading.classList.add('hidden');
    }
}

async function syncTopGames() {
    if (!confirm('Isso irá importar até 500 jogos populares do IGDB e rebalancear TODAS as raridades do banco de dados conforme distribuição:\n\nSSS: 0.5% | SS: 1.5% | S: 3% | A: 5%\nB: 10% | C: 15% | D: 25% | E: 40%\n\nDeseja continuar?')) return;

    const btn = document.getElementById('btn-sync-igdb');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Importando e balanceando...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/igdb/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await res.json();

        if (data.error) {
            alert('Erro ao sincronizar: ' + data.error);
            return;
        }

        if (data.success) {
            // Monta mensagem detalhada com estatísticas
            let message = `✅ Sincronização concluída!\n\n`;
            message += `📊 Total de jogos: ${data.total}\n`;
            message += `➕ Novos jogos adicionados: ${data.added}\n\n`;
            message += `🎯 Distribuição de Raridade:\n`;
            message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
            message += `SSS: ${data.distribution.SSS} jogos (${((data.distribution.SSS / data.total) * 100).toFixed(1)}%)\n`;
            message += `SS:  ${data.distribution.SS} jogos (${((data.distribution.SS / data.total) * 100).toFixed(1)}%)\n`;
            message += `S:   ${data.distribution.S} jogos (${((data.distribution.S / data.total) * 100).toFixed(1)}%)\n`;
            message += `A:   ${data.distribution.A} jogos (${((data.distribution.A / data.total) * 100).toFixed(1)}%)\n`;
            message += `B:   ${data.distribution.B} jogos (${((data.distribution.B / data.total) * 100).toFixed(1)}%)\n`;
            message += `C:   ${data.distribution.C} jogos (${((data.distribution.C / data.total) * 100).toFixed(1)}%)\n`;
            message += `D:   ${data.distribution.D} jogos (${((data.distribution.D / data.total) * 100).toFixed(1)}%)\n`;
            message += `E:   ${data.distribution.E} jogos (${((data.distribution.E / data.total) * 100).toFixed(1)}%)`;

            alert(message);
            fetchGames(); // Atualiza a tabela
        }

    } catch (err) {
        console.error(err);
        alert('Erro ao sincronizar jogos. Verifique se as credenciais do IGDB estão configuradas.');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

window.importGame = (igdbGame) => {
    closeIgdbModal();

    document.getElementById('modal-title').textContent = 'Adicionar Jogo (Importado)';
    document.getElementById('game-id').value = '';
    document.getElementById('game-name').value = igdbGame.name;

    const year = igdbGame.first_release_date ? new Date(igdbGame.first_release_date * 1000).getFullYear() : '';
    document.getElementById('game-year').value = year;

    const platforms = igdbGame.platforms ? igdbGame.platforms.map(p => p.name).join(', ') : '';
    document.getElementById('game-console').value = platforms;

    // Auto Rarity based on Metacritic score
    const rarity = calculateRarity(igdbGame.aggregated_rating);
    document.getElementById('game-rarity').value = rarity;

    document.getElementById('game-modal').classList.remove('hidden');
};

// Reset Database
async function resetDatabase() {
    const confirmation1 = confirm('⚠️ ATENÇÃO! Esta ação irá DELETAR PERMANENTEMENTE todos os dados:\n\n• Todos os usuários\n• Todos os jogos\n• Todos os comandos customizados\n• Todo o histórico\n\nTem CERTEZA que deseja continuar?');

    if (!confirmation1) return;

    const confirmation2 = confirm('🚨 ÚLTIMA CHANCE!\n\nEsta ação é IRREVERSÍVEL!\n\nTodos os dados serão perdidos para sempre.\n\nDeseja realmente continuar?');

    if (!confirmation2) return;

    const confirmation3 = prompt('Digite "RESETAR TUDO" (sem aspas) para confirmar:');

    if (confirmation3 !== 'RESETAR TUDO') {
        alert('❌ Ação cancelada. Texto não corresponde.');
        return;
    }

    const btn = document.getElementById('btn-reset-database');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resetando...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/reset-database`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await res.json();

        if (data.success) {
            alert('✅ Banco de dados resetado com sucesso!\n\nTodos os dados foram apagados.\n\nA página será recarregada.');
            window.location.reload();
        } else {
            alert('❌ Erro ao resetar: ' + (data.error || 'Erro desconhecido'));
        }
    } catch (err) {
        console.error(err);
        alert('❌ Erro ao resetar banco de dados: ' + err.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Editar comando
window.editCommand = function (commandName) {
    // Implementar modal de edição de comando
    alert(`Edição de comando: ${commandName}\n\nFuncionalidade em desenvolvimento.`);
};

// Deletar comando
window.deleteCommand = async function (commandName) {
    if (!confirm(`⚠️ Tem certeza que deseja deletar o comando ${commandName}?\n\nEsta ação não pode ser desfeita.`)) {
        return;
    }

    try {
        const res = await fetch(`${API_URL}/commands/${encodeURIComponent(commandName)}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await res.json();

        if (data.success) {
            alert(`✅ Comando ${commandName} deletado com sucesso!`);
            fetchCommands(); // Recarrega a lista
        } else {
            alert(`❌ Erro ao deletar comando: ${data.error || 'Erro desconhecido'}`);
        }
    } catch (err) {
        console.error(err);
        alert(`❌ Erro ao deletar comando: ${err.message}`);
    }
};
