import mongoose from 'mongoose';

const { Schema } = mongoose;

const ConfigSchema = new Schema({
    // Twitch / bot base config
    twitchBotUsername: { type: String, default: '' },
    twitchOAuthToken: { type: String, default: '' },
    twitchChannels: { type: [String], default: [] },
    commandPrefix: { type: String, default: '!' },

    // Currency / coins
    currencyName: { type: String, default: 'Coins' },
    boxPrice: { type: Number, default: 100 },
    coinsPerMessage: { type: Number, default: 5 },
    messageCooldown: { type: Number, default: 60 },

    // Timer-based coins
    currencyTimerInterval: { type: Number, default: 600 },  // 10 minutes
    currencyTimerAmount: { type: Number, default: 50 },

    // Engagement rewards
    coinsPerSub: { type: Number, default: 500 },
    coinsPerSubGift: { type: Number, default: 250 },
    coinsPerBit: { type: Number, default: 1 },
    coinsPerRaid: { type: Number, default: 100 },
    coinsPerFollow: { type: Number, default: 50 },

    // IGDB / Metacritic
    igdbClientId: { type: String, default: '' },
    igdbClientSecret: { type: String, default: '' },
    autoSync: { type: Boolean, default: false },

    // Level table
    levelTable: {
        type: [{
            level: Number,
            xp: Number,
            name: String
        }],
        default: [
            { level: 1, xp: 0, name: '🌱 Iniciante' },
            { level: 2, xp: 100, name: '🎮 Novato' },
            { level: 3, xp: 250, name: '⚔️ Jogador' },
            { level: 4, xp: 500, name: '🎯 Experiente' },
            { level: 5, xp: 1000, name: '🏆 Veterano' },
            { level: 6, xp: 2000, name: '💎 Elite' },
            { level: 7, xp: 4000, name: '👑 Mestre' },
            { level: 8, xp: 8000, name: '🌟 Campeão' },
            { level: 9, xp: 15000, name: '🔥 Lendário' },
            { level: 10, xp: 30000, name: '⚡ Supremo' }
        ]
    },

    // Loot box rarity probabilities (must sum to 100)
    rarityOdds: {
        type: {
            E: { type: Number, default: 40 },
            D: { type: Number, default: 25 },
            C: { type: Number, default: 15 },
            B: { type: Number, default: 10 },
            A: { type: Number, default: 5 },
            S: { type: Number, default: 3 },
            SS: { type: Number, default: 1.5 },
            SSS: { type: Number, default: 0.5 }
        },
        default: {
            E: 40,
            D: 25,
            C: 15,
            B: 10,
            A: 5,
            S: 3,
            SS: 1.5,
            SSS: 0.5
        }
    },

    // Box / inventory settings
    maxBoxesPerPurchase: { type: Number, default: 10 },
    allowDuplicates: { type: Boolean, default: true },

    // Moderation
    adminUsers: { type: [String], default: [] },
    bannedUsers: { type: [String], default: [] },

    // UX / feedback
    welcomeMessage: { type: String, default: '🎮 Bem-vindo ao GameBox! Digite !help para começar.' },
    boxOpenAnimation: { type: Boolean, default: true },
    rarityAnnouncement: { type: Boolean, default: true },

    // Trading settings
    tradingEnabled: { type: Boolean, default: true },
    tradeCoinCost: { type: Number, default: 50 },
    tradeMinCoinsRequired: { type: Number, default: 100 },
    tradeCommandCooldownSeconds: { type: Number, default: 60 },

    // Daily reward settings
    dailyEnabled: { type: Boolean, default: true },
    dailyCooldownHours: { type: Number, default: 24 },
    dailyBaseCoins: { type: Number, default: 200 },
    dailyBaseBoxes: { type: Number, default: 1 },
    dailyCoinsAmount: { type: Number, default: 200 },
    dailyBoxesAmount: { type: Number, default: 1 },
    dailyGameEBRarities: { type: [String], default: ['E', 'D', 'C', 'B'] },

    // Twitch advanced
    autoMessages: { type: [String], default: [] },
    autoMessageInterval: { type: Number, default: 0 },
    autoReconnect: { type: Boolean, default: true },
    reconnectDelay: { type: Number, default: 3000 },
    maxReconnectAttempts: { type: Number, default: 5 },

    // State
    botConnected: { type: Boolean, default: false }
}, {
    timestamps: true
});

export default mongoose.model('Config', ConfigSchema);
