import mongoose from 'mongoose';

const { Schema } = mongoose;

const TradeSchema = new Schema({
    initiator: {
        type: String,
        required: true,
        index: true
    },

    target: {
        type: String,
        required: true,
        index: true
    },

    gameFromInitiator: {
        type: Schema.Types.ObjectId,
        ref: 'Game',
        required: true
    },

    gameFromTarget: {
        type: Schema.Types.ObjectId,
        ref: 'Game',
        required: true
    },

    coinCostEach: {
        type: Number,
        default: 0
    },

    status: {
        type: String,
        enum: ['pending', 'completed', 'rejected', 'expired'],
        default: 'pending',
        index: true
    },

    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },

    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 5 * 60 * 1000)  // 5 minutes
    }
}, {
    timestamps: true
});

// Indexes for trade queries
TradeSchema.index({ initiator: 1, status: 1 });
TradeSchema.index({ target: 1, status: 1 });
TradeSchema.index({ timestamp: -1 });

export default mongoose.model('Trade', TradeSchema);
