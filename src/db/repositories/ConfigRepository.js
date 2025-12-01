import { Config } from '../models/index.js';

/**
 * ConfigRepository - handles all config database operations
 */
class ConfigRepository {
    /**
     * Get the global config (creates default if doesn't exist)
     */
    async getConfig() {
        let config = await Config.findOne();

        if (!config) {
            console.log('[CONFIG] No config found, creating default...');
            config = await Config.create({});
        }

        return config;
    }

    /**
     * Update config with partial data
     */
    async updateConfig(updates) {
        let config = await this.getConfig();

        Object.assign(config, updates);
        await config.save();

        return config;
    }

    /**
     * Get rarity odds for loot box rolls
     */
    async getRarityOdds() {
        const config = await this.getConfig();
        return config.rarityOdds;
    }

    /**
     * Get level table
     */
    async getLevelTable() {
        const config = await this.getConfig();
        return config.levelTable;
    }

    /**
     * Update bot connection status
     */
    async setBotConnected(connected) {
        return this.updateConfig({ botConnected: connected });
    }

    /**
     * Get trading settings
     */
    async getTradingSettings() {
        const config = await this.getConfig();
        return {
            tradingEnabled: config.tradingEnabled,
            tradeCoinCost: config.tradeCoinCost,
            tradeMinCoinsRequired: config.tradeMinCoinsRequired,
            tradeCommandCooldownSeconds: config.tradeCommandCooldownSeconds
        };
    }

    /**
     * Get daily reward settings
     */
    async getDailySettings() {
        const config = await this.getConfig();
        return {
            dailyEnabled: config.dailyEnabled,
            dailyCooldownHours: config.dailyCooldownHours,
            dailyBaseCoins: config.dailyBaseCoins,
            dailyBaseBoxes: config.dailyBaseBoxes,
            dailyCoinsAmount: config.dailyCoinsAmount,
            dailyBoxesAmount: config.dailyBoxesAmount,
            dailyGameEBRarities: config.dailyGameEBRarities
        };
    }

    /**
     * Reset config to defaults (keeps ID)
     */
    async resetToDefaults() {
        const config = await this.getConfig();
        const defaults = new Config();

        // Copy all default values except _id
        Object.keys(defaults.toObject()).forEach(key => {
            if (key !== '_id' && key !== '__v') {
                config[key] = defaults[key];
            }
        });

        await config.save();
        return config;
    }
}

export default new ConfigRepository();
