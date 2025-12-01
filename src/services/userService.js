import { UserRepository, ConfigRepository } from '../db/repositories/index.js';

/**
 * UserService - Wrapper around UserRepository for backward compatibility
 * All functions now use MongoDB instead of JSON files
 */

/**
 * Obtém ou cria um usuário
 * @param {string} username - Nome do usuário
 * @returns {Promise<Object>} Dados do usuário
 */
export async function getOrCreateUser(username) {
    return await UserRepository.findOrCreateUser(username);
}

/**
 * Atualiza dados de um usuário
 * @param {string} username - Nome do usuário
 * @param {Object} updates - Campos para atualizar
 * @returns {Promise<Object>} Usuário atualizado
 */
export async function updateUser(username, updates) {
    return await UserRepository.updateUser(username, updates);
}

/**
 * Adiciona moedas a um usuário
 * @param {string} username - Nome do usuário
 * @param {number} amount - Quantidade de moedas
 * @returns {Promise<Object>} Usuário atualizado
 */
export async function addCoins(username, amount) {
    return await UserRepository.addCoins(username, amount);
}

/**
 * Remove moedas de um usuário
 * @param {string} username - Nome do usuário
 * @param {number} amount - Quantidade de moedas
 * @returns {Promise<Object>} Usuário atualizado
 */
export async function removeCoins(username, amount) {
    return await UserRepository.removeCoins(username, amount);
}

/**
 * Adiciona caixas a um usuário
 * @param {string} username - Nome do usuário
 * @param {number} amount - Quantidade de caixas
 * @returns {Promise<Object>} Usuário atualizado
 */
export async function addBoxes(username, amount) {
    return await UserRepository.addBoxes(username, amount);
}

/**
 * Remove caixas de um usuário
 * @param {string} username - Nome do usuário
 * @param {number} amount - Quantidade de caixas
 * @returns {Promise<Object>} Usuário atualizado
 */
export async function removeBoxes(username, amount) {
    return await UserRepository.removeBoxes(username, amount);
}

/**
 * Adiciona um jogo ao inventário
 * @param {string} username - Nome do usuário
 * @param {ObjectId} gameId - ID do jogo
 * @param {number} quantity - Quantidade (default 1)
 * @returns {Promise<Object>} Usuário atualizado
 */
export async function addGameToInventory(username, gameId, quantity = 1) {
    return await UserRepository.addGameToInventory(username, gameId, quantity);
}

/**
 * Remove um jogo do inventário
 * @param {string} username - Nome do usuário
 * @param {ObjectId} gameId - ID do jogo
 * @param {number} quantity - Quantidade (default 1)
 * @returns {Promise<Object>} Usuário atualizado
 */
export async function removeGameFromInventory(username, gameId, quantity = 1) {
    return await UserRepository.removeGameFromInventory(username, gameId, quantity);
}

/**
 * Obtém inventário do usuário com dados dos jogos
 * @param {string} username - Nome do usuário
 * @returns {Promise<Array>} Inventário com jogos populados
 */
export async function getUserInventory(username) {
    return await UserRepository.getUserInventory(username);
}

/**
 * Adiciona XP ao usuário
 * @param {string} username - Nome do usuário
 * @param {number} amount - Quantidade de XP
 * @returns {Promise<Object>} Usuário atualizado
 */
export async function addXP(username, amount) {
    const config = await ConfigRepository.getConfig();
    return await UserRepository.addXP(username, amount, config.levelTable);
}

/**
 * Obtém todos os usuários
 * @returns {Promise<Array>} Lista de usuários
 */
export async function getAllUsers() {
    return await UserRepository.getAllUsers();
}

/**
 * Obtém usuário por nome
 * @param {string} username - Nome do usuário
 * @returns {Promise<Object|null>} Usuário ou null
 */
export async function getUserByName(username) {
    return await UserRepository.getUserByName(username);
}

/**
 * Obtém leaderboard
 * @param {number} limit - Número de usuários
 * @returns {Promise<Array>} Top usuários
 */
export async function getLeaderboard(limit = 10) {
    return await UserRepository.getLeaderboard(limit);
}

/**
 * Verifica se usuário pode receber moedas por mensagem
 * @param {string} username - Nome do usuário
 * @param {number} cooldown - Cooldown em segundos
 * @returns {Promise<boolean>} Pode receber
 */
export async function canReceiveMessageCoins(username, cooldown) {
    const user = await getOrCreateUser(username);

    if (!user.lastMessageReward) {
        return true;
    }

    const lastReward = new Date(user.lastMessageReward).getTime();
    const now = Date.now();
    const elapsed = (now - lastReward) / 1000;

    return elapsed >= cooldown;
}

/**
 * Atualiza timestamp de última recompensa por mensagem
 * @param {string} username - Nome do usuário
 * @returns {Promise<Object>} Usuário atualizado
 */
export async function updateMessageRewardTime(username) {
    return await updateUser(username, {
        lastMessageReward: new Date()
    });
}

/**
 * Verifica se usuário pode receber daily reward
 * @param {string} username - Nome do usuário
 * @param {number} cooldownHours - Cooldown em horas
 * @returns {Promise<boolean>} Pode receber
 */
export async function canClaimDaily(username, cooldownHours) {
    return await UserRepository.canClaimDaily(username, cooldownHours);
}

/**
 * Atualiza timestamp de último daily reward
 * @param {string} username - Nome do usuário
 * @returns {Promise<Object>} Usuário atualizado  
 */
export async function updateLastDailyReward(username) {
    return await UserRepository.updateLastDailyReward(username);
}

/**
 * Obtém nível do usuário baseado no XP
 * @param {number} xp - Quantidade de XP
 * @returns {Promise<Object>} Informações do nível
 */
export async function getLevelInfo(xp) {
    const config = await ConfigRepository.getConfig();
    const levelTable = config.levelTable;

    if (!levelTable || levelTable.length === 0) {
        return { level: 1, name: 'Iniciante', xpForNext: 100, progress: 0 };
    }

    // Find current level
    let currentLevel = levelTable[0];
    for (const entry of levelTable) {
        if (xp >= entry.xp) {
            currentLevel = entry;
        } else {
            break;
        }
    }

    // Find next level
    const currentIndex = levelTable.findIndex(l => l.level === currentLevel.level);
    const nextLevel = levelTable[currentIndex + 1] || currentLevel;

    // Calculate progress
    const xpInCurrentLevel = xp - currentLevel.xp;
    const xpNeededForNext = nextLevel.xp - currentLevel.xp;
    const progress = xpNeededForNext > 0
        ? Math.floor((xpInCurrentLevel / xpNeededForNext) * 100)
        : 100;

    return {
        level: currentLevel.level,
        name: currentLevel.name,
        currentXP: xp,
        xpForCurrentLevel: currentLevel.xp,
        xpForNext: nextLevel.xp,
        xpNeeded: Math.max(0, nextLevel.xp - xp),
        progress
    };
}

/**
 * Formata informações do usuário para exibição
 * @param {Object} user - Dados do usuário
 * @returns {Promise<Object>} Informações formatadas
 */
export async function formatUserInfo(user) {
    const config = await ConfigRepository.getConfig();
    const levelInfo = await getLevelInfo(user.xp);

    return {
        username: user.username,
        coins: user.coins,
        boxes: user.boxCount,
        inventoryCount: user.inventory.length,
        level: levelInfo.level,
        levelName: levelInfo.name,
        xp: user.xp,
        progress: levelInfo.progress,
        xpNeeded: levelInfo.xpNeeded,
        currencyName: config.currencyName
    };
}
