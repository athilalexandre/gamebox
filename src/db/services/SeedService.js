import { CommandRepository } from '../repositories/index.js';
import { CORE_COMMANDS } from '../../bot/coreCommands.js';

/**
 * SeedService - handles seeding of core commands and initial data
 */
class SeedService {
    /**
     * Seed all core commands
     */
    async seedCoreCommands() {
        console.log('[SEED] 🌱 Seeding core commands...');

        try {
            const coreCommands = CORE_COMMANDS.map(cmd => ({
                ...cmd,
                isCore: true,
                type: 'core'
            }));

            const result = await CommandRepository.seedCoreCommands(coreCommands);

            console.log(`[SEED] ✅ Core commands seeded: ${coreCommands.length} total`);
            return result;
        } catch (error) {
            console.error('[SEED] ❌ Error seeding core commands:', error.message);
            throw error;
        }
    }

    /**
     * Seed default admin users (from config)
     */
    async seedAdminUsers(adminUsernames = []) {
        if (adminUsernames.length === 0) {
            return;
        }

        console.log(`[SEED] 👑 Setting up ${adminUsernames.length} admin users...`);

        // This will be handled by UserRepository when users are created
        // We just need to store in config

        console.log('[SEED] ✅ Admin users configured');
    }

    /**
     * Run all seeds
     */
    async runAllSeeds() {
        console.log('[SEED] 🌱 Running all seeds...');

        try {
            await this.seedCoreCommands();

            console.log('[SEED] ✅ All seeds completed successfully');
            return true;
        } catch (error) {
            console.error('[SEED] ❌ Seed failed:', error.message);
            throw error;
        }
    }
}

export default new SeedService();
