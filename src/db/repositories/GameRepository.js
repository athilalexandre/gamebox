import { Game } from '../models/index.js';

/**
 * GameRepository - handles all game database operations
 */
class GameRepository {
    /**
     * Get all games
     */
    async getAllGames(filters = {}) {
        const query = { disabled: false, ...filters };
        return await Game.find(query).sort({ name: 1 });
    }

    /**
     * Get game by ID
     */
    async getGameById(gameId) {
        return await Game.findById(gameId);
    }

    /**
     * Get game by IGDB ID
     */
    async getGameByIgdbId(igdbId) {
        return await Game.findOne({ igdbId });
    }

    /**
     * Search games by name
     */
    async searchGamesByName(search) {
        return await Game.find({
            name: { $regex: search, $options: 'i' },
            disabled: false
        }).limit(50);
    }

    /**
     * Get games by rarity
     */
    async getGamesByRarity(rarity, limit = 100) {
        return await Game.find({
            rarity,
            disabled: false,
            tradeable: true
        }).limit(limit);
    }

    /**
     * Get random game by rarity
     */
    async getRandomGameByRarity(rarity) {
        const games = await this.getGamesByRarity(rarity);

        if (games.length === 0) {
            return null;
        }

        // Weighted random based on popularityScore
        const totalWeight = games.reduce((sum, game) => sum + (game.popularityScore || 1), 0);
        let random = Math.random() * totalWeight;

        for (const game of games) {
            random -= (game.popularityScore || 1);
            if (random <= 0) {
                return game;
            }
        }

        // Fallback to last game
        return games[games.length - 1];
    }

    /**
     * Create or update game
     */
    async upsertGame(gameData) {
        const { igdbId, name, console: platform } = gameData;

        // Try to find by IGDB ID first
        let game;
        if (igdbId) {
            game = await Game.findOne({ igdbId });
        }

        // If not found by IGDB ID, try name + console
        if (!game && name && platform) {
            game = await Game.findOne({ name, console: platform });
        }

        if (game) {
            // Update existing game (but preserve customRarity)
            if (!game.customRarity) {
                // Calculate rarity from Metacritic if available
                if (gameData.metacriticScore !== undefined) {
                    gameData.rarity = this.rarityFromMetacritic(gameData.metacriticScore);
                }
            }

            // Preserve certain fields
            const preservedFields = {
                dropCount: game.dropCount,
                customRarity: game.customRarity
            };

            if (game.customRarity) {
                preservedFields.rarity = game.rarity;
            }

            Object.assign(game, gameData, preservedFields);
            await game.save();

            return game;
        } else {
            // Create new game
            if (gameData.metacriticScore !== undefined) {
                gameData.rarity = this.rarityFromMetacritic(gameData.metacriticScore);
            }

            return await Game.create(gameData);
        }
    }

    /**
     * Calculate rarity from Metacritic score
     */
    rarityFromMetacritic(score) {
        if (score == null || score === 0) return 'E';

        if (score >= 98) return 'SSS';
        if (score >= 94) return 'SS';
        if (score >= 90) return 'S';
        if (score >= 85) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'E';
    }

    /**
     * Increment drop count for a game
     */
    async incrementDropCount(gameId) {
        return await Game.findByIdAndUpdate(
            gameId,
            { $inc: { dropCount: 1 } },
            { new: true }
        );
    }

    /**
     * Create game
     */
    async createGame(gameData) {
        return await Game.create(gameData);
    }

    /**
     * Update game
     */
    async updateGame(gameId, updates) {
        return await Game.findByIdAndUpdate(
            gameId,
            updates,
            { new: true }
        );
    }

    /**
     * Delete game
     */
    async deleteGame(gameId) {
        return await Game.findByIdAndDelete(gameId);
    }

    /**
     * Get game statistics by rarity
     */
    async getGameStats() {
        const stats = await Game.aggregate([
            {
                $group: {
                    _id: '$rarity',
                    count: { $sum: 1 }
                }
            }
        ]);

        return stats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
        }, {});
    }

    /**
     * Delete all games (for database reset - use with caution)
     */
    async deleteAll() {
        const result = await Game.deleteMany({});
        console.log(`[GAME] Deleted ${result.deletedCount} games`);
        return result;
    }

    /**
     * Get total count
     */
    async getCount(filters = {}) {
        return await Game.countDocuments({ disabled: false, ...filters });
    }
}

export default new GameRepository();
