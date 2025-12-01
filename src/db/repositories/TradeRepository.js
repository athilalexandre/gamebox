import { Trade } from '../models/index.js';

/**
 * TradeRepository - handles all trade database operations
 */
class TradeRepository {
    /**
     * Create a new trade
     */
    async createTrade(tradeData) {
        return await Trade.create(tradeData);
    }

    /**
     * Get pending trade for target user
     */
    async getPendingTradeForUser(username) {
        return await Trade.findOne({
            target: username,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        }).populate(['gameFromInitiator', 'gameFromTarget']);
    }

    /**
     * Get trade by ID
     */
    async getTradeById(tradeId) {
        return await Trade.findById(tradeId).populate(['gameFromInitiator', 'gameFromTarget']);
    }

    /**
     * Update trade status
     */
    async updateTradeStatus(tradeId, status) {
        return await Trade.findByIdAndUpdate(
            tradeId,
            { status },
            { new: true }
        );
    }

    /**
     * Get recent trades (for dashboard)
     */
    async getRecentTrades(limit = 50) {
        return await Trade.find()
            .sort({ timestamp: -1 })
            .limit(limit)
            .populate(['gameFromInitiator', 'gameFromTarget']);
    }

    /**
     * Get trades by user
     */
    async getTradesByUser(username, limit = 20) {
        return await Trade.find({
            $or: [
                { initiator: username },
                { target: username }
            ]
        })
            .sort({ timestamp: -1 })
            .limit(limit)
            .populate(['gameFromInitiator', 'gameFromTarget']);
    }

    /**
     * Get trade statistics
     */
    async getTradeStats() {
        const stats = await Trade.aggregate([
            {
                $group: {
                    _id: '$status',
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
     * Expire old pending trades
     */
    async expireOldTrades() {
        const result = await Trade.updateMany(
            {
                status: 'pending',
                expiresAt: { $lt: new Date() }
            },
            {
                $set: { status: 'expired' }
            }
        );

        if (result.modifiedCount > 0) {
            console.log(`[TRADE] Expired ${result.modifiedCount} old trades`);
        }

        return result;
    }

    /**
     * Delete all trades (for database reset)
     */
    async deleteAll() {
        const result = await Trade.deleteMany({});
        console.log(`[TRADE] Deleted ${result.deletedCount} trades`);
        return result;
    }

    /**
     * Get count
     */
    async getCount(filters = {}) {
        return await Trade.countDocuments(filters);
    }
}

export default new TradeRepository();
