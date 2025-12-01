import { Command } from '../models/index.js';

/**
 * CommandRepository - handles all command database operations
 */
class CommandRepository {
    /**
     * Get all commands
     */
    async getAllCommands() {
        return await Command.find().sort({ name: 1 });
    }

    /**
     * Get command by name or alias
     */
    async getCommandByNameOrAlias(name) {
        return await Command.findOne({
            $or: [
                { name: name },
                { aliases: name }
            ]
        });
    }

    /**
     * Get core commands  */
    async getCoreCommands() {
        return await Command.find({ isCore: true });
    }

    /**
     * Get custom commands
     */
    async getCustomCommands() {
        return await Command.find({ isCore: false });
    }

    /**
     * Create command
     */
    async createCommand(commandData) {
        return await Command.create(commandData);
    }

    /**
     * Update command
     */
    async updateCommand(name, updates) {
        // Prevent updating isCore flag for core commands
        const command = await this.getCommandByNameOrAlias(name);
        if (command && command.isCore) {
            delete updates.isCore;
            delete updates.type;
        }

        return await Command.findOneAndUpdate(
            { name },
            updates,
            { new: true }
        );
    }

    /**
     * Delete command (only if not core)
     */
    async deleteCommand(name) {
        const command = await this.getCommandByNameOrAlias(name);

        if (command && command.isCore) {
            throw new Error('Cannot delete core command');
        }

        return await Command.findOneAndDelete({ name });
    }

    /**
     * Increment usage count
     */
    async incrementUsage(name) {
        return await Command.findOneAndUpdate(
            { $or: [{ name }, { aliases: name }] },
            {
                $inc: { usageCount: 1 },
                $set: { lastUsed: new Date() }
            },
            { new: true }
        );
    }

    /**
     * Seed core commands (insert if not exists)
     */
    async seedCoreCommands(coreCommandDefinitions) {
        const seeded = [];

        for (const cmdDef of coreCommandDefinitions) {
            const existing = await this.getCommandByNameOrAlias(cmdDef.name);

            if (!existing) {
                const created = await Command.create({
                    ...cmdDef,
                    isCore: true,
                    type: 'core'
                });
                seeded.push(created);
                console.log(`[COMMAND] Seeded core command: ${cmdDef.name}`);
            } else {
                // Update existing core command (preserving enabled/cooldown if customized)
                const updates = {
                    ...cmdDef,
                    isCore: true,
                    type: 'core',
                    enabled: existing.enabled !== undefined ? existing.enabled : cmdDef.enabled,
                    cooldown: existing.cooldown !== undefined ? existing.cooldown : cmdDef.cooldown
                };

                await Command.findByIdAndUpdate(existing._id, updates);
            }
        }

        return seeded;
    }

    /**
     * Delete all custom commands (preserve core)
     */
    async deleteAllCustomCommands() {
        const result = await Command.deleteMany({ isCore: false });
        console.log(`[COMMAND] Deleted ${result.deletedCount} custom commands`);
        return result;
    }

    /**
     * Check if command exists
     */
    async exists(name) {
        const count = await Command.countDocuments({
            $or: [{ name }, { aliases: name }]
        });
        return count > 0;
    }
}

export default new CommandRepository();
