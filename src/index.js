import { startServer } from './api/server.js';
import { startBot } from './bot/index.js';
import { loadConfig } from './utils/storage.js';

async function main() {
    console.log('🎮 Iniciando GameBox...');

    // Carrega configurações
    const config = loadConfig();
    const PORT = process.env.PORT || 3000;

    // Inicia o servidor API/Dashboard
    startServer(PORT);

    // Tenta iniciar o bot se estiver configurado
    if (config.twitchOAuthToken && config.twitchBotUsername) {
        console.log('[BOT] Tentando conectar automaticamente...');
        await startBot();
    } else {
        console.log('[BOT] Credenciais não encontradas. Configure pelo Dashboard.');
    }

    console.log('🚀 GameBox está pronto!');
    console.log(`👉 Acesse o Dashboard: http://localhost:${PORT}`);
}

main().catch(console.error);
