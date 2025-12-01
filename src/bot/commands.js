import * as UserService from '../services/userService.js';
import * as BoxService from '../services/boxService.js';
import { loadConfig } from '../utils/storage.js';

// Utilitário para formatar moeda
const formatCurrency = (amount) => {
    const config = loadConfig();
    return `${amount} ${config.currencyName}`;
};

export const commands = {
    // !help
    help: (client, channel, user, args) => {
        const config = loadConfig();
        const prefix = config.commandPrefix;

        const helpMsg = `Comandos: ${prefix}balance (ver saldo), ${prefix}buybox (comprar caixa - ${config.boxPrice} moedas), ${prefix}openbox (abrir caixa), ${prefix}inventory (ver coleção), ${prefix}stats (ver perfil).`;
        client.say(channel, `@${user.username} ${helpMsg}`);
    },

    // !balance
    balance: (client, channel, user, args) => {
        const userData = UserService.getOrCreateUser(user.username);
        const msg = `💰 Saldo: ${formatCurrency(userData.coins)} | 📦 Caixas: ${userData.boxCount}`;
        client.say(channel, `@${user.username} ${msg}`);
    },

    // !buybox [quantidade]
    buybox: async (client, channel, user, args) => {
        const amount = args[0] ? parseInt(args[0]) : 1;

        if (isNaN(amount) || amount < 1) {
            client.say(channel, `@${user.username} Quantidade inválida.`);
            return;
        }

        const config = loadConfig();
        const result = await BoxService.buyBoxes(user.username, amount, config.boxPrice);

        if (result.success) {
            client.say(channel, `@${user.username} Comprou ${result.amount} caixa(s) por ${formatCurrency(result.cost)}! Saldo restante: ${formatCurrency(result.remainingCoins)}.`);
        } else {
            client.say(channel, `@${user.username} ${result.error}`);
        }
    },

    // !openbox
    openbox: async (client, channel, user, args) => {
        const result = await BoxService.openBox(user.username);

        if (result.success) {
            const msg = BoxService.formatBoxResult(result);
            client.say(channel, `@${user.username} Abriu uma caixa: ${msg}`);
        } else {
            client.say(channel, `@${user.username} ${result.error}`);
        }
    },

    // !inventory
    inventory: (client, channel, user, args) => {
        const stats = UserService.getInventoryStats(user.username);

        if (stats.total === 0) {
            client.say(channel, `@${user.username} Seu inventário está vazio. Compre caixas com !buybox!`);
            return;
        }

        // Mostra as 3 maiores raridades que o usuário tem
        const rarities = ['SSS', 'SS', 'S', 'A+', 'A', 'B', 'C', 'D', 'E'];
        let summary = [];

        for (const r of rarities) {
            if (stats.byRarity[r] > 0) {
                summary.push(`${r}: ${stats.byRarity[r]}`);
            }
        }

        const msg = summary.join(' | ');
        client.say(channel, `@${user.username} Inventário (${stats.total} jogos): ${msg}`);
    },

    // !stats
    stats: async (client, channel, user, args) => {
        const userData = UserService.getOrCreateUser(user.username);
        const inventoryStats = UserService.getInventoryStats(user.username);
        const xp = userData.xp || 0;

        // Importa serviço de XP para calcular nível
        const XpService = await import('../services/xpService.js');
        const levelInfo = XpService.calculateLevel(xp);

        const coins = formatCurrency(userData.coins);
        const rarities = ['SSS', 'SS', 'S', 'A+', 'A', 'B', 'C', 'D', 'E'];
        const rarityBreakdown = rarities
            .filter(r => inventoryStats.byRarity[r] > 0)
            .map(r => `${r}:${inventoryStats.byRarity[r]}`)
            .join(' | ');

        const rarityText = rarityBreakdown || 'Nenhum jogo';

        const msg = `📊 ${user.username} | Nvl ${levelInfo.level} (${levelInfo.name}) | XP: ${xp} | 💰 ${coins} | 📦 ${userData.boxCount} | 🎮 ${inventoryStats.total} jogos`;
        client.say(channel, msg);
    },

    // !level
    level: async (client, channel, user, args) => {
        const userData = UserService.getOrCreateUser(user.username);
        const xp = userData.xp || 0;

        const XpService = await import('../services/xpService.js');
        const levelInfo = XpService.calculateLevel(xp);

        client.say(channel, `@${user.username} Nível: ${levelInfo.level} (${levelInfo.name}) | XP: ${xp}`);
    },

    // --- Comandos de Admin ---

    // !givecoins <user> <amount>
    givecoins: (client, channel, user, args) => {
        if (args.length < 2) {
            client.say(channel, `@${user.username} Uso correto: !givecoins <usuario> <quantidade>`);
            return;
        }

        const targetUser = args[0].replace('@', '').toLowerCase();
        const amount = parseInt(args[1]);

        if (isNaN(amount)) {
            client.say(channel, `@${user.username} A quantidade deve ser um número.`);
            return;
        }

        UserService.addCoins(targetUser, amount);
        client.say(channel, `@${user.username} Adicionou ${amount} moedas para ${targetUser}.`);
    },

    // !givebox <user> <amount>
    givebox: (client, channel, user, args) => {
        if (args.length < 2) {
            client.say(channel, `@${user.username} Uso correto: !givebox <usuario> <quantidade>`);
            return;
        }

        const targetUser = args[0].replace('@', '').toLowerCase();
        const amount = parseInt(args[1]);

        if (isNaN(amount)) {
            client.say(channel, `@${user.username} A quantidade deve ser um número.`);
            return;
        }

        UserService.addBoxes(targetUser, amount);
        client.say(channel, `@${user.username} Adicionou ${amount} caixas para ${targetUser}.`);
    },

    // !resetuser <user>
    resetuser: (client, channel, user, args) => {
        if (args.length < 1) {
            client.say(channel, `@${user.username} Uso correto: !resetuser <usuario>`);
            return;
        }

        const targetUser = args[0].replace('@', '').toLowerCase();
        UserService.resetUser(targetUser);
        client.say(channel, `@${user.username} Resetou o inventário de ${targetUser}.`);
    }
};
