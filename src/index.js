import { startServer } from './api/server.js';
import { startBot } from './bot/index.js';
import { connectToDatabase } from './db/connection.js';
import MigrationService from './db/services/MigrationService.js';
import SeedService from './db/services/SeedService.js';
import { ConfigRepository, GameRepository } from './db/repositories/index.js';
import IgdbService from './services/igdbService.js';

async function main() {
    console.log('🎮 Iniciando GameBox...');

    try {
        // ========== 1. CONECTAR AO MONGODB ==========
        console.log('[INIT] 🔌 Connecting to MongoDB...');
        await connectToDatabase();
        console.log('[INIT] ✅ MongoDB connected');

        // ========== 2. EXECUTAR MIGRAÇÃO (SE NECESSÁRIO) ==========
        console.log('[INIT] 🔄 Checking for JSON migration...');
        const needsMigration = await MigrationService.needsMigration();

        if (needsMigration) {
            console.log('[INIT] 📦 Running one-time migration from JSON to MongoDB...');
            await MigrationService.migrate();
        } else {
            console.log('[INIT] ✅ No migration needed (already using MongoDB)');
        }

        // ========== 3. SEED COMANDOS CORE ==========
        console.log('[INIT] 🌱 Seeding core commands...');
        await SeedService.seedCoreCommands();
        console.log('[INIT] ✅ Core commands ready');

        // ========== 4. AUTO-SYNC ALL IGDB GAMES ==========
        // This will fetch ALL ~350k+ games from IGDB
        const gameCount = await GameRepository.getCount();
        const TARGET_GAMES = 350000; // Target: Full IGDB database

        if (gameCount < TARGET_GAMES) {
            console.log(`[INIT] 🎮 Game database has ${gameCount} games (Target: ALL ~${TARGET_GAMES}).`);
            console.log('[INIT] 🔄 Starting FULL IGDB sync to fetch ALL games...');
            console.log('[INIT] ⚠️  This will take a while (several hours). Progress will be logged.');

            // Start the full sync in background with progress tracking
            IgdbService.syncAllGames((progress) => {
                if (progress.fetched % 1000 === 0) {
                    console.log(`[IGDB SYNC] Progress: ${progress.fetched} games synced...`);
                }
            }).then(result => {
                if (result.success) {
                    console.log(`[IGDB SYNC] ✅ Full sync complete! Total: ${result.total} games`);
                } else {
                    console.error(`[IGDB SYNC] ❌ Sync failed: ${result.error}`);
                }
            }).catch(err => {
                console.error(`[IGDB SYNC] ❌ Unexpected error:`, err);
            });

            // Don't wait for sync to complete - it runs in background
            console.log('[INIT] ✅ Full IGDB sync started in background.');
        } else {
            console.log(`[INIT] ✅ Game database has ${gameCount} games. Skipping auto-sync.`);
        }

        // ========== 5. CARREGAR CONFIGURAÇÃO ==========
        const config = await ConfigRepository.getConfig();
        const PORT = process.env.PORT || 3000;

        // ========== 6. INICIAR SERVIDOR API/DASHBOARD ==========
        startServer(PORT);

        // ========== 7. INICIAR BOT (SE CONFIGURADO) ==========
        if (config.twitchOAuthToken && config.twitchBotUsername) {
            console.log('[BOT] Tentando conectar automaticamente...');
            await startBot();
        } else {
            console.log('[BOT] ⚠️  Credenciais não encontradas. Configure pelo Dashboard.');
        }

        console.log('🚀 GameBox está pronto!');
        console.log(`👉 Acesse o Dashboard: http://localhost:${PORT}`);

    } catch (error) {
        console.error('❌ ERRO FATAL ao iniciar GameBox:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

main().catch(error => {
    console.error('❌ ERRO NÃO TRATADO:', error);
    process.exit(1);
});
