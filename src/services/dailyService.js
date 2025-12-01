import { ConfigRepository, UserRepository, GameRepository } from '../db/repositories/index.js';

/**
 * DailyService - handles daily reward system with MongoDB
 */

/**
 * Tenta resgatar a recompensa diária
 * @param {string} username - Nome do usuário
 * @returns {Promise<Object>} Resultado { success: boolean, type: 'coins'|'box'|'game'|'cooldown', value: any, message: string }
 */
export async function claimDaily(username) {
    const config = await ConfigRepository.getDailySettings();

    if (!config.dailyEnabled) {
        return { success: false, error: 'Sistema de recompensa diária está desativado.' };
    }

    const user = await UserRepository.findOrCreateUser(username);
    const fullConfig = await ConfigRepository.getConfig();

    // Verifica cooldown
    const canClaim = await UserRepository.canClaimDaily(username, config.dailyCooldownHours);

    if (!canClaim) {
        const now = Date.now();
        const lastDaily = user.lastDailyRewardAt ? new Date(user.lastDailyRewardAt).getTime() : 0;
        const cooldownMs = (config.dailyCooldownHours || 24) * 60 * 60 * 1000;
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
        const amount = config.dailyCoinsAmount || config.dailyBaseCoins || 200;
        await UserRepository.addCoins(username, amount);
        resultValue = amount;
        message = `💰 Daily: Você ganhou [${amount} ${fullConfig.currencyName}]!`;
    }
    else if (rewardType === 'box') {
        const amount = config.dailyBoxesAmount || config.dailyBaseBoxes || 1;
        await UserRepository.addBoxes(username, amount);
        resultValue = amount;
        message = `📦 Daily: Você ganhou [${amount} caixa(s)]!`;
    }
    else if (rewardType === 'game_common' || rewardType === 'game_rare') {
        const targetRarities = rewardType === 'game_common'
            ? (config.dailyGameEBRarities || ['E', 'D', 'C', 'B'])
            : ['A'];

        // Select random rarity from allowed list
        const selectedRarity = targetRarities[Math.floor(Math.random() * targetRarities.length)];

        // Get random game of that rarity
        const randomGame = await GameRepository.getRandomGameByRarity(selectedRarity);

        if (!randomGame) {
            // Fallback para coins se não houver jogos elegíveis
            const amount = config.dailyCoinsAmount || config.dailyBaseCoins || 200;
            await UserRepository.addCoins(username, amount);
            rewardType = 'coins';
            resultValue = amount;
            message = `💰 Daily (Fallback): Você ganhou [${amount} ${fullConfig.currencyName}]!`;
        } else {
            // Adiciona jogo ao inventário (permite duplicatas via quantity)
            await UserRepository.addGameToInventory(username, randomGame._id);

            // Increment drop count
            await GameRepository.incrementDropCount(randomGame._id);

            resultValue = {
                id: randomGame._id,
                name: randomGame.name,
                rarity: randomGame.rarity,
                console: randomGame.console
            };

            const prefix = rewardType === 'game_rare' ? '💎 JACKPOT!' : '🎮 Daily:';
            message = `${prefix} Você ganhou [${randomGame.name}] (${randomGame.rarity})!`;
        }
    }

    // Atualiza timestamp
    await UserRepository.updateLastDailyReward(username);

    return {
        success: true,
        type: rewardType,
        value: resultValue,
        message: message
    };
}

/**
 * Verifica se usuário pode receber daily
 * @param {string} username - Nome do usuário
 * @returns {Promise<Object>} Status do cooldown
 */
export async function checkDailyCooldown(username) {
    const config = await ConfigRepository.getDailySettings();
    const canClaim = await UserRepository.canClaimDaily(username, config.dailyCooldownHours);

    if (canClaim) {
        return {
            canClaim: true,
            message: 'Você pode resgatar seu daily reward!'
        };
    }

    const user = await UserRepository.findOrCreateUser(username);
    const now = Date.now();
    const lastDaily = user.lastDailyRewardAt ? new Date(user.lastDailyRewardAt).getTime() : 0;
    const cooldownMs = (config.dailyCooldownHours || 24) * 60 * 60 * 1000;
    const timeLeft = cooldownMs - (now - lastDaily);
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    return {
        canClaim: false,
        timeLeft: { hours, minutes },
        message: `Você já resgatou seu daily. Volte em ${hours}h ${minutes}m.`
    };
}
