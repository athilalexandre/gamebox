import { loadConfig } from '../utils/storage.js';
import * as UserService from './userService.js';
import * as BoxService from './boxService.js';
import * as GameService from './gameService.js';

/**
 * Tenta resgatar a recompensa diária
 * @param {string} username - Nome do usuário
 * @returns {Object} Resultado { success: boolean, type: 'coins'|'box'|'game'|'cooldown', value: any, message: string }
 */
export function claimDaily(username) {
    const config = loadConfig();

    if (!config.dailyEnabled) {
        return { success: false, error: 'Sistema de recompensa diária está desativado.' };
    }

    const user = UserService.getOrCreateUser(username);
    const now = Date.now();
    const lastDaily = user.lastDailyRewardAt ? new Date(user.lastDailyRewardAt).getTime() : 0;
    const cooldownMs = (config.dailyCooldownHours || 24) * 60 * 60 * 1000;

    // Verifica cooldown
    if (now - lastDaily < cooldownMs) {
        const timeLeft = cooldownMs - (now - lastDaily);
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        return {
            success: false,
            type: 'cooldown',
            timeLeft: { hours, minutes },
            message: `⏳ Você já resgatou seu daily hoje. Volte em ${hours}h ${minutes}m.`
        };
    }

    // Determina a recompensa baseada nas probabilidades
    // 90% Coins, 5% Box, 4% Game E-B, 1% Game A
    const rand = Math.random() * 100;
    let rewardType = '';

    if (rand < 90) {
        rewardType = 'coins';
    } else if (rand < 95) {
        rewardType = 'box';
    } else if (rand < 99) {
        rewardType = 'game_common'; // E-B
    } else {
        rewardType = 'game_rare'; // A
    }

    // Aplica a recompensa
    let resultValue = null;
    let message = '';

    if (rewardType === 'coins') {
        const amount = config.dailyCoinsAmount || 200;
        UserService.addCoins(username, amount);
        resultValue = amount;
        message = `💰 Daily: Você ganhou [${amount} ${config.currencyName}]!`;
    }
    else if (rewardType === 'box') {
        const amount = config.dailyBoxesAmount || 1;
        UserService.addBoxes(username, amount);
        resultValue = amount;
        message = `📦 Daily: Você ganhou [${amount} caixa(s)]!`;
    }
    else if (rewardType === 'game_common' || rewardType === 'game_rare') {
        const targetRarities = rewardType === 'game_common'
            ? (config.dailyGameEBRarities || ['E', 'D', 'C', 'B'])
            : ['A'];

        const allGames = GameService.getAllGames();
        const eligibleGames = allGames.filter(g => targetRarities.includes(g.rarity) && !g.disabled);

        if (eligibleGames.length === 0) {
            // Fallback para coins se não houver jogos elegíveis
            const amount = config.dailyCoinsAmount || 200;
            UserService.addCoins(username, amount);
            rewardType = 'coins';
            resultValue = amount;
            message = `💰 Daily (Fallback): Você ganhou [${amount} ${config.currencyName}]!`;
        } else {
            const randomGame = eligibleGames[Math.floor(Math.random() * eligibleGames.length)];

            // Adiciona jogo ao inventário (permite duplicatas)
            UserService.addGameToInventory(username, randomGame);

            resultValue = randomGame;
            const prefix = rewardType === 'game_rare' ? '💎 JACKPOT!' : '🎮 Daily:';
            message = `${prefix} Você ganhou [${randomGame.name}] (${randomGame.rarity})!`;
        }
    }

    // Atualiza timestamp
    UserService.updateUser(username, { lastDailyRewardAt: new Date().toISOString() });

    return {
        success: true,
        type: rewardType,
        value: resultValue,
        message: message
    };
}
