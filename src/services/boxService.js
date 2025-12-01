import { ConfigRepository, UserRepository, GameRepository } from '../db/repositories/index.js';

/**
 * BoxService - handles loot box opening with probability-based rarity system
 */
class BoxService {
    /**
     * Open a box for a user
     * @param {string} username - Username
     * @param {number} quantity - Number of boxes to open (default 1)
     * @returns {Promise<Object>} Result with games obtained
     */
    async openBox(username, quantity = 1) {
        const user = await UserRepository.findOrCreateUser(username);
        const config = await ConfigRepository.getConfig();

        // Check if user has enough boxes
        if (user.boxCount < quantity) {
            throw new Error(`Você não tem caixas suficientes. Você tem ${user.boxCount} caixa(s).`);
        }

        const obtainedGames = [];
        const rarityOdds = config.rarityOdds;

        // Open each box
        for (let i = 0; i < quantity; i++) {
            // Select rarity based on probabilities
            const selectedRarity = this.selectRarityByProbability(rarityOdds);

            // Get random game of that rarity
            const game = await GameRepository.getRandomGameByRarity(selectedRarity);

            if (!game) {
                console.warn(`[BOX] No games found for rarity ${selectedRarity}, skipping...`);
                continue;
            }

            // Add game to user inventory (supports duplicates via quantity)
            await UserRepository.addGameToInventory(username, game._id);

            // Increment drop count for the game
            await GameRepository.incrementDropCount(game._id);

            // Track obtained game
            obtainedGames.push({
                name: game.name,
                rarity: game.rarity,
                console: game.console,
                id: game._id
            });

            console.log(`[BOX] ${username} obtained: ${game.name} [${game.rarity}]`);
        }

        // Remove boxes from user
        await UserRepository.removeBoxes(username, quantity);

        // Update stats
        await UserRepository.updateUser(username, {
            totalBoxesOpened: user.totalBoxesOpened + quantity,
            lastBoxDate: new Date()
        });

        // Set firstBoxDate if this is the first time
        if (!user.firstBoxDate) {
            await UserRepository.updateUser(username, {
                firstBoxDate: new Date()
            });
        }

        return {
            username,
            boxesOpened: quantity,
            gamesObtained: obtainedGames,
            remainingBoxes: user.boxCount - quantity
        };
    }

    /**
     * Select rarity based on probability weights
     * @param {Object} rarityOdds - Rarity probabilities (must sum to 100)
     * @returns {string} Selected rarity (E, D, C, B, A, S, SS, or SSS)
     */
    selectRarityByProbability(rarityOdds) {
        // Create cumulative probability array
        const rarities = Object.keys(rarityOdds).sort((a, b) => {
            const order = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
            return order.indexOf(a) - order.indexOf(b);
        });

        let cumulative = 0;
        const cumulativeOdds = rarities.map(rarity => {
            cumulative += rarityOdds[rarity];
            return { rarity, threshold: cumulative };
        });

        // Generate random number between 0 and 100
        const roll = Math.random() * 100;

        // Find which rarity range the roll falls into
        for (const { rarity, threshold } of cumulativeOdds) {
            if (roll <= threshold) {
                return rarity;
            }
        }

        // Fallback to most common (E)
        return 'E';
    }

    /**
     * Purchase boxes with coins
     * @param {string} username - Username
     * @param {number} quantity - Number of boxes to purchase
     * @returns {Promise<Object>} Purchase result
     */
    async purchaseBoxes(username, quantity = 1) {
        const user = await UserRepository.findOrCreateUser(username);
        const config = await ConfigRepository.getConfig();

        // Validate quantity
        if (quantity < 1) {
            throw new Error('Quantidade inválida. Deve ser pelo menos 1.');
        }

        if (quantity > config.maxBoxesPerPurchase) {
            throw new Error(`Você só pode comprar até ${config.maxBoxesPerPurchase} caixas por vez.`);
        }

        // Calculate cost
        const totalCost = config.boxPrice * quantity;

        // Check if user has enough coins
        if (user.coins < totalCost) {
            throw new Error(`Você não tem moedas suficientes. Custo: ${totalCost} ${config.currencyName}, Você tem: ${user.coins} ${config.currencyName}.`);
        }

        // Remove coins and add boxes
        await UserRepository.removeCoins(username, totalCost);
        await UserRepository.addBoxes(username, quantity);

        return {
            username,
            boxesPurchased: quantity,
            coinsSpent: totalCost,
            remainingCoins: user.coins - totalCost,
            totalBoxes: user.boxCount + quantity
        };
    }

    /**
     * Get box statistics
     */
    async getBoxStats() {
        const config = await ConfigRepository.getConfig();
        const gameStats = await GameRepository.getGameStats();

        return {
            boxPrice: config.boxPrice,
            currencyName: config.currencyName,
            rarityOdds: config.rarityOdds,
            gamesPerRarity: gameStats
        };
    }
}

export default new BoxService();
