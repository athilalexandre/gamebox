import { User } from '../models/index.js';

/**
 * UserRepository - handles all user database operations
 */
class UserRepository {
    /**
     * Find user by username or create if doesn't exist
     */
    async findOrCreateUser(username) {
        let user = await User.findOne({ username });

        if (!user) {
            user = await User.create({
                username,
                coins: 0,
                boxCount: 0,
                inventory: [],
                xp: 0,
                level: 1,
                lastActive: new Date()
            });
            console.log(`[USER] Created new user: ${username}`);
        }

        return user;
    }

    /**
     * Get user by username
     */
    async getUserByName(username) {
        return await User.findOne({ username });
    }

    /**
     * Get all users
     */
    async getAllUsers() {
        return await User.find().sort({ xp: -1 });
    }

    /**
     * Update user with partial data
     */
    async updateUser(username, updates) {
        const user = await this.findOrCreateUser(username);

        Object.assign(user, updates);
        user.lastActive = new Date();
        await user.save();

        return user;
    }

    /**
     * Add coins to user
     */
    async addCoins(username, amount) {
        const user = await this.findOrCreateUser(username);
        user.coins += amount;
        user.totalCoinsEarned += amount;
        user.lastActive = new Date();
        await user.save();
        return user;
    }

    /**
     * Remove coins from user
     */
    async removeCoins(username, amount) {
        const user = await this.findOrCreateUser(username);
        user.coins = Math.max(0, user.coins - amount);
        user.lastActive = new Date();
        await user.save();
        return user;
    }

    /**
     * Add boxes to user
     */
    async addBoxes(username, amount) {
        const user = await this.findOrCreateUser(username);
        user.boxCount += amount;
        user.lastActive = new Date();
        await user.save();
        return user;
    }

    /**
     * Remove boxes from user
     */
    async removeBoxes(username, amount) {
        const user = await this.findOrCreateUser(username);
        user.boxCount = Math.max(0, user.boxCount - amount);
        user.lastActive = new Date();
        await user.save();
        return user;
    }

    /**
     * Add game to user inventory (supports duplicates via quantity)
     */
    async addGameToInventory(username, gameId, quantity = 1) {
        const user = await this.findOrCreateUser(username);

        // Check if game already in inventory
        const existingItem = user.inventory.find(item =>
            item.gameId.toString() === gameId.toString()
        );

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            user.inventory.push({ gameId, quantity });
        }

        user.lastActive = new Date();
        await user.save();
        return user;
    }

    /**
     * Remove game from user inventory
     */
    async removeGameFromInventory(username, gameId, quantity = 1) {
        const user = await this.findOrCreateUser(username);

        const itemIndex = user.inventory.findIndex(item =>
            item.gameId.toString() === gameId.toString()
        );

        if (itemIndex === -1) {
            throw new Error('Game not found in inventory');
        }

        const item = user.inventory[itemIndex];

        if (item.quantity <= quantity) {
            // Remove entire item
            user.inventory.splice(itemIndex, 1);
        } else {
            // Just decrease quantity
            item.quantity -= quantity;
        }

        user.lastActive = new Date();
        await user.save();
        return user;
    }

    /**
     * Get user inventory with populated game data
     */
    async getUserInventory(username) {
        const user = await User.findOne({ username }).populate('inventory.gameId');
        return user ? user.inventory : [];
    }

    /**
     * Add XP to user and handle level ups
     */
    async addXP(username, amount, levelTable) {
        const user = await this.findOrCreateUser(username);
        user.xp += amount;

        // Check for level up
        const newLevel = this.calculateLevel(user.xp, levelTable);
        if (newLevel > user.level) {
            user.level = newLevel;
            console.log(`[USER] ${username} leveled up to ${newLevel}!`);
        }

        user.lastActive = new Date();
        await user.save();
        return user;
    }

    /**
     * Calculate level from XP
     */
    calculateLevel(xp, levelTable) {
        if (!levelTable || levelTable.length === 0) return 1;

        let level = 1;
        for (const entry of levelTable) {
            if (xp >= entry.xp) {
                level = entry.level;
            } else {
                break;
            }
        }
        return level;
    }

    /**
     * Update last daily reward timestamp
     */
    async updateLastDailyReward(username) {
        const user = await this.findOrCreateUser(username);
        user.lastDailyRewardAt = new Date();
        user.lastActive = new Date();
        await user.save();
        return user;
    }

    /**
     * Check if user can claim daily reward
     */
    async canClaimDaily(username, cooldownHours) {
        const user = await this.findOrCreateUser(username);

        if (!user.lastDailyRewardAt) {
            return true;
        }

        const hoursSinceLastClaim = (Date.now() - user.lastDailyRewardAt.getTime()) / (1000 * 60 * 60);
        return hoursSinceLastClaim >= cooldownHours;
    }

    /**
     * Get leaderboard
     */
    async getLeaderboard(limit = 10) {
        return await User.find()
            .sort({ xp: -1 })
            .limit(limit)
            .select('username coins boxCount xp level');
    }

    /**
     * Delete all users (for database reset)
     */
    async deleteAll() {
        const result = await User.deleteMany({});
        console.log(`[USER] Deleted ${result.deletedCount} users`);
        return result;
    }
}

export default new UserRepository();
