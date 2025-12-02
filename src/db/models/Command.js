import mongoose from 'mongoose';

const { Schema } = mongoose;

const CommandSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },

    type: {
        type: String,
        enum: ['core', 'custom'],
        default: 'custom'
    },

    description: { type: String, default: '' },
    response: { type: String, default: null },

    enabled: { type: Boolean, default: true },
    cooldown: { type: Number, default: 0 },

    level: {
        type: String,
        enum: ['viewer', 'admin'],
        default: 'viewer'
    },

    aliases: { type: [String], default: [] },

    // Stats
    usageCount: { type: Number, default: 0 },
    lastUsed: { type: Date, default: null },

    // Restrictions
    minLevel: { type: Number, default: 1 },
    minCoins: { type: Number, default: 0 },
    maxUsesPerUser: { type: Number, default: -1 },  // -1 = infinite

    // Cost
    cost: { type: Number, default: 0 },

    // Metadata
    category: {
        type: String,
        enum: ['util', 'fun', 'admin', 'game', 'economy'],
        default: 'util'
    },
    hidden: { type: Boolean, default: false },
    disabledChannels: { type: [String], default: [] },

    // Behavior (for custom commands)
    actions: { type: Schema.Types.Mixed, default: [] },
    conditions: { type: Schema.Types.Mixed, default: [] },

    // IMPORTANT: used to protect from reset
    isCore: { type: Boolean, default: false }
}, {
    timestamps: true
});

// Index for command lookup
// CommandSchema.index({ name: 1 });
CommandSchema.index({ isCore: 1 });

export default mongoose.model('Command', CommandSchema);
