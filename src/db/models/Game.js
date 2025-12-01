import mongoose from 'mongoose';

const { Schema } = mongoose;

const GameSchema = new Schema({
    // IGDB integration
    igdbId: { type: Number, default: null, sparse: true, index: true },
    igdbSlug: { type: String, default: null },

    // Basic info
    name: {
        type: String,
        required: true,
        index: true
    },
    console: { type: String, default: '' },
    releaseYear: { type: Number, default: null },

    // Metacritic
    metacriticScore: { type: Number, default: null, min: 0, max: 100 },
    metacriticUrl: { type: String, default: null },

    // Derived rarity (from Metacritic score)
    rarity: {
        type: String,
        enum: ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'],
        default: 'E',
        index: true
    },

    // Extra metadata
    originalRating: { type: Number, default: null },
    cover: { type: String, default: null },
    genres: { type: [String], default: [] },
    developer: { type: String, default: '' },
    publisher: { type: String, default: '' },

    // Stats
    dropCount: { type: Number, default: 0 },
    popularityScore: { type: Number, default: 0 },
    description: { type: String, default: '' },
    tags: { type: [String], default: [] },

    // Trading
    tradeable: { type: Boolean, default: true },
    marketValue: { type: Number, default: 0 },

    // Admin flags
    disabled: { type: Boolean, default: false },
    customRarity: { type: Boolean, default: false }  // if true, do NOT override rarity on autosync
}, {
    timestamps: true
});

// Indexes for search and filtering
GameSchema.index({ name: 1, console: 1 });
GameSchema.index({ rarity: 1, disabled: 1 });
GameSchema.index({ disabled: 1, tradeable: 1 });

export default mongoose.model('Game', GameSchema);
