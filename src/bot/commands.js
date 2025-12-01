import * as UserService from '../services/userService.js';
import * as BoxService from '../services/boxService.js';
import * as XpService from '../services/xpService.js';
import * as GameService from '../services/gameService.js';
import * as DailyService from '../services/dailyService.js';
import * as TradeService from '../services/tradeService.js';
import { loadConfig, loadCommands } from '../utils/storage.js';
import { CORE_COMMANDS } from './coreCommands.js';

// Utilitário para formatar moeda
const formatCurrency = (amount) => {
    const config = loadConfig();
    return `${amount} ${config.currencyName}`;
};

// Resolver variáveis dinâmicas
const resolveVariables = (text, user, channel, args) => {
    if (!text) return '';

    const config = loadConfig();
    const userData = UserService.getOrCreateUser(user.username);
    const inventoryStats = UserService.getInventoryStats(user.username);
    const currentXp = userData.xp || 0;
    const levelInfo = XpService.calculateLevel(currentXp);

    // Calcula XP para próximo nível e progresso
    const levelTable = XpService.getLevelTable();
    const sortedLevels = [...levelTable].sort((a, b) => a.level - b.level);

    // Encontra o próximo nível
    const nextLevelData = sortedLevels.find(l => l.level > levelInfo.level);
    const nextLevelXp = nextLevelData ? nextLevelData.xp : (currentXp + 1000); // Fallback
    const currentLevelXp = levelInfo.xp || 0;

    // Calcula progresso percentual
    const xpInCurrentLevel = currentXp - currentLevelXp;
    const xpNeededForNext = nextLevelXp - currentLevelXp;
    const progress = xpNeededForNext > 0 ? Math.floor((xpInCurrentLevel / xpNeededForNext) * 100) : 100;

    // Globais
    const allUsers = UserService.getAllUsers();
    const totalUsers = Object.keys(allUsers).length;
    const allGames = GameService.getAllGames();
    const totalGames = allGames.length;

    // Total de caixas abertas globalmente
    const totalBoxes = Object.values(allUsers).reduce((acc, u) => acc + (u.totalBoxesOpened || 0), 0);

    // Raridades
    const rarities = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D', 'E'];

    let result = text;

    // Variáveis de Usuário
    result = result.replace(/{user}/g, user.username);
    result = result.replace(/{balance}/g, userData.coins);
    result = result.replace(/{boxes}/g, userData.boxCount);
    result = result.replace(/{level}/g, levelInfo.level);
    result = result.replace(/{title}/g, levelInfo.name);
    result = result.replace(/{xp}/g, currentXp);
    result = result.replace(/{nextlevel}/g, Math.max(0, nextLevelXp - currentXp)); // XP faltando
    result = result.replace(/{progress}/g, Math.min(100, Math.max(0, progress))); // 0-100%
    result = result.replace(/{inventory}/g, inventoryStats.total);

    // Variáveis de Sistema
    result = result.replace(/{currency}/g, config.currencyName);
    result = result.replace(/{boxprice}/g, config.boxPrice);
    result = result.replace(/{prefix}/g, config.commandPrefix);
    result = result.replace(/{channel}/g, channel.replace('#', ''));

    // Variáveis de Estatísticas
    result = result.replace(/{totalusers}/g, totalUsers);
    result = result.replace(/{totalgames}/g, totalGames);
    result = result.replace(/{totalboxes}/g, totalBoxes);

    // Variáveis de Raridade (usuário)
    rarities.forEach(r => {
        result = result.replace(new RegExp(`{${r.toLowerCase()}}`, 'g'), inventoryStats.byRarity[r] || 0);
    });

    // Variáveis de Tempo
    const now = new Date();
    result = result.replace(/{time}/g, now.toLocaleTimeString('pt-BR'));
    result = result.replace(/{date}/g, now.toLocaleDateString('pt-BR'));

    // Argumentos
    args.forEach((arg, i) => {
        result = result.replace(new RegExp(`{arg${i + 1}}`, 'g'), arg);
    });

    return result;
};

// Handlers para comandos complexos
const coreHandlers = {
    // !buybox
    buybox: async (client, channel, user, args) => {
        const amount = args[0] ? parseInt(args[0]) : 1;
        if (isNaN(amount) || amount < 1) {
            client.say(channel, `@${user.username} Quantidade inválida.`);
            return;
        }

        const config = loadConfig();
        const result = await BoxService.buyBoxes(user.username, amount, config.boxPrice);

        if (result.success) {
            client.say(channel, `📦 @${user.username} comprou ${result.amount} caixa(s) por ${formatCurrency(result.cost)}! Saldo: ${formatCurrency(result.remainingCoins)}.`);
        } else {
            client.say(channel, `❌ @${user.username} ${result.error}`);
        }
    },

    // !openbox
    openbox: async (client, channel, user, args) => {
        const result = await BoxService.openBox(user.username);

        if (result.success) {
            const msg = BoxService.formatBoxResult(result);
            client.say(channel, `🎁 @${user.username} abriu uma caixa: ${msg}`);

            // Anúncio de raridade alta
            const config = loadConfig();
            if (config.rarityAnnouncement && ['S', 'SS', 'SSS'].includes(result.game.rarity)) {
                client.say(channel, `🚨 DROP LENDÁRIO! @${user.username} acabou de conseguir ${result.game.name} [${result.game.rarity}]! 🎉`);
            }
        } else {
            client.say(channel, `❌ @${user.username} ${result.error}`);
        }
    },

    // !inventory - APENAS UMA MENSAGEM
    inventory: async (client, channel, user, args) => {
        const stats = UserService.getInventoryStats(user.username);

        if (stats.total === 0) {
            client.say(channel, `@${user.username} Seu inventário está vazio.`);
            return;
        }

        // APENAS uma mensagem com resumo completo
        const rarities = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D', 'E'];
        const rarityText = rarities
            .filter(r => stats.byRarity[r] > 0)
            .map(r => `${r}: ${stats.byRarity[r]}`)
            .join(' | ');

        client.say(channel, `🎮 @${user.username}, você tem [${stats.total} jogo(s)] na coleção. ${rarityText}`);
    },

    // !topcoins
    topcoins: (client, channel, user, args) => {
        const users = UserService.getAllUsers();
        const sorted = Object.entries(users)
            .sort((a, b) => b[1].coins - a[1].coins)
            .slice(0, 5);

        const msg = sorted.map((u, i) => `${i + 1}. ${u[0]} (${u[1].coins})`).join(' | ');
        client.say(channel, `🏆 Top Ricos: ${msg}`);
    },

    // !topxp
    topxp: (client, channel, user, args) => {
        const users = UserService.getAllUsers();
        const sorted = Object.entries(users)
            .sort((a, b) => (b[1].xp || 0) - (a[1].xp || 0))
            .slice(0, 5);

        const msg = sorted.map((u, i) => {
            const lvl = XpService.calculateLevel(u[1].xp || 0);
            return `${i + 1}. ${u[0]} (Nvl ${lvl.level})`;
        }).join(' | ');
        client.say(channel, `🏆 Top Nível: ${msg}`);
    },

    // !topgames
    topgames: (client, channel, user, args) => {
        const users = UserService.getAllUsers();
        const sorted = Object.entries(users)
            .sort((a, b) => (b[1].inventory?.length || 0) - (a[1].inventory?.length || 0))
            .slice(0, 5);

        const msg = sorted.map((u, i) => `${i + 1}. ${u[0]} (${u[1].inventory?.length || 0} jogos)`).join(' | ');
        client.say(channel, `🏆 Top Colecionadores: ${msg}`);
    },

    // !gamebox (stats globais)
    gamebox: (client, channel, user, args) => {
        const allUsers = UserService.getAllUsers();
        const totalUsers = Object.keys(allUsers).length;
        const allGames = GameService.getAllGames();
        const totalBoxes = Object.values(allUsers).reduce((acc, u) => acc + (u.totalBoxesOpened || 0), 0);

        client.say(channel, `📊 GameBox Stats: ${totalUsers} usuários | ${allGames.length} jogos no pool | ${totalBoxes} caixas abertas globalmente.`);
    },

    // !giftcoins
    giftcoins: (client, channel, user, args) => {
        if (args.length < 2) {
            client.say(channel, `@${user.username} Uso: !giftcoins <usuario> <quantidade>`);
            return;
        }

        const targetUser = args[0].replace('@', '').toLowerCase();
        const amount = parseInt(args[1]);

        if (isNaN(amount) || amount <= 0) {
            client.say(channel, `@${user.username} Quantidade inválida.`);
            return;
        }

        if (targetUser === user.username.toLowerCase()) {
            client.say(channel, `@${user.username} Você não pode doar para si mesmo.`);
            return;
        }

        const sender = UserService.getOrCreateUser(user.username);
        if (sender.coins < amount) {
            client.say(channel, `@${user.username} Saldo insuficiente.`);
            return;
        }

        UserService.removeCoins(user.username, amount);
        UserService.addCoins(targetUser, amount);

        client.say(channel, `🤝 @${user.username} doou ${amount} moedas para @${targetUser}!`);
    },

    // !daily
    daily: (client, channel, user, args) => {
        const result = DailyService.claimDaily(user.username);
        if (result.success) {
            client.say(channel, result.message);
        } else {
            if (result.type === 'cooldown') {
                client.say(channel, result.message);
            } else {
                client.say(channel, `❌ @${user.username} ${result.error}`);
            }
        }
    },

    // !trade
    trade: (client, channel, user, args) => {
        if (args.length < 2) {
            client.say(channel, `@${user.username} Uso: !trade <@usuario> <seu jogo> | <jogo dele>`);
            return;
        }

        const target = args[0].replace('@', '');
        const rest = args.slice(1).join(' ');

        let myGame, theirGame;
        if (rest.includes('|')) {
            [myGame, theirGame] = rest.split('|').map(s => s.trim());
        } else {
            client.say(channel, `@${user.username} Use "|" para separar os jogos. Ex: !trade @${target} Mario | Zelda`);
            return;
        }

        const result = TradeService.initiateTrade(user.username, target, myGame, theirGame);
        if (result.success) {
            client.say(channel, result.message);
        } else {
            client.say(channel, `❌ @${user.username} ${result.error}`);
        }
    },

    // !sim
    sim: (client, channel, user, args) => {
        const result = TradeService.acceptTrade(user.username);
        if (result.success) {
            client.say(channel, result.message);
        } else {
            client.say(channel, `❌ @${user.username} ${result.error}`);
        }
    },

    // !nao
    nao: (client, channel, user, args) => {
        const result = TradeService.rejectTrade(user.username);
        if (result.success) {
            client.say(channel, result.message);
        } else {
            client.say(channel, `❌ @${user.username} ${result.error}`);
        }
    },

    // Admin Commands
    adminaddcoins: (client, channel, user, args) => {
        if (args.length < 2) return;
        const target = args[0].replace('@', '').toLowerCase();
        const amount = parseInt(args[1]);
        UserService.addCoins(target, amount);
        client.say(channel, `✅ Adicionado ${amount} moedas para ${target}.`);
    },

    adminremovecoins: (client, channel, user, args) => {
        if (args.length < 2) return;
        const target = args[0].replace('@', '').toLowerCase();
        const amount = parseInt(args[1]);
        UserService.removeCoins(target, amount);
        client.say(channel, `✅ Removido ${amount} moedas de ${target}.`);
    },

    admingivebox: (client, channel, user, args) => {
        if (args.length < 2) return;
        const target = args[0].replace('@', '').toLowerCase();
        const amount = parseInt(args[1]);
        UserService.addBoxes(target, amount);
        client.say(channel, `✅ Adicionado ${amount} caixas para ${target}.`);
    },

    adminsetlevel: (client, channel, user, args) => {
        // Implementar lógica de set level se necessário
        client.say(channel, `Comando em desenvolvimento.`);
    },

    adminuserinfo: (client, channel, user, args) => {
        if (args.length < 1) return;
        const target = args[0].replace('@', '').toLowerCase();
        const u = UserService.getUser(target);
        if (!u) {
            client.say(channel, `Usuário não encontrado.`);
            return;
        }
        client.say(channel, `👤 ${target}: ${u.coins} coins, ${u.boxCount} boxes, ${u.inventory?.length || 0} games, XP: ${u.xp || 0}`);
    },

    adminreloadconfig: (client, channel, user, args) => {
        // Config é carregada a cada chamada, então não precisa de reload explícito
        client.say(channel, `🔄 Configuração recarregada.`);
    }
};

// Objeto principal de comandos (compatibilidade com index.js)
export const commands = {
    // Handler genérico para processar qualquer comando
    handle: async (client, channel, user, commandName, args, cmdConfig) => {
        // 1. Verifica se tem handler específico (lógica complexa)
        // Remove o prefixo "!" para buscar no objeto coreHandlers
        const cleanName = commandName.startsWith('!') ? commandName.substring(1) : commandName;

        if (coreHandlers[cleanName]) {
            await coreHandlers[cleanName](client, channel, user, args);
            return;
        }

        // 2. Se não tem handler específico, usa a resposta configurada (variáveis)
        if (cmdConfig.response) {
            const response = resolveVariables(cmdConfig.response, user, channel, args);
            client.say(channel, response);
            return;
        }

        // 3. Fallback
        console.log(`Comando ${commandName} sem handler ou resposta definida.`);
    }
};
