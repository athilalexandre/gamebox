import mongoose from 'mongoose';

const { Schema } = mongoose;

const UserSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Economy
    coins: { type: Number, default: 0 },
    boxCount: { type: Number, default: 0 },

    // Inventory: supports duplicates for trading
    inventory: [{
        gameId: {
            type: Schema.Types.ObjectId,
            ref: 'Game',
            required: true
        },
        quantity: {
            type: Number,
            default: 1,
            min: 1
        }
    }],

    // XP / levels
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },

    // Activity
    lastMessageTime: { type: Number, default: 0 },
    lastLoginDate: { type: Date, default: null },

    // Lifetime stats
    totalBoxesOpened: { type: Number, default: 0 },
    totalCoinsEarned: { type: Number, default: 0 },
    role: {
        type: String,
        enum: ['viewer', 'admin', 'broadcaster'],
        default: 'viewer'
    },

    // Advanced stats
    favoriteRarity: { type: String, default: '' },
    luckyStreak: { type: Number, default: 0 },
    unluckyStreak: { type: Number, default: 0 },
    bestDrop: {
        type: Schema.Types.ObjectId,
        ref: 'Game',
        default: null
    },

    firstBoxDate: { type: Date, default: null },
    lastBoxDate: { type: Date, default: null },

    achievements: { type: [String], default: [] },
    tradeLocked: { type: Boolean, default: false },
    wishlist: [{
        type: Schema.Types.ObjectId,
        ref: 'Game'
    }],
    notificationsEnabled: { type: Boolean, default: true },
    language: { type: String, default: 'pt-BR' },

    // Daily reward
    lastDailyRewardAt: { type: Date, default: null },

    // Timestamps
    lastActive: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Index for username lookup
UserSchema.index({ username: 1 });

export default mongoose.model('User', UserSchema);
