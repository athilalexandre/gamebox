import tmi from 'tmi.js';
import { loadConfig, loadCommands, initializeCoreCommands } from '../utils/storage.js';
import { commands } from './commands.js';
import { CORE_COMMANDS } from './coreCommands.js';
import * as UserService from '../services/userService.js';
import * as XpService from '../services/xpService.js';
import { broadcastLog } from '../api/server.js';

let client = null;
let currencyInterval = null;
const activeUsers = new Map(); // Map<username, lastActivityTimestamp>

// Initialize core commands on module load
console.log('[BOT] Inicializando comandos core...');
initializeCoreCommands(CORE_COMMANDS);
console.log('[BOT] Comandos core inicializados!');

export async function startBot() {
    const config = loadConfig();

    if (!config.twitchOAuthToken || !config.twitchBotUsername || config.twitchChannels.length === 0) {
        broadcastLog('Configuração incompleta. Bot não iniciado.', 'error');
        return null;
    }

    const options = {
        options: { debug: true },
        connection: {
            reconnect: true,
            secure: true,
            timeout: 30000,
            reconnectInterval: 1000
        },
        identity: {
            username: config.twitchBotUsername,
            password: config.twitchOAuthToken
        },
        channels: config.twitchChannels
    };

    if (client) {
        try {
            await client.disconnect();
            broadcastLog('Instância anterior do bot desconectada.', 'info');
        } catch (e) {
            console.error('Erro ao desconectar cliente antigo:', e);
        }
    }

    client = new tmi.Client(options);

    // Event Listeners
    client.on('message', onMessageHandler);
    client.on('connected', onConnectedHandler);
    client.on('disconnected', (reason) => {
        broadcastLog(`Desconectado: ${reason}`, 'warning');
        stopCurrencyTimer();
    });

    // Eventos de Economia (Subs, Bits)
    client.on('subscription', (channel, username, method, message, userstate) => {
        handleSub(channel, username, 'sub');
    });

    client.on('resub', (channel, username, months, message, userstate, methods) => {
        handleSub(channel, username, 'resub');
    });

    client.on('subgift', (channel, username, streakMonths, recipient, methods, userstate) => {
        handleSubGift(channel, username, recipient);
    });

    client.on('cheer', (channel, userstate, message) => {
        handleCheer(channel, userstate, message);
    });

    try {
        await client.connect();
        startCurrencyTimer();
        return client;
    } catch (error) {
        broadcastLog(`Erro ao conectar: ${error}`, 'error');
        return null;
    }
}

export async function stopBot() {
    if (client) {
        try {
            stopCurrencyTimer();
            await client.disconnect();
            client = null;
            broadcastLog('Bot desconectado manualmente.', 'info');
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
    broadcastLog(`Conectado em ${addr}:${port}`, 'success');
    const config = loadConfig();
    // Envia mensagem no chat
    config.twitchChannels.forEach(channel => {
        client.say(channel, `🤖 GameBox Bot conectado e pronto! Digite ${config.commandPrefix}help para começar.`);
    });
}

// --- Lógica de Economia ---

function startCurrencyTimer() {
    if (currencyInterval) clearInterval(currencyInterval);

    const config = loadConfig();
    const intervalSeconds = config.currencyTimerInterval || 600; // Default 10 min

    broadcastLog(`Timer de economia iniciado: ${config.currencyTimerAmount} moedas a cada ${intervalSeconds}s`, 'info');

    currencyInterval = setInterval(() => {
        distributeTimeRewards();
    }, intervalSeconds * 1000);
}

function stopCurrencyTimer() {
    if (currencyInterval) {
        clearInterval(currencyInterval);
        currencyInterval = null;
    }
}

function distributeTimeRewards() {
    const config = loadConfig();
    const amount = config.currencyTimerAmount || 50;
    const now = Date.now();
    const activeThreshold = 30 * 60 * 1000; // Considera ativo se falou nos últimos 30 min

    let count = 0;

    activeUsers.forEach((lastActive, username) => {
        if (now - lastActive < activeThreshold) {
            UserService.addCoins(username, amount);
            count++;
        } else {
            // Remove inativos do mapa para economizar memória
            activeUsers.delete(username);
        }
    });

    if (count > 0) {
        broadcastLog(`Distribuiu ${amount} moedas para ${count} usuários ativos.`, 'info');
    }
}

function handleSub(channel, username, type) {
    const config = loadConfig();
    const amount = config.coinsPerSub || 500;

    UserService.addCoins(username, amount);
    client.say(channel, `🎉 @${username} ganhou ${amount} moedas pelo Sub!`);
    broadcastLog(`Sub: ${username} ganhou ${amount} moedas.`, 'success');
}

function handleSubGift(channel, username, recipient) {
    const config = loadConfig();
    const amount = config.coinsPerSubGift || 250;

    // Dá moedas para quem presenteou
    UserService.addCoins(username, amount);
    client.say(channel, `🎁 @${username} ganhou ${amount} moedas por presentear um Sub!`);
    broadcastLog(`Gift Sub: ${username} presenteou ${recipient} e ganhou ${amount} moedas.`, 'success');
}

function handleCheer(channel, userstate, message) {
    const config = loadConfig();
    const bits = userstate.bits || 0;
    const amountPerBit = config.coinsPerBit || 1;
    const totalAmount = bits * amountPerBit;

    if (totalAmount > 0) {
        UserService.addCoins(userstate.username, totalAmount);
        client.say(channel, `💎 @${userstate.username} ganhou ${totalAmount} moedas pelos Bits!`);
        broadcastLog(`Bits: ${userstate.username} doou ${bits} bits e ganhou ${totalAmount} moedas.`, 'success');
    }
}

// --- Handler de Mensagens ---

async function onMessageHandler(target, context, msg, self) {
    if (self) return;

    const username = context.username;
    const config = loadConfig();
    const commandPrefix = config.commandPrefix || '!';

    // Atualiza atividade do usuário
    activeUsers.set(username, Date.now());

    // Sistema de XP por mensagem
    if (XpService.canGainMessageXp(username)) {
        // Ganha entre 10 e 20 XP (valor baixo com gap alto)
        const xpAmount = Math.floor(Math.random() * 11) + 10;
        const result = XpService.addXp(username, xpAmount);
        XpService.markMessageXp(username);

        if (result.leveledUp) {
            client.say(target, `🎉 Parabéns @${username}! Você subiu para o nível ${result.newLevel} (${result.newTitle})!`);
            broadcastLog(`Level Up: ${username} subiu para nível ${result.newLevel}`, 'success');
        }
    }

    // Verifica se é um comando
    if (!msg.startsWith(commandPrefix)) return;

    const args = msg.slice(commandPrefix.length).trim().split(' ');
    const commandInput = args.shift().toLowerCase(); // O que o usuário digitou (ex: "saldo")
    const fullCommandInput = `${commandPrefix}${commandInput}`; // ex: "!saldo"

    const commandConfigs = loadCommands();

    // Procura comando pelo nome OU alias
    const cmdConfig = commandConfigs.find(c =>
        c.name === fullCommandInput || (c.aliases && c.aliases.includes(fullCommandInput))
    );

    if (!cmdConfig) return; // Comando não existe

    if (!cmdConfig.enabled) return;

    const user = UserService.getOrCreateUser(username);
    const isBroadcaster = context.badges && context.badges.broadcaster;
    const isAdmin = isBroadcaster || user.role === 'admin';

    if (cmdConfig.level === 'admin' && !isAdmin) {
        return;
    }

    // Sistema de Cooldown (por usuário, por comando)
    if (!global.commandCooldowns) {
        global.commandCooldowns = new Map();
    }

    const cooldownKey = `${username}:${cmdConfig.name}`;
    const now = Date.now();
    const cooldownAmount = (cmdConfig.cooldown || 0) * 1000; // segundos para ms

    if (global.commandCooldowns.has(cooldownKey)) {
        const expirationTime = global.commandCooldowns.get(cooldownKey) + cooldownAmount;

        if (now < expirationTime) {
            const timeLeft = Math.ceil((expirationTime - now) / 1000);
            // Silenciosamente ignora (não spamma o chat com mensagens de cooldown)
            console.log(`[COOLDOWN] ${username} tentou usar ${cmdConfig.name}, aguarde ${timeLeft}s`);
            return;
        }
    }

    // Atualiza o cooldown
    global.commandCooldowns.set(cooldownKey, now);

    // Limpa cooldowns expirados a cada 100 comandos
    if (global.commandCooldowns.size > 1000) {
        const expiredKeys = [];
        for (const [key, timestamp] of global.commandCooldowns.entries()) {
            if (now - timestamp > 300000) { // 5 minutos
                expiredKeys.push(key);
            }
        }
        expiredKeys.forEach(key => global.commandCooldowns.delete(key));
    }

    // Mapeia o nome do comando real (ex: !saldo -> balance)
    const realCommandName = cmdConfig.name.substring(1); // remove "!"

    // Usa o handler unificado de comandos
    try {
        broadcastLog(`Comando: ${username} usou ${fullCommandInput}`, 'info');
        await commands.handleCommand(client, target, { username, ...context }, msg);
    } catch (error) {
        console.error(`[BOT] Erro ao executar comando ${fullCommandInput}:`, error);
        broadcastLog(`Erro no comando ${fullCommandInput}: ${error.message}`, 'error');
    }
}

