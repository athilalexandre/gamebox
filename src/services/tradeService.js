import { loadConfig, loadTrades, saveTrades } from '../utils/storage.js';
import * as UserService from './userService.js';

// Armazenamento em memória para trocas pendentes
// Key: username (target), Value: TradeObject
const pendingTrades = new Map();

/**
 * Inicia uma solicitação de troca
 */
export function initiateTrade(initiatorName, targetName, gameFromName, gameToName) {
    const config = loadConfig();

    if (!config.tradingEnabled) {
        return { success: false, error: 'O sistema de trocas está desativado.' };
    }

    // Normalização
    const initiator = initiatorName.toLowerCase();
    const target = targetName.toLowerCase();

    if (initiator === target) {
        return { success: false, error: 'Você não pode trocar consigo mesmo.' };
    }

    // Verifica se já existe troca pendente envolvendo estes usuários
    if (pendingTrades.has(target) || pendingTrades.has(initiator)) {
        return { success: false, error: 'Você ou o alvo já possuem uma troca pendente. Finalize-a primeiro.' };
    }

    // Verifica se existe troca onde o initiator é target de alguém
    for (const [t, trade] of pendingTrades.entries()) {
        if (trade.initiator === initiator) {
            return { success: false, error: 'Você já tem uma solicitação de troca enviada.' };
        }
    }

    // Carrega dados dos usuários
    const userA = UserService.getOrCreateUser(initiator);
    const userB = UserService.getUser(target); // Não cria se não existir

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

    // Verifica posse dos jogos (busca parcial/insensível)
    const findGame = (inventory, name) => {
        const search = name.toLowerCase();
        // Tenta match exato primeiro
        let game = inventory.find(g => (g.gameName || g.name).toLowerCase() === search);
        // Se não, match parcial
        if (!game) {
            game = inventory.find(g => (g.gameName || g.name).toLowerCase().includes(search));
        }
        return game;
    };

    const gameA = findGame(userA.inventory, gameFromName);
    if (!gameA) {
        return { success: false, error: `Você não possui o jogo "${gameFromName}".` };
    }

    const gameB = findGame(userB.inventory, gameToName);
    if (!gameB) {
        return { success: false, error: `@${targetName} não possui o jogo "${gameToName}".` };
    }

    // Cria a troca pendente
    const trade = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        initiator: initiator,
        target: target,
        gameA: gameA, // Objeto completo do jogo
        gameB: gameB, // Objeto completo do jogo
        cost: cost,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000 // 1 minuto para aceitar
    };

    pendingTrades.set(target, trade);

    // Timeout para limpar troca expirada
    setTimeout(() => {
        if (pendingTrades.has(target) && pendingTrades.get(target).id === trade.id) {
            pendingTrades.delete(target);
        }
    }, 60000);

    return {
        success: true,
        trade: trade,
        message: `@${targetName}, @${initiatorName} quer trocar [${gameA.gameName || gameA.name}] por [${gameB.gameName || gameB.name}]. Taxa: ${cost} coins. Digite !sim para aceitar ou !nao para recusar.`
    };
}

/**
 * Aceita uma troca
 */
export function acceptTrade(username) {
    const target = username.toLowerCase();
    const trade = pendingTrades.get(target);

    if (!trade) {
        return { success: false, error: 'Não há nenhuma solicitação de troca pendente para você.' };
    }

    // Re-validações (moedas e posse ainda existem)
    const userA = UserService.getOrCreateUser(trade.initiator);
    const userB = UserService.getOrCreateUser(trade.target);

    if (userA.coins < trade.cost || userB.coins < trade.cost) {
        pendingTrades.delete(target);
        return { success: false, error: 'Falha na troca: Um dos usuários não tem mais moedas suficientes.' };
    }

    // Verifica se ainda possuem os jogos (pode ter deletado/trocado nesse meio tempo)
    // Precisamos encontrar o índice exato para remover UM deles (caso tenha duplicatas)
    const indexA = userA.inventory.findIndex(g => g.gameId === trade.gameA.gameId && (g.pulledAt === trade.gameA.pulledAt || g.acquiredAt === trade.gameA.acquiredAt));
    const indexB = userB.inventory.findIndex(g => g.gameId === trade.gameB.gameId && (g.pulledAt === trade.gameB.pulledAt || g.acquiredAt === trade.gameB.acquiredAt));

    // Fallback se não achar pelo timestamp (pega o primeiro com mesmo ID)
    const finalIndexA = indexA !== -1 ? indexA : userA.inventory.findIndex(g => g.gameId === trade.gameA.gameId);
    const finalIndexB = indexB !== -1 ? indexB : userB.inventory.findIndex(g => g.gameId === trade.gameB.gameId);

    if (finalIndexA === -1 || finalIndexB === -1) {
        pendingTrades.delete(target);
        return { success: false, error: 'Falha na troca: Jogo não encontrado no inventário.' };
    }

    // Executa a troca
    // Remove moedas
    UserService.removeCoins(trade.initiator, trade.cost);
    UserService.removeCoins(trade.target, trade.cost);

    // Troca jogos
    // Remove de A
    const itemA = userA.inventory.splice(finalIndexA, 1)[0];
    // Remove de B
    const itemB = userB.inventory.splice(finalIndexB, 1)[0];

    // Adiciona em B
    userB.inventory.push(itemA);
    // Adiciona em A
    userA.inventory.push(itemB);

    // Salva usuários
    UserService.updateUser(userA.username || trade.initiator, { inventory: userA.inventory });
    UserService.updateUser(userB.username || trade.target, { inventory: userB.inventory });

    // Registra log
    const log = {
        id: trade.id,
        timestamp: Date.now(),
        initiator: trade.initiator,
        target: trade.target,
        gameA: itemA.gameName || itemA.name,
        gameB: itemB.gameName || itemB.name,
        cost: trade.cost,
        status: 'completed'
    };

    const trades = loadTrades();
    trades.unshift(log);
    // Mantém apenas últimos 100
    if (trades.length > 100) trades.pop();
    saveTrades(trades);

    pendingTrades.delete(target);

    return {
        success: true,
        message: `✅ Troca realizada com sucesso! @${trade.initiator} recebeu [${log.gameB}] e @${trade.target} recebeu [${log.gameA}].`
    };
}

/**
 * Rejeita uma troca
 */
export function rejectTrade(username) {
    const target = username.toLowerCase();
    const trade = pendingTrades.get(target);

    if (!trade) {
        return { success: false, error: 'Não há nenhuma solicitação de troca pendente para você.' };
    }

    pendingTrades.delete(target);

    // Log de rejeição (opcional, mas bom para histórico)
    const log = {
        id: trade.id,
        timestamp: Date.now(),
        initiator: trade.initiator,
        target: trade.target,
        gameA: trade.gameA.gameName || trade.gameA.name,
        gameB: trade.gameB.gameName || trade.gameB.name,
        cost: trade.cost,
        status: 'rejected'
    };

    const trades = loadTrades();
    trades.unshift(log);
    if (trades.length > 100) trades.pop();
    saveTrades(trades);

    return { success: true, message: `❌ Troca recusada por @${username}.` };
}

/**
 * Obtém histórico de trocas
 */
export function getRecentTrades(limit = 10) {
    const trades = loadTrades();
    return trades.slice(0, limit);
}
