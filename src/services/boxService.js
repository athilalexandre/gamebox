import * as GameService from './gameService.js';

// Probabilidades de raridade (%)
const RARITY_PROBABILITIES = {
    'E': 30,
    'D': 25,
    'C': 20,
    'B': 12,
    'A': 7,
    'A+': 3,
    'S': 2,
    'SS': 0.8,
    'SSS': 0.2
};

/**
 * Compra caixas para um usuário
 * @param {string} username - Nome do usuário
 * @param {number} amount - Quantidade de caixas
 * @param {number} pricePerBox - Preço por caixa
 * @returns {Promise<Object>} Resultado da compra
 */
export async function buyBoxes(username, amount, pricePerBox) {
    // Importação dinâmica para evitar dependência circular
    const { getOrCreateUser, updateUser } = await import('./userService.js');

    const user = getOrCreateUser(username);
    const totalCost = amount * pricePerBox;

    if (user.coins < totalCost) {
        return {
            success: false,
            error: `Moedas insuficientes! Você tem ${user.coins}, precisa de ${totalCost}.`
        };
    }

    // Deduz moedas e adiciona caixas
    user.coins -= totalCost;
    user.boxCount += amount;

    updateUser(username, user);

    return {
        success: true,
        amount,
        cost: totalCost,
        remainingCoins: user.coins
    };
}

/**
 * Abre uma caixa e retorna um jogo aleatório
 * @param {string} username - Nome do usuário
 * @returns {Object} Resultado da abertura
 */
export async function openBox(username) {
    // Importação dinâmica para evitar dependência circular
    const { getOrCreateUser, updateUser } = await import('./userService.js');

    const user = getOrCreateUser(username);

    if (user.boxCount <= 0) {
        return {
            success: false,
            error: 'Você não tem caixas! Compre com !buybox.'
        };
    }

    // Decrementa caixas
    user.boxCount--;

    // Seleciona raridade com base nas probabilidades
    const rarity = selectRarity();

    // Pega jogo aleatório dessa raridade
    const game = GameService.getRandomGameByRarity(rarity);

    if (!game) {
        // Fallback se não houver jogos dessa raridade
        user.boxCount++; // Devolve a caixa
        updateUser(username, user);
        return {
            success: false,
            error: `Nenhum jogo disponível com raridade ${rarity}. Tente novamente!`
        };
    }

    // Adiciona jogo ao inventário
    if (!user.inventory) {
        user.inventory = [];
    }

    user.inventory.push({
        gameId: game.id,
        rarity: game.rarity,
        unboxedAt: new Date().toISOString()
    });

    updateUser(username, user);

    return {
        success: true,
        rarity: game.rarity,
        game: {
            id: game.id,
            name: game.name,
            console: game.console,
            releaseYear: game.releaseYear
        }
    };
}

/**
 * Seleciona raridade baseada nas probabilidades
 * @returns {string} Raridade selecionada
 */
function selectRarity() {
    const rand = Math.random() * 100;
    let cumulative = 0;

    const rarities = ['E', 'D', 'C', 'B', 'A', 'A+', 'S', 'SS', 'SSS'];

    for (const rarity of rarities) {
        cumulative += RARITY_PROBABILITIES[rarity];
        if (rand <= cumulative) {
            return rarity;
        }
    }

    return 'E'; // Fallback
}

/**
 * Obtém as probabilidades de raridade
 * @returns {Object} Probabilidades
 */
export function getRarityProbabilities() {
    return { ...RARITY_PROBABILITIES };
}

/**
 * Atualiza as probabilidades de raridade (para admin)
 * @param {Object} newProbabilities - Novas probabilidades
 * @returns {boolean} Sucesso
 */
export function updateRarityProbabilities(newProbabilities) {
    // Valida que soma 100%
    const total = Object.values(newProbabilities).reduce((sum, val) => sum + val, 0);

    if (Math.abs(total - 100) > 0.01) {
        return false;
    }

    Object.assign(RARITY_PROBABILITIES, newProbabilities);
    return true;
}

/**
 * Obtém emoji para raridade
 * @param {string} rarity - Raridade
 * @returns {string} Emoji
 */
export function getRarityEmoji(rarity) {
    const emojis = {
        'E': '⚪',
        'D': '🟢',
        'C': '🔵',
        'B': '🟣',
        'A': '🟡',
        'A+': '🟠',
        'S': '🔴',
        'SS': '⭐',
        'SSS': '💎'
    };

    return emojis[rarity] || '❓';
}

/**
 * Formata o resultado de abertura de caixa para o chat
 * @param {Object} result - Resultado da abertura
 * @returns {string} Mensagem formatada
 */
export function formatBoxResult(result) {
    if (!result.success) {
        return result.error;
    }

    const emoji = getRarityEmoji(result.rarity);
    const game = result.game;

    return `${emoji} [${result.rarity}] ${game.name} (${game.console}, ${game.releaseYear}) ${emoji}`;
}
