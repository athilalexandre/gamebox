import { ConfigRepository, UserRepository, GameRepository, CommandRepository } from '../db/repositories/index.js';
import BoxService from '../services/boxService.js';
import * as DailyService from '../services/dailyService.js';
import * as TradeService from '../services/tradeService.js';
import * as UserService from '../services/userService.js';
import { CORE_COMMANDS } from './coreCommands.js';

/**
 * Commands Handler - MongoDB version
 * All functions now use async/await and repositories
 */

// Resolver variáveis dinâmicas
const resolveVariables = async (text, user, channel, args) => {
    if (!text) return '';

    const config = await ConfigRepository.getConfig();
    const userData = await UserService.getOrCreateUser(user.username);
    const levelInfo = await UserService.getLevelInfo(userData.xp);
    const inventory = await UserService.getUserInventory(user.username);

    // Estatísticas de raridade
    const inventoryStats = inventory.reduce((acc, item) => {
        const rarity = item.gameId?.rarity || 'E';
        acc.byRarity[rarity] = (acc.byRarity[rarity] || 0) + item.quantity;
        acc.total += item.quantity;
        return acc;
    }, { total: 0, byRarity: {} });

    // Globais
    const allUsers = await UserRepository.getAllUsers();
    const totalUsers = allUsers.length;
    const allGames = await GameRepository.getAllGames();
    const totalGames = allGames.length;
    const totalBoxes = allUsers.reduce((acc, u) => acc + (u.totalBoxesOpened || 0), 0);

    const rarities = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D', 'E'];

    let result = text;

    // Variáveis de Usuário
    result = result.replace(/{user}/g, user.username);
    result = result.replace(/{balance}/g, userData.coins);
    result = result.replace(/{boxes}/g, userData.boxCount);
    result = result.replace(/{level}/g, levelInfo.level);
    result = result.replace(/{title}/g, levelInfo.name);
    result = result.replace(/{xp}/g, userData.xp);
    result = result.replace(/{nextlevel}/g, levelInfo.xpNeeded);
    result = result.replace(/{progress}/g, levelInfo.progress);
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

    // Variáveis de Raridade
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

// Handlers para comandos core
const coreHandlers = {
    // !buybox / !buy
    buybox: async (client, channel, user, args) => {
        const amount = args[0] ? parseInt(args[0]) : 1;
        if (isNaN(amount) || amount < 1) {
            client.say(channel, `@${user.username} Quantidade inválida.`);
            return;
        }

        try {
            const result = await BoxService.purchaseBoxes(user.username, amount);
            const config = await ConfigRepository.getConfig();
            client.say(channel, `📦 @${user.username} comprou ${result.boxesPurchased} caixa(s) por ${result.coinsSpent} ${config.currencyName}! Saldo: ${result.remainingCoins} ${config.currencyName}.`);
        } catch (error) {
            client.say(channel, `❌ @${user.username} ${error.message}`);
        }
    },

    // !openbox / !open / !box
    openbox: async (client, channel, user, args) => {
        try {
            const result = await BoxService.openBox(user.username, 1);
            const game = result.gamesObtained[0];

            if (game) {
                client.say(channel, `🎁 @${user.username} abriu uma caixa e ganhou: [${game.name}] (${game.rarity}) - ${game.console || 'Console desconhecido'}`);

                // Anúncio de raridade alta
                const config = await ConfigRepository.getConfig();
                if (config.rarityAnnouncement && ['S', 'SS', 'SSS'].includes(game.rarity)) {
                    client.say(channel, `🚨 DROP LENDÁRIO! @${user.username} acabou de conseguir ${game.name} [${game.rarity}]! 🎉`);
                }
            }
        } catch (error) {
            client.say(channel, `❌ @${user.username} ${error.message}`);
        }
    },

    // !inventory
    inventory: async (client, channel, user, args) => {
        const inventory = await UserService.getUserInventory(user.username);

        if (inventory.length === 0) {
            client.say(channel, `@${user.username} Seu inventário está vazio.`);
            return;
        }

        // Calcular total e estatísticas de raridade
        const stats = inventory.reduce((acc, item) => {
            const rarity = item.gameId?.rarity || 'E';
            acc.byRarity[rarity] = (acc.byRarity[rarity] || 0) + item.quantity;
            acc.total += item.quantity;
            return acc;
        }, { total: 0, byRarity: {} });

        const rarities = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D', 'E'];
        const rarityText = rarities
            .filter(r => stats.byRarity[r] > 0)
            .map(r => `${r}: ${stats.byRarity[r]}`)
            .join(' | ');

        client.say(channel, `🎮 @${user.username}, você tem [${stats.total} jogo(s)] na coleção. ${rarityText}`);
    },

    // !daily
    daily: async (client, channel, user, args) => {
        try {
            const result = await DailyService.claimDaily(user.username);

            if (result.success) {
                client.say(channel, result.message);
            } else {
                client.say(channel, `@${user.username} ${result.error || result.message}`);
            }
        } catch (error) {
            client.say(channel, `❌ @${user.username} Erro ao resgatar daily: ${error.message}`);
        }
    },

    // !trade
    trade: async (client, channel, user, args) => {
        if (args.length < 3) {
            client.say(channel, `@${user.username} Uso: !trade @usuario JogoSeu | JogoAlvo`);
            return;
        }

        // Parse: !trade @target GameA | GameB
        const fullText = args.join(' ');
        const parts = fullText.split('|');

        if (parts.length !== 2) {
            client.say(channel, `@${user.username} Uso: !trade @usuario JogoSeu | JogoAlvo`);
            return;
        }

        const targetUsername = args[0].replace('@', '').toLowerCase();
        const gameFrom = parts[0].replace(args[0], '').trim();
        const gameTo = parts[1].trim();

        try {
            const result = await TradeService.initiateTrade(user.username, targetUsername, gameFrom, gameTo);

            if (result.success) {
                client.say(channel, result.message);
            } else {
                client.say(channel, `❌ @${user.username} ${result.error}`);
            }
        } catch (error) {
            client.say(channel, `❌ @${user.username} Erro: ${error.message}`);
        }
    },

    // !sim (aceitar troca)
    sim: async (client, channel, user, args) => {
        try {
            const result = await TradeService.acceptTrade(user.username);

            if (result.success) {
                client.say(channel, result.message);
            } else {
                client.say(channel, `@${user.username} ${result.error}`);
            }
        } catch (error) {
            client.say(channel, `❌ @${user.username} ${error.message}`);
        }
    },

    // !nao / !não (rejeitar troca)
    nao: async (client, channel, user, args) => {
        try {
            const result = await TradeService.rejectTrade(user.username);

            if (result.success) {
                client.say(channel, result.message);
            } else {
                client.say(channel, `@${user.username} ${result.error}`);
            }
        } catch (error) {
            client.say(channel, `❌ @${user.username} ${error.message}`);
        }
    },

    // !topcoins
    topcoins: async (client, channel, user, args) => {
        const users = await UserRepository.getLeaderboard(5);
        const msg = users.map((u, i) => `${i + 1}. ${u.username} (${u.coins})`).join(' | ');
        client.say(channel, `🏆 Top Ricos: ${msg}`);
    },

    // !topxp
    topxp: async (client, channel, user, args) => {
        const users = await UserRepository.getLeaderboard(5);
        const msg = users.map((u, i) => `${i + 1}. ${u.username} (Nível ${u.level})`).join(' | ');
        client.say(channel, `🏆 Top Nível: ${msg}`);
    },

    // !topgames
    topgames: async (client, channel, user, args) => {
        const allUsers = await UserRepository.getAllUsers();
        const sorted = allUsers
            .sort((a, b) => (b.inventory?.length || 0) - (a.inventory?.length || 0))
            .slice(0, 5);

        const msg = sorted.map((u, i) => `${i + 1}. ${u.username} (${u.inventory?.length || 0} jogos)`).join(' | ');
        client.say(channel, `🏆 Top Colecionadores: ${msg}`);
    },

    // !gamebox (stats globais)
    gamebox: async (client, channel, user, args) => {
        const allUsers = await UserRepository.getAllUsers();
        const totalUsers = allUsers.length;
        const totalGames = await GameRepository.getCount();
        const totalBoxes = allUsers.reduce((acc, u) => acc + (u.totalBoxesOpened || 0), 0);

        client.say(channel, `📊 GameBox Stats: ${totalUsers} usuários | ${totalGames} jogos no pool | ${totalBoxes} caixas abertas globalmente.`);
    },

    // !giftcoins (admin)
    giftcoins: async (client, channel, user, args) => {
        if (args.length < 2) {
            client.say(channel, `@${user.username} Uso: !giftcoins <usuario> <quantidade>`);
            return;
        }

        const targetUsername = args[0].replace('@', '').toLowerCase();
        const amount = parseInt(args[1]);

        if (isNaN(amount) || amount <= 0) {
            client.say(channel, `@${user.username} Quantidade inválida.`);
            return;
        }

        try {
            await UserService.addCoins(targetUsername, amount);
            const config = await ConfigRepository.getConfig();
            client.say(channel, `💰 @${user.username} presenteou ${amount} ${config.currencyName} para @${targetUsername}!`);
        } catch (error) {
            client.say(channel, `❌ Erro: ${error.message}`);
        }
    },

    // !giftboxes (admin)
    giftboxes: async (client, channel, user, args) => {
        if (args.length < 2) {
            client.say(channel, `@${user.username} Uso: !giftboxes <usuario> <quantidade>`);
            return;
        }

        const targetUsername = args[0].replace('@', '').toLowerCase();
        const amount = parseInt(args[1]);

        if (isNaN(amount) || amount <= 0) {
            client.say(channel, `@${user.username} Quantidade inválida.`);
            return;
        }

        try {
            await UserService.addBoxes(targetUsername, amount);
            client.say(channel, `📦 @${user.username} presenteou ${amount} caixa(s) para @${targetUsername}!`);
        } catch (error) {
            client.say(channel, `❌ Erro: ${error.message}`);
        }
    }
};

/**
 * Processa um comando
 */
export async function handleCommand(client, channel, user, message) {
    const args = message.trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();

    try {
        // Buscar comando no banco de dados
        const command = await CommandRepository.getCommandByNameOrAlias(commandName);

        if (!command || !command.enabled) {
            return; // Comando não existe ou está desabilitado
        }

        // Verificar permissão
        if (command.level === 'admin') {
            const userData = await UserService.getOrCreateUser(user.username);
            const config = await ConfigRepository.getConfig();

            if (userData.role !== 'admin' && !config.adminUsers.includes(user.username.toLowerCase())) {
                client.say(channel, `@${user.username} Você não tem permissão para usar este comando.`);
                return;
            }
        }

        // Incrementar contagem de uso
        await CommandRepository.incrementUsage(commandName);

        // Executar handler core se existir
        const handlerKey = command.name.replace('!', '');
        if (coreHandlers[handlerKey]) {
            await coreHandlers[handlerKey](client, channel, user, args);
        }
        // Comandos simples com resposta
        else if (command.response) {
            const resolvedText = await resolveVariables(command.response, user, channel, args);
            client.say(channel, resolvedText);
        }
    } catch (error) {
        console.error(`[COMMAND] Error handling ${commandName}:`, error);
        client.say(channel, `❌ Erro ao executar comando: ${error.message}`);
    }
}

/**
 * Exportar objeto de comandos (compatibilidade)
 */
export const commands = {
    handleCommand
};
