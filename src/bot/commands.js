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

        const helpMsg = `Comandos: ${prefix}balance (ver saldo), ${prefix}buybox (comprar caixa - ${config.boxPrice} moedas), ${prefix}openbox (abrir caixa), ${prefix}inventory (ver coleção).`;
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
        // Nota: BoxService.buyBoxes precisa importar userService dinamicamente ou ser refatorado para evitar dependência circular.
        // Como implementei buyBoxes com import dinâmico, deve funcionar.

        // Pequena correção: buyBoxes no BoxService usa import dinâmico que retorna uma Promise
        // Mas aqui vamos simplificar chamando a lógica direto se necessário, ou confiar no serviço.
        // Vamos verificar a implementação do BoxService... ele usa await import.

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

    },

    // !stats
    stats: (client, channel, user, args) => {
        const userData = UserService.getOrCreateUser(user.username);
        const inventoryStats = UserService.getInventoryStats(user.username);

        // Formata moedas
        const coins = formatCurrency(userData.coins);

        // Contagem de jogos por raridade (apenas as que o usuário tem)
        const rarities = ['SSS', 'SS', 'S', 'A+', 'A', 'B', 'C', 'D', 'E'];
        const rarityBreakdown = rarities
            .filter(r => inventoryStats.byRarity[r] > 0)
            .map(r => `${r}:${inventoryStats.byRarity[r]}`)
            .join(' | ');

        const rarityText = rarityBreakdown || 'Nenhum jogo ainda';

        const msg = `📊 Status de ${user.username} | 💰 ${coins} | 📦 ${userData.boxCount} caixas | 🎮 ${inventoryStats.total} jogos [${rarityText}]`;
        client.say(channel, msg);
    },

    // --- Comandos de Admin ---

    // !givecoins <user> <amount>
    givecoins: (client, channel, user, args) => {
        // Verificação de admin é feita antes de chamar, no index.js
        if (args.length < 2) return;

        const targetUser = args[0].replace('@', '').toLowerCase();
        const amount = parseInt(args[1]);

        if (isNaN(amount)) return;

        UserService.addCoins(targetUser, amount);
        client.say(channel, `@${user.username} Adicionou ${amount} moedas para ${targetUser}.`);
    },

    // !givebox <user> <amount>
    givebox: (client, channel, user, args) => {
        if (args.length < 2) return;

        const targetUser = args[0].replace('@', '').toLowerCase();
        const amount = parseInt(args[1]);

        if (isNaN(amount)) return;

        UserService.addBoxes(targetUser, amount);
        client.say(channel, `@${user.username} Adicionou ${amount} caixas para ${targetUser}.`);
    },

    // !resetuser <user>
    resetuser: (client, channel, user, args) => {
        if (args.length < 1) return;

        const targetUser = args[0].replace('@', '').toLowerCase();
        UserService.resetUser(targetUser);
        client.say(channel, `@${user.username} Resetou o inventário de ${targetUser}.`);
    }
};
