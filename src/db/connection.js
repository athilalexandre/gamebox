import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gamebox';

let isConnected = false;

/**
 * Connects to MongoDB database
 * @returns {Promise<boolean>} True if connected successfully
 */
export async function connectToDatabase() {
    if (isConnected) {
        console.log('[MONGO] Already connected to database');
        return true;
    }

    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        isConnected = true;
        console.log(`[MONGO] ✅ Connected to MongoDB at ${MONGO_URI}`);

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('[MONGO] ❌ Connection error:', err);
            isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            console.log('[MONGO] ⚠️  Disconnected from database');
            isConnected = false;
        });

        return true;
    } catch (error) {
        console.error('[MONGO] ❌ Failed to connect to database:', error.message);
        isConnected = false;
        throw error;
    }
}

/**
 * Disconnects from MongoDB
 */
export async function disconnectFromDatabase() {
    if (!isConnected) {
        return;
    }

    try {
        await mongoose.connection.close();
        isConnected = false;
        console.log('[MONGO] Disconnected from database');
    } catch (error) {
        console.error('[MONGO] Error disconnecting:', error.message);
    }
}

/**
 * Returns connection status
 */
export function isMongoConnected() {
    return isConnected && mongoose.connection.readyState === 1;
}

export default mongoose;
