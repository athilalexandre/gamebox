import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');

const DEFAULT_SETTINGS = {
    twitchBotUsername: '',
    twitchOAuthToken: '',
    twitchChannels: [],
    commandPrefix: '!',
    currencyName: 'Coins',
    boxPrice: 100,
    // Sistema de Tempo
    currencyTimerInterval: 600, // 600 segundos = 10 minutos
    currencyTimerAmount: 50,
    // Recompensas de Eventos
    coinsPerSub: 500,
    coinsPerSubGift: 250,
    coinsPerBit: 1, // 1 moeda por bit
    botConnected: false
};

const DEFAULT_COMMANDS = [
    {
        name: "!help",
        aliases: ["!ajuda", "!comandos"],
        description: "Mostra a lista de comandos disponíveis",
        enabled: true,
        cooldown: 5,
        level: "viewer"
    },
    {
        name: "!balance",
        aliases: ["!saldo", "!b", "!carteira"],
        description: "Mostra seu saldo de moedas e caixas",
        enabled: true,
        cooldown: 3,
        level: "viewer"
    },
    {
        name: "!inventory",
        aliases: ["!inv", "!jogos", "!colecao"],
        description: "Mostra seus jogos coletados por raridade",
        enabled: true,
        cooldown: 5,
        level: "viewer"
    },
    {
        name: "!buybox",
        aliases: ["!comprar", "!loja"],
        description: "Compra uma caixa de jogo com moedas",
        enabled: true,
        cooldown: 2,
        level: "viewer"
    },
    {
        name: "!openbox",
        aliases: ["!abrir", "!open"],
        description: "Abre uma caixa e revela um jogo aleatório",
        enabled: true,
        cooldown: 2,
        level: "viewer"
    },
    {
        name: "!givecoins",
        aliases: ["!darmoedas"],
        description: "Dá moedas para um usuário (Admin)",
        enabled: true,
        cooldown: 0,
        level: "admin"
    },
    {
        name: "!givebox",
        aliases: ["!darcaixa"],
        description: "Dá caixas para um usuário (Admin)",
        enabled: true,
        cooldown: 0,
        level: "admin"
    },
    {
        name: "!resetuser",
        aliases: ["!resetar"],
        description: "Reseta o inventário de um usuário (Admin)",
        enabled: true,
        cooldown: 0,
        level: "admin"
    }
];

function initDB() {
    console.log('🔄 Inicializando banco de dados (arquivos JSON)...');

    // Cria pasta data se não existir
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR);
        console.log('✅ Pasta data/ criada.');
    }

    // Config.json
    const configPath = path.join(DATA_DIR, 'config.json');
    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, JSON.stringify(DEFAULT_SETTINGS, null, 2));
        console.log('✅ config.json criado com valores padrão.');
    } else {
        // Se já existe, vamos tentar fazer merge das novas chaves (migração simples)
        try {
            const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            const newConfig = { ...DEFAULT_SETTINGS, ...currentConfig };

            // Remove chaves antigas se necessário
            delete newConfig.coinsPerMessage;
            delete newConfig.messageCooldown;

            // Garante que as novas chaves existam se não existirem
            if (!newConfig.currencyTimerInterval) newConfig.currencyTimerInterval = 600;
            if (!newConfig.currencyTimerAmount) newConfig.currencyTimerAmount = 50;
            if (!newConfig.coinsPerSub) newConfig.coinsPerSub = 500;
            if (!newConfig.coinsPerSubGift) newConfig.coinsPerSubGift = 250;
            if (!newConfig.coinsPerBit) newConfig.coinsPerBit = 1;

            fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
            console.log('✅ config.json atualizado com novas configurações.');
        } catch (e) {
            console.error('Erro ao migrar config:', e);
        }
    }

    // Users.json
    const usersPath = path.join(DATA_DIR, 'users.json');
    if (!fs.existsSync(usersPath)) {
        fs.writeFileSync(usersPath, JSON.stringify({}, null, 2));
        console.log('✅ users.json criado (vazio).');
    } else {
        console.log('ℹ️ users.json já existe.');
    }

    // Games.json
    const gamesPath = path.join(DATA_DIR, 'games.json');
    if (!fs.existsSync(gamesPath)) {
        fs.writeFileSync(gamesPath, JSON.stringify([], null, 2));
        console.log('✅ games.json criado (vazio).');
    } else {
        console.log('ℹ️ games.json já existe.');
    }

    // Commands.json
    const commandsPath = path.join(DATA_DIR, 'commands.json');
    if (!fs.existsSync(commandsPath)) {
        fs.writeFileSync(commandsPath, JSON.stringify(DEFAULT_COMMANDS, null, 2));
        console.log('✅ commands.json criado com comandos padrão.');
    } else {
        // Migração para adicionar aliases se não existirem
        try {
            const currentCommands = JSON.parse(fs.readFileSync(commandsPath, 'utf-8'));
            let updated = false;

            const newCommands = currentCommands.map(cmd => {
                if (!cmd.aliases) {
                    updated = true;
                    // Tenta achar o default correspondente para pegar os aliases padrão
                    const defaultCmd = DEFAULT_COMMANDS.find(d => d.name === cmd.name);
                    return { ...cmd, aliases: defaultCmd ? defaultCmd.aliases : [] };
                }
                return cmd;
            });

            if (updated) {
                fs.writeFileSync(commandsPath, JSON.stringify(newCommands, null, 2));
                console.log('✅ commands.json atualizado com aliases.');
            } else {
                console.log('ℹ️ commands.json já possui aliases.');
            }
        } catch (e) {
            console.error('Erro ao migrar commands:', e);
        }
    }

    console.log('🚀 Banco de dados pronto!');
}

initDB();
