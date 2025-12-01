import { loadUsers, saveUsers } from '../utils/storage.js';

/**
 * Obtém ou cria um usuário
 * @param {string} username - Nome do usuário
 * @returns {Object} Dados do usuário
 */
export function getOrCreateUser(username) {
    const users = loadUsers();

    if (!users[username]) {
        users[username] = {
            coins: 0,
            boxCount: 0,
            role: 'viewer',
            inventory: [],
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            lastMessageReward: null,
            lastDailyRewardAt: null
        };
        saveUsers(users);
    }

    return users[username];
}

/**
 * Atualiza dados de um usuário
 * @param {string} username - Nome do usuário
 * @param {Object} updates - Campos para atualizar
 * @returns {Object} Usuário atualizado
 */
export function updateUser(username, updates) {
    const users = loadUsers();

    if (!users[username]) {
        users[username] = getOrCreateUser(username);
    }

    users[username] = {
        ...users[username],
        ...updates,
        lastActive: new Date().toISOString()
    };

    saveUsers(users);
    return users[username];
}

/**
 * Adiciona moedas a um usuário
 * @param {string} username - Nome do usuário
 * @param {number} amount - Quantidade de moedas
 * @returns {Object} Usuário atualizado
 */
export function addCoins(username, amount) {
    const user = getOrCreateUser(username);
    return updateUser(username, {
        coins: user.coins + amount
    });
}

/**
 * Remove moedas de um usuário
 * @param {string} username - Nome do usuário
 * @param {number} amount - Quantidade de moedas
 * @returns {Object|null} Usuário atualizado ou null se não tiver moedas suficientes
 */
export function removeCoins(username, amount) {
    const user = getOrCreateUser(username);

    if (user.coins < amount) {
        return null;
    }

    return updateUser(username, {
        coins: user.coins - amount
    });
}

/**
 * Adiciona caixas a um usuário
 * @param {string} username - Nome do usuário
 * @param {number} amount - Quantidade de caixas
 * @returns {Object} Usuário atualizado
 */
export function addBoxes(username, amount) {
    const user = getOrCreateUser(username);
    return updateUser(username, {
        boxCount: user.boxCount + amount
    });
}

/**
 * Remove caixas de um usuário
 * @param {string} username - Nome do usuário
 * @param {number} amount - Quantidade de caixas
 * @returns {Object|null} Usuário atualizado ou null se não tiver caixas suficientes
 */
export function removeBoxes(username, amount) {
    const user = getOrCreateUser(username);

    if (user.boxCount < amount) {
        return null;
    }

    return updateUser(username, {
        boxCount: user.boxCount - amount
    });
}

/**
 * Adiciona um jogo ao inventário do usuário
 * @param {string} username - Nome do usuário
 * @param {Object} game - Dados do jogo
 * @returns {Object} Usuário atualizado
 */
export function addGameToInventory(username, game) {
    const user = getOrCreateUser(username);

    const inventoryItem = {
        gameId: game.id,
        gameName: game.name,
        rarity: game.rarity,
        console: game.console,
        releaseYear: game.releaseYear,
        pulledAt: new Date().toISOString()
    };

    return updateUser(username, {
        inventory: [...user.inventory, inventoryItem]
    });
}

/**
 * Obtém estatísticas do inventário do usuário
 * @param {string} username - Nome do usuário
 * @returns {Object} Estatísticas por raridade
 */
export function getInventoryStats(username) {
    const user = getOrCreateUser(username);

    const stats = {
        total: user.inventory.length,
        byRarity: {
            E: 0,
            D: 0,
            C: 0,
            B: 0,
            A: 0,
            'A+': 0,
            S: 0,
            SS: 0,
            SSS: 0
        },
        recent: user.inventory.slice(-5).reverse()
    };

    user.inventory.forEach(item => {
        if (stats.byRarity[item.rarity] !== undefined) {
            stats.byRarity[item.rarity]++;
        }
    });

    return stats;
}

/**
 * Reseta o inventário e moedas de um usuário
 * @param {string} username - Nome do usuário
 * @returns {Object} Usuário resetado
 */
export function resetUser(username) {
    return updateUser(username, {
        coins: 0,
        boxCount: 0,
        inventory: []
    });
}

/**
 * Define o papel/permissão de um usuário
 * @param {string} username - Nome do usuário
 * @param {string} role - Papel (viewer, mod, admin)
 * @returns {Object} Usuário atualizado
 */
export function setUserRole(username, role) {
    return updateUser(username, { role });
}

/**
 * Obtém todos os usuários
 * @returns {Object} Todos os usuários
 */
export function getAllUsers() {
    return loadUsers();
}

/**
 * Verifica se pode dar recompensa por mensagem
 * @param {string} username - Nome do usuário
 * @param {number} cooldownSeconds - Cooldown em segundos
 * @returns {boolean} Se pode dar recompensa
 */
export function canRewardMessage(username, cooldownSeconds) {
    const user = getOrCreateUser(username);

    if (!user.lastMessageReward) {
        return true;
    }

    const lastReward = new Date(user.lastMessageReward);
    const now = new Date();
    const diffSeconds = (now - lastReward) / 1000;

    return diffSeconds >= cooldownSeconds;
}

/**
 * Marca que o usuário recebeu recompensa por mensagem
 * @param {string} username - Nome do usuário
 * @returns {Object} Usuário atualizado
 */
export function markMessageRewarded(username) {
    return updateUser(username, {
        lastMessageReward: new Date().toISOString()
    });
}
