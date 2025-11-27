import { loadGames, saveGames } from '../utils/storage.js';

/**
 * Obtém todos os jogos
 * @returns {Array} Lista de jogos
 */
export function getAllGames() {
    return loadGames();
}

/**
 * Obtém um jogo por ID
 * @param {number} id - ID do jogo
 * @returns {Object|null} Jogo encontrado ou null
 */
export function getGameById(id) {
    const games = loadGames();
    return games.find(game => game.id === id) || null;
}

/**
 * Obtém jogos por raridade
 * @param {string} rarity - Raridade (E, D, C, B, A, A+, S, SS, SSS)
 * @returns {Array} Jogos da raridade especificada
 */
export function getGamesByRarity(rarity) {
    const games = loadGames();
    return games.filter(game => game.rarity === rarity);
}

/**
 * Adiciona um novo jogo
 * @param {Object} gameData - Dados do jogo
 * @returns {Object} Jogo criado
 */
export function addGame(gameData) {
    const games = loadGames();

    const newId = games.length > 0
        ? Math.max(...games.map(g => g.id)) + 1
        : 1;

    const newGame = {
        id: newId,
        name: gameData.name,
        rarity: gameData.rarity,
        console: gameData.console,
        releaseYear: gameData.releaseYear,
        genre: gameData.genre || null,
        series: gameData.series || null
    };

    games.push(newGame);
    saveGames(games);

    return newGame;
}

/**
 * Atualiza um jogo existente
 * @param {number} id - ID do jogo
 * @param {Object} updates - Campos para atualizar
 * @returns {Object|null} Jogo atualizado ou null se não encontrado
 */
export function updateGame(id, updates) {
    const games = loadGames();
    const index = games.findIndex(game => game.id === id);

    if (index === -1) {
        return null;
    }

    games[index] = {
        ...games[index],
        ...updates,
        id // Garante que o ID não muda
    };

    saveGames(games);
    return games[index];
}

/**
 * Remove um jogo
 * @param {number} id - ID do jogo
 * @returns {boolean} Sucesso da operação
 */
export function deleteGame(id) {
    const games = loadGames();
    const filteredGames = games.filter(game => game.id !== id);

    if (filteredGames.length === games.length) {
        return false; // Jogo não encontrado
    }

    saveGames(filteredGames);
    return true;
}

/**
 * Filtra jogos por console
 * @param {string} consoleName - Nome do console
 * @returns {Array} Jogos do console especificado
 */
export function getGamesByConsole(consoleName) {
    const games = loadGames();
    return games.filter(game =>
        game.console.toLowerCase() === consoleName.toLowerCase()
    );
}

/**
 * Obtém lista de todos os consoles únicos
 * @returns {Array} Lista de consoles
 */
export function getAllConsoles() {
    const games = loadGames();
    const consoles = [...new Set(games.map(game => game.console))];
    return consoles.sort();
}

/**
 * Obtém estatísticas dos jogos
 * @returns {Object} Estatísticas
 */
export function getGamesStats() {
    const games = loadGames();

    const stats = {
        total: games.length,
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
        byConsole: {}
    };

    games.forEach(game => {
        // Conta por raridade
        if (stats.byRarity[game.rarity] !== undefined) {
            stats.byRarity[game.rarity]++;
        }

        // Conta por console
        if (!stats.byConsole[game.console]) {
            stats.byConsole[game.console] = 0;
        }
        stats.byConsole[game.console]++;
    });

    return stats;
}
