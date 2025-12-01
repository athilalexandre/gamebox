import { ConfigRepository, UserRepository, GameRepository, TradeRepository } from '../db/repositories/index.js';

/**
 * TradeService - handles game trading with MongoDB
 */

/**
 * Inicia uma solicitação de troca
 * @param {string} initiatorName - Nome do iniciador
 * @param {string} targetName - Nome do alvo
 * @param {string} gameFromName - Nome do jogo do iniciador
 * @param {string} gameToName - Nome do jogo do alvo
 * @returns {Promise<Object>} Resultado da iniciação
 */
export async function initiateTrade(initiatorName, targetName, gameFromName, gameToName) {
    const config = await ConfigRepository.getTradingSettings();

    if (!config.tradingEnabled) {
        return { success: false, error: 'O sistema de trocas está desativado.' };
    }

    // Normalização
    const initiator = initiatorName.toLowerCase();
    const target = targetName.toLowerCase();

    if (initiator === target) {
        return { success: false, error: 'Você não pode trocar consigo mesmo.' };
    }

    // Verifica se já existe troca pendente para o target
    const existingTrade = await TradeRepository.getPendingTradeForUser(target);
    if (existingTrade) {
        return { success: false, error: 'O alvo já possui uma troca pendente. Aguarde.' };
    }

    // Verifica se iniciador tem troca pendente
    const initiatorTrade = await TradeRepository.getPendingTradeForUser(initiator);
    if (initiatorTrade) {
        return { success: false, error: 'Você já tem uma troca pendente. Finalize-a primeiro.' };
    }

    // Carrega dados dos usuários
    const userA = await UserRepository.findOrCreateUser(initiator);
    const userB = await UserRepository.getUserByName(target);

    if (!userB) {
        return { success: false, error: `Usuário @${targetName} não encontrado.` };
    }

    // Verifica moedas
    const cost = config.tradeCoinCost || 50;
    const minCoins = config.tradeMinCoinsRequired || 100;

    if (userA.coins < minCoins || userA.coins < cost) {
        return { success: false, error: `Você precisa de no mínimo ${minCoins} coins e ${cost} para a taxa.` };
    }
    if (userB.coins < minCoins || userB.coins < cost) {
        return { success: false, error: `@${targetName} não possui moedas suficientes para a troca.` };
    }

    // Busca jogos nos inventários (com populate)
    const inventoryA = await UserRepository.getUserInventory(initiator);
    const inventoryB = await UserRepository.getUserInventory(target);

    // Função helper para buscar jogo
    const findGame = (inventory, name) => {
        const search = name.toLowerCase();

        // Tenta match exato primeiro
        let game = inventory.find(item => {
            const gameName = item.gameId?.name?.toLowerCase();
            return gameName === search;
        });

        // Se não, match parcial
        if (!game) {
            game = inventory.find(item => {
                const gameName = item.gameId?.name?.toLowerCase();
                return gameName?.includes(search);
            });
        }

        return game;
    };

    const itemA = findGame(inventoryA, gameFromName);
    if (!itemA || !itemA.gameId) {
        return { success: false, error: `Você não possui o jogo "${gameFromName}".` };
    }

    const itemB = findGame(inventoryB, gameToName);
    if (!itemB || !itemB.gameId) {
        return { success: false, error: `@${targetName} não possui o jogo "${gameToName}".` };
    }

    // Cria a troca pendente no MongoDB
    const trade = await TradeRepository.createTrade({
        initiator: initiator,
        target: target,
        gameFromInitiator: itemA.gameId._id,
        gameFromTarget: itemB.gameId._id,
        coinCostEach: cost,
        status: 'pending'
    });

    return {
        success: true,
        trade: trade,
        message: `@${targetName}, @${initiatorName} quer trocar [${itemA.gameId.name}] por [${itemB.gameId.name}]. Taxa: ${cost} coins cada. Digite !sim para aceitar ou !nao para recusar.`
    };
}

/**
 * Aceita uma troca
 * @param {string} username - Nome do usuário que está aceitando
 * @returns {Promise<Object>} Resultado da aceitação
 */
export async function acceptTrade(username) {
    const target = username.toLowerCase();
    const trade = await TradeRepository.getPendingTradeForUser(target);

    if (!trade) {
        return { success: false, error: 'Não há nenhuma solicitação de troca pendente para você.' };
    }

    // Re-validações (moedas e posse ainda existem)
    const userA = await UserRepository.findOrCreateUser(trade.initiator);
    const userB = await UserRepository.findOrCreateUser(trade.target);

    const cost = trade.coinCostEach;

    if (userA.coins < cost || userB.coins < cost) {
        await TradeRepository.updateTradeStatus(trade._id, 'rejected');
        return { success: false, error: 'Falha na troca: Um dos usuários não tem mais moedas suficientes.' };
    }

    // Verifica se ainda possuem os jogos
    const inventoryA = await UserRepository.getUserInventory(trade.initiator);
    const inventoryB = await UserRepository.getUserInventory(trade.target);

    const hasGameA = inventoryA.find(item =>
        item.gameId._id.toString() === trade.gameFromInitiator._id.toString() && item.quantity > 0
    );
    const hasGameB = inventoryB.find(item =>
        item.gameId._id.toString() === trade.gameFromTarget._id.toString() && item.quantity > 0
    );

    if (!hasGameA || !hasGameB) {
        await TradeRepository.updateTradeStatus(trade._id, 'rejected');
        return { success: false, error: 'Falha na troca: Jogo não encontrado no inventário.' };
    }

    try {
        // Executa a troca
        // 1. Remove moedas
        await UserRepository.removeCoins(trade.initiator, cost);
        await UserRepository.removeCoins(trade.target, cost);

        // 2. Troca jogos (remove 1 unidade de cada)
        await UserRepository.removeGameFromInventory(trade.initiator, trade.gameFromInitiator._id, 1);
        await UserRepository.removeGameFromInventory(trade.target, trade.gameFromTarget._id, 1);

        // 3. Adiciona jogos trocados (adiciona 1 unidade de cada)
        await UserRepository.addGameToInventory(trade.initiator, trade.gameFromTarget._id, 1);
        await UserRepository.addGameToInventory(trade.target, trade.gameFromInitiator._id, 1);

        // 4. Atualiza status da troca
        await TradeRepository.updateTradeStatus(trade._id, 'completed');

        return {
            success: true,
            message: `✅ Troca realizada com sucesso! @${trade.initiator} recebeu [${trade.gameFromTarget.name}] e @${trade.target} recebeu [${trade.gameFromInitiator.name}].`
        };
    } catch (error) {
        console.error('[TRADE] Error executing trade:', error);
        await TradeRepository.updateTradeStatus(trade._id, 'rejected');
        return { success: false, error: 'Erro ao executar troca: ' + error.message };
    }
}

/**
 * Rejeita uma troca
 * @param {string} username - Nome do usuário que está rejeitando
 * @returns {Promise<Object>} Resultado da rejeição
 */
export async function rejectTrade(username) {
    const target = username.toLowerCase();
    const trade = await TradeRepository.getPendingTradeForUser(target);

    if (!trade) {
        return { success: false, error: 'Não há nenhuma solicitação de troca pendente para você.' };
    }

    // Atualiza status para rejected
    await TradeRepository.updateTradeStatus(trade._id, 'rejected');

    return {
        success: true,
        message: `❌ Troca recusada por @${username}.`
    };
}

/**
 * Obtém histórico de trocas
 * @param {number} limit - Limite de resultados
 * @returns {Promise<Array>} Lista de trocas
 */
export async function getRecentTrades(limit = 10) {
    return await TradeRepository.getRecentTrades(limit);
}

/**
 * Obtém trades de um usuário específico
 * @param {string} username - Nome do usuário
 * @param {number} limit - Limite de resultados
 * @returns {Promise<Array>} Lista de trocas
 */
export async function getUserTrades(username, limit = 20) {
    return await TradeRepository.getTradesByUser(username, limit);
}

/**
 * Expira trades antigas (chamado periodicamente)
 * @returns {Promise<Object>} Resultado da expiração
 */
export async function expireOldTrades() {
    return await TradeRepository.expireOldTrades();
}
