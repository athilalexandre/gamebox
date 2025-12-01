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
    inventory: async (client, channel, user, args) => {
        const userData = UserService.getOrCreateUser(user.username);
        const stats = UserService.getInventoryStats(user.username);

        if (stats.total === 0) {
            client.say(channel, `@${user.username} Seu inventário está vazio. Compre caixas com !buybox!`);
            return;
        }

        // Mostra resumo no chat
        const rarities = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D', 'E'];
        let summary = [];

        for (const r of rarities) {
            if (stats.byRarity[r] > 0) {
                summary.push(`${r}: ${stats.byRarity[r]}`);
            }
        }

        const msg = summary.join(' | ');
        client.say(channel, `@${user.username} Inventário (${stats.total} jogos): ${msg}`);

        // Envia lista detalhada (whisper ou chat dependendo se é o bot)
        if (userData.inventory && userData.inventory.length > 0) {
            const gamesList = userData.inventory
                .map((game, index) => `${index + 1}. ${game.name} [${game.rarity}]`)
                .join(', ');

            const maxLength = 450;
            const isBotAccount = user.username.toLowerCase() === client.getUsername().toLowerCase();

            try {
                if (isBotAccount) {
                    // Se for o próprio bot, envia no chat público
                    if (gamesList.length <= maxLength) {
                        client.say(channel, `📦 Jogos: ${gamesList}`);
                    } else {
                        // Divide em múltiplas mensagens no chat
                        const games = userData.inventory;
                        let currentMessage = '📦 Jogos: ';
                        let messageCount = 1;

                        for (let i = 0; i < games.length; i++) {
                            const gameEntry = `${i + 1}. ${games[i].name} [${games[i].rarity}]`;

                            if ((currentMessage + gameEntry).length > maxLength) {
                                client.say(channel, currentMessage);
                                currentMessage = `(Parte ${++messageCount}) `;
                            }

                            currentMessage += (currentMessage.endsWith(' ') ? '' : ', ') + gameEntry;
                        }

                        if (currentMessage.length > 0) {
                            client.say(channel, currentMessage);
                        }
                    }
                } else {
                    // Envia whisper para outros usuários
                    if (gamesList.length <= maxLength) {
                        await client.whisper(user.username, `📦 Seus jogos: ${gamesList}`);
                    } else {
                        // Divide em múltiplos whispers
                        const games = userData.inventory;
                        let currentMessage = '📦 Seus jogos: ';
                        let messageCount = 1;

                        for (let i = 0; i < games.length; i++) {
                            const gameEntry = `${i + 1}. ${games[i].name} [${games[i].rarity}]`;

                            if ((currentMessage + gameEntry).length > maxLength) {
                                await client.whisper(user.username, currentMessage);
                                currentMessage = `(Parte ${++messageCount}) `;
                            }

                            currentMessage += (currentMessage.endsWith(' ') ? '' : ', ') + gameEntry;
                        }

                        if (currentMessage.length > 0) {
                            await client.whisper(user.username, currentMessage);
                        }
                    }
                }
            } catch (error) {
                console.error(`Erro ao enviar lista de jogos para ${user.username}:`, error.message);
                // Se falhar o whisper, tenta enviar no chat
                if (!isBotAccount) {
                    client.say(channel, `@${user.username} Não foi possível enviar whisper. Verifique suas configurações de privacidade.`);
                }
            }
        }
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
        const rarities = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D', 'E'];
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
