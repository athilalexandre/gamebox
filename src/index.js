import { startServer } from './api/server.js';
import { startBot } from './bot/index.js';
import { connectToDatabase } from './db/connection.js';
import MigrationService from './db/services/MigrationService.js';
import SeedService from './db/services/SeedService.js';
import { ConfigRepository } from './db/repositories/index.js';

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

        // ========== 4. CARREGAR CONFIGURAÇÃO ==========
        const config = await ConfigRepository.getConfig();
        const PORT = process.env.PORT || 3000;

        // ========== 5. INICIAR SERVIDOR API/DASHBOARD ==========
        startServer(PORT);

        // ========== 6. INICIAR BOT (SE CONFIGURADO) ==========
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

