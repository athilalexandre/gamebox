import { loadConfig, saveConfig } from '../utils/storage.js';
import * as UserService from './userService.js';

// Configuração padrão de níveis (se não existir no config)
const DEFAULT_LEVELS = [
    { level: 1, xp: 0, name: 'Noob' },
    { level: 5, xp: 500, name: 'Iniciante' },
    { level: 10, xp: 1500, name: 'Casual' },
    { level: 20, xp: 5000, name: 'Gamer' },
    { level: 30, xp: 15000, name: 'Pro Player' },
    { level: 50, xp: 50000, name: 'Lenda' }
];

/**
 * Obtém a tabela de níveis atual
 */
export function getLevelTable() {
    const config = loadConfig();
    return config.levelTable || DEFAULT_LEVELS;
}

/**
 * Salva a tabela de níveis
 */
export function saveLevelTable(levelTable) {
    const config = loadConfig();
    config.levelTable = levelTable;
    saveConfig(config);
}

/**
 * Calcula o nível baseado no XP total
 */
export function calculateLevel(xp) {
    const levels = getLevelTable();
    // Ordena por nível decrescente para achar o maior nível alcançado
    const sortedLevels = [...levels].sort((a, b) => b.level - a.level);

    const currentLevel = sortedLevels.find(l => xp >= l.xp);
    return currentLevel ? currentLevel : { level: 1, name: 'Noob' };
}

/**
 * Adiciona XP ao usuário e verifica level up
 * @returns {Object} Resultado { leveledUp: boolean, newLevel: number, reward: string }
 */
export function addXp(username, amount) {
    const user = UserService.getOrCreateUser(username);
    const currentXp = user.xp || 0;
    const newXp = currentXp + amount;

    const oldLevelInfo = calculateLevel(currentXp);
    const newLevelInfo = calculateLevel(newXp);

    UserService.updateUser(username, { xp: newXp });

    if (newLevelInfo.level > oldLevelInfo.level) {
        return {
            leveledUp: true,
            newLevel: newLevelInfo.level,
            newTitle: newLevelInfo.name
        };
    }

    return { leveledUp: false };
}

/**
 * Verifica se pode ganhar XP por mensagem (Cooldown)
 */
export function canGainMessageXp(username) {
    const user = UserService.getOrCreateUser(username);
    if (!user.lastMessageXp) return true;

    const lastXp = new Date(user.lastMessageXp);
    const now = new Date();
    const diffSeconds = (now - lastXp) / 1000;

    // Gap grande conforme pedido (ex: 60 segundos)
    return diffSeconds >= 60;
}

/**
 * Registra ganho de XP por mensagem
 */
export function markMessageXp(username) {
    UserService.updateUser(username, {
        lastMessageXp: new Date().toISOString()
    });
}
