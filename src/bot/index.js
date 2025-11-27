import tmi from 'tmi.js';
import { loadConfig, loadCommands } from '../utils/storage.js';
import { commands } from './commands.js';
import * as UserService from '../services/userService.js';

let client = null;

export async function startBot() {
    const config = loadConfig();

    // Se não tiver token configurado, não inicia
    if (!config.twitchOAuthToken || !config.twitchBotUsername || config.twitchChannels.length === 0) {
        console.log('[BOT] Configuração incompleta. Bot não iniciado.');
        return null;
    }

    const options = {
        options: { debug: true },
        connection: {
            reconnect: true,
            secure: true
        },
        identity: {
            username: config.twitchBotUsername,
            password: config.twitchOAuthToken
        },
        channels: config.twitchChannels
    };

    client = new tmi.Client(options);

    client.on('message', onMessageHandler);
    client.on('connected', onConnectedHandler);
    client.on('disconnected', (reason) => {
        console.log(`[BOT] Desconectado: ${reason}`);
    });

    try {
        await client.connect();
        return client;
    } catch (error) {
        console.error('[BOT] Erro ao conectar:', error);
        return null;
    }
}

export async function stopBot() {
    if (client) {
        try {
            await client.disconnect();
            client = null;
            console.log('[BOT] Desconectado com sucesso.');
            return true;
        } catch (error) {
            console.error('[BOT] Erro ao desconectar:', error);
            return false;
        }
    }
    return true;
}

export function getBotStatus() {
    return {
        connected: client && client.readyState() === 'OPEN',
        channels: client ? client.getChannels() : []
    };
}

function onConnectedHandler(addr, port) {
    console.log(`[BOT] Conectado em ${addr}:${port}`);
}

async function onMessageHandler(target, context, msg, self) {
    if (self) return; // Ignora mensagens do próprio bot

    const username = context.username;
    const config = loadConfig();
    const commandPrefix = config.commandPrefix || '!';

    // Sistema de ganho passivo de moedas
    if (UserService.canRewardMessage(username, config.messageCooldown || 60)) {
        UserService.addCoins(username, config.coinsPerMessage || 5);
        UserService.markMessageRewarded(username);
        // Opcional: Log discreto ou apenas salvar
    }

    // Verifica se é um comando
    if (!msg.startsWith(commandPrefix)) return;

    const args = msg.slice(commandPrefix.length).trim().split(' ');
    const commandName = args.shift().toLowerCase();

    // Carrega configurações de comandos (para verificar enable/disable e cooldowns)
    const commandConfigs = loadCommands();
    const cmdConfig = commandConfigs.find(c => c.name === `${commandPrefix}${commandName}`);

    // Se o comando não existe na config ou está desabilitado
    if (cmdConfig && !cmdConfig.enabled) return;

    // Verifica permissões
    const user = UserService.getOrCreateUser(username);
    const isBroadcaster = context.badges && context.badges.broadcaster;
    const isMod = context.mod;
    const isAdmin = isBroadcaster || user.role === 'admin';

    if (cmdConfig && cmdConfig.level === 'admin' && !isAdmin) {
        return; // Ignora silenciosamente
    }

    // Executa o comando
    if (commands[commandName]) {
        try {
            await commands[commandName](client, target, { username, ...context }, args);
        } catch (error) {
            console.error(`[BOT] Erro ao executar comando ${commandName}:`, error);
        }
    }
}
