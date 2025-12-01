import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    ConfigRepository,
    UserRepository,
    GameRepository,
    CommandRepository
} from '../repositories/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../../data');

/**
 * MigrationService - handles one-time migration from JSON to MongoDB
 */
class MigrationService {
    /**
     * Read JSON file
     */
    readJSON(filename) {
        try {
            const filePath = path.join(DATA_DIR, filename);
            if (!fs.existsSync(filePath)) {
                return null;
            }
            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`[MIGRATION] Error reading ${filename}:`, error.message);
            return null;
        }
    }

    /**
     * Check if migration is needed
     */
    async needsMigration() {
        // Check if MongoDB is empty and JSON files exist
        const configExists = await ConfigRepository.getConfig();
        const hasJsonData = fs.existsSync(path.join(DATA_DIR, 'users.json')) ||
            fs.existsSync(path.join(DATA_DIR, 'games.json'));

        return !configExists.twitchBotUsername && hasJsonData;
    }

    /**
     * Migrate config from JSON
     */
    async migrateConfig() {
        const configData = this.readJSON('config.json');

        if (!configData) {
            console.log('[MIGRATION] No config.json found, using defaults');
            return;
        }

        console.log('[MIGRATION] Migrating config...');
        await ConfigRepository.updateConfig(configData);
        console.log('[MIGRATION] ✅ Config migrated');
    }

    /**
     * Migrate users from JSON
     */
    async migrateUsers() {
        const usersData = this.readJSON('users.json');

        if (!usersData) {
            console.log('[MIGRATION] No users.json found');
            return;
        }

        console.log('[MIGRATION] Migrating users...');
        let count = 0;

        for (const [username, userData] of Object.entries(usersData)) {
            try {
                // Convert old inventory format to new format if needed
                const inventory = [];
                if (userData.inventory && Array.isArray(userData.inventory)) {
                    // Old format: array of game names/IDs
                    // We'll need to match these to games in DB later
                    // For now, skip inventory migration (it will be rebuilt)
                }

                await UserRepository.findOrCreateUser(username);
                await UserRepository.updateUser(username, {
                    coins: userData.coins || 0,
                    boxCount: userData.boxes || 0,
                    xp: userData.xp || 0,
                    level: userData.level || 1,
                    totalBoxesOpened: userData.totalBoxesOpened || 0,
                    totalCoinsEarned: userData.totalCoinsEarned || 0,
                    role: userData.role || 'viewer',
                    lastDailyRewardAt: userData.lastDailyRewardAt ? new Date(userData.lastDailyRewardAt) : null
                });

                count++;
            } catch (error) {
                console.error(`[MIGRATION] Error migrating user ${username}:`, error.message);
            }
        }

        console.log(`[MIGRATION] ✅ Migrated ${count} users`);
    }

    /**
     * Migrate games from JSON
     */
    async migrateGames() {
        const gamesData = this.readJSON('games.json');

        if (!gamesData || !Array.isArray(gamesData)) {
            console.log('[MIGRATION] No games.json found');
            return;
        }

        console.log('[MIGRATION] Migrating games...');
        let count = 0;

        for (const gameData of gamesData) {
            try {
                await GameRepository.upsertGame({
                    name: gameData.name || 'Unknown Game',
                    console: gameData.console || gameData.platform || '',
                    releaseYear: gameData.year || gameData.releaseYear || null,
                    rarity: gameData.rarity || 'E',
                    igdbId: gameData.igdbId || null,
                    igdbSlug: gameData.igdbSlug || null,
                    metacriticScore: gameData.metacriticScore || null,
                    cover: gameData.cover || null,
                    genres: gameData.genres || [],
                    developer: gameData.developer || '',
                    publisher: gameData.publisher || '',
                    description: gameData.summary || gameData.description || '',
                    customRarity: gameData.customRarity || false
                });

                count++;
            } catch (error) {
                console.error(`[MIGRATION] Error migrating game ${gameData.name}:`, error.message);
            }
        }

        console.log(`[MIGRATION] ✅ Migrated ${count} games`);
    }

    /**
     * Migrate commands from JSON
     */
    async migrateCommands() {
        const commandsData = this.readJSON('commands.json');

        if (!commandsData || !Array.isArray(commandsData)) {
            console.log('[MIGRATION] No commands.json found');
            return;
        }

        console.log('[MIGRATION] Migrating commands...');
        let count = 0;

        for (const cmdData of commandsData) {
            try {
                const existing = await CommandRepository.getCommandByNameOrAlias(cmdData.name);

                if (!existing) {
                    await CommandRepository.createCommand({
                        name: cmdData.name,
                        type: cmdData.type || (cmdData.core ? 'core' : 'custom'),
                        description: cmdData.description || '',
                        response: cmdData.response || null,
                        enabled: cmdData.enabled !== false,
                        cooldown: cmdData.cooldown || 0,
                        level: cmdData.level || 'viewer',
                        aliases: cmdData.aliases || [],
                        category: cmdData.category || 'util',
                        hidden: cmdData.hidden || false,
                        isCore: cmdData.core === true || cmdData.type === 'core'
                    });

                    count++;
                }
            } catch (error) {
                console.error(`[MIGRATION] Error migrating command ${cmdData.name}:`, error.message);
            }
        }

        console.log(`[MIGRATION] ✅ Migrated ${count} commands`);
    }

    /**
     * Run full migration
     */
    async migrate() {
        console.log('[MIGRATION] 🔄 Starting migration from JSON to MongoDB...');

        try {
            await this.migrateConfig();
            await this.migrateGames();
            await this.migrateUsers();
            await this.migrateCommands();

            console.log('[MIGRATION] ✅ Migration completed successfully!');
            console.log('[MIGRATION] 💡 Old JSON files are preserved. You can delete them manually if desired.');

            return true;
        } catch (error) {
            console.error('[MIGRATION] ❌ Migration failed:', error.message);
            throw error;
        }
    }
}

export default new MigrationService();
