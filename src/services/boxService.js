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
