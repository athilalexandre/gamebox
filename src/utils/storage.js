import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');

/**
 * Lê um arquivo JSON de forma síncrona
 * @param {string} filename - Nome do arquivo (ex: 'users.json')
 * @returns {any} Dados parseados do JSON
 */
export function readJSON(filename) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`[STORAGE] Erro ao ler ${filename}:`, error.message);
    return null;
  }
}

/**
 * Escreve dados em um arquivo JSON de forma síncrona
 * @param {string} filename - Nome do arquivo (ex: 'users.json')
 * @param {any} data - Dados para salvar
 * @returns {boolean} Sucesso da operação
 */
export function writeJSON(filename, data) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`[STORAGE] Erro ao escrever ${filename}:`, error.message);
    return false;
  }
}
/**
 * Carrega a configuração do bot
 * @returns {Object} Configuração
 */
export function loadConfig() {
  const defaults = {
    // Configurações do Bot Twitch
    twitchBotUsername: '',
    twitchOAuthToken: '',
    twitchChannels: [],
    commandPrefix: '!',

    // Sistema de Moedas
    currencyName: 'Coins',
    boxPrice: 100,

    // Recompensas de Chat
    coinsPerMessage: 5,
    messageCooldown: 60,

    // Sistema de Timer Automático
    currencyTimerInterval: 600,      // 10 minutos
    currencyTimerAmount: 50,         // 50 moedas por timer

    // Recompensas de Engajamento
    coinsPerSub: 500,                // 500 moedas por sub
    coinsPerSubGift: 250,            // 250 moedas por gift sub
    coinsPerBit: 1,                  // 1 moeda por bit
    coinsPerRaid: 100,               // 100 moedas por raid
    coinsPerFollow: 50,              // 50 moedas por follow

    // Integração IGDB
    igdbClientId: '',
    igdbClientSecret: '',

    // Sistema de Níveis
    levelTable: [
      { level: 1, xp: 0, name: '🌱 Iniciante' },
      { level: 2, xp: 100, name: '🎮 Novato' },
      { level: 3, xp: 250, name: '⚔️ Jogador' },
      { level: 4, xp: 500, name: '🎯 Experiente' },
      { level: 5, xp: 1000, name: '🏆 Veterano' },
      { level: 6, xp: 2000, name: '💎 Elite' },
      { level: 7, xp: 4000, name: '👑 Mestre' },
      { level: 8, xp: 8000, name: '🌟 Campeão' },
      { level: 9, xp: 15000, name: '🔥 Lendário' },
      { level: 10, xp: 30000, name: '⚡ Supremo' }
    ],

    // Configurações Avançadas
    autoSync: false,                 // Auto-sync com IGDB ao iniciar
    maxBoxesPerPurchase: 10,         // Máximo de caixas por compra
    allowDuplicates: true,           // Permitir jogos duplicados

    // Personalização
    welcomeMessage: '🎮 Bem-vindo ao GameBox! Digite !help para começar.',
    boxOpenAnimation: true,          // Mostrar animação ao abrir caixa
    rarityAnnouncement: true,        // Anunciar raridades altas (S+) no chat

    // Sistema de Recompensa Diária
    dailyEnabled: true,
    dailyCooldownHours: 24,
    dailyCoinsAmount: 200,
    dailyBoxesAmount: 1,
    dailyGameEBRarities: ['E', 'D', 'C', 'B'],

    // Sistema de Trocas (Trading)
    tradingEnabled: true,
    tradeCoinCost: 50,
    tradeMinCoinsRequired: 100,
    tradeCommandCooldownSeconds: 60,

    // Estado do Bot
    botConnected: false
  };

  const loaded = readJSON('config.json') || {};
  return { ...defaults, ...loaded };
}
export function saveConfig(config) {
  return writeJSON('config.json', config);
}

/**
 * Carrega todos os usuários
 * @returns {Object} Objeto com usuários indexados por username
 */
export function loadUsers() {
  return readJSON('users.json') || {};
}

/**
 * Salva todos os usuários
 * @param {Object} users - Objeto com usuários
 * @returns {boolean} Sucesso
 */
export function saveUsers(users) {
  return writeJSON('users.json', users);
}

/**
 * Carrega todos os jogos
 * @returns {Array} Array de jogos
 */
export function loadGames() {
  return readJSON('games.json') || [];
}

/**
 * Salva todos os jogos
 * @param {Array} games - Array de jogos
 * @returns {boolean} Sucesso
 */
export function saveGames(games) {
  return writeJSON('games.json', games);
}

/**
 * Carrega a lista de comandos
 */
export function loadCommands() {
  return readJSON('commands.json') || [];
}

/**
 * Salva a lista de comandos
 */
export function saveCommands(commands) {
  return writeJSON('commands.json', commands);
}

/**
 * Carrega a lista de trocas
 */
export function loadTrades() {
  return readJSON('trades.json') || [];
}

/**
 * Salva a lista de trocas
 */
export function saveTrades(trades) {
  return writeJSON('trades.json', trades);
}

/**
 * Inicializa comandos core se não existirem
 * Deve ser chamado no startup do bot
 * Restaura comandos que foram convertidos incorretamente para custom
 * @param {Array} coreCommands - Array de comandos core (lista canônica)
 * @returns {boolean} Sucesso
 */
export function initializeCoreCommands(coreCommands) {
  try {
    const existingCommands = loadCommands();

    // Cria um Set com os nomes de todos os comandos core da lista canônica
    const coreCommandNames = new Set(coreCommands.map(cmd => cmd.name));

    // Separa comandos existentes
    const existingCore = existingCommands.filter(cmd => cmd.type === 'core' || cmd.core === true);
    const existingCustom = existingCommands.filter(cmd => (cmd.type !== 'core' && cmd.core !== true));

    // IMPORTANTE: Verifica se algum comando "custom" é na verdade um core que foi corrompido
    const trueCustom = existingCustom.filter(cmd => !coreCommandNames.has(cmd.name));
    const corruptedCore = existingCustom.filter(cmd => coreCommandNames.has(cmd.name));

    if (corruptedCore.length > 0) {
      console.log(`[STORAGE] Restaurando ${corruptedCore.length} comandos core corrompidos:`, corruptedCore.map(c => c.name));
    }

    // Cria um mapa de comandos core existentes (tanto os marcados como core quanto os corrompidos)
    const allExistingCore = [...existingCore, ...corruptedCore];
    const existingCoreMap = new Map(allExistingCore.map(cmd => [cmd.name, cmd]));

    // Mescla comandos core: usa definição canônica mas preserva enabled/cooldown customizado
    const mergedCore = coreCommands.map(coreCmd => {
      const existing = existingCoreMap.get(coreCmd.name);
      if (existing) {
        // Preserva apenas enabled e cooldown se foram customizados
        return {
          ...coreCmd, // Definição canônica (type, core, name, aliases, etc)
          enabled: existing.enabled !== undefined ? existing.enabled : coreCmd.enabled,
          cooldown: existing.cooldown !== undefined ? existing.cooldown : coreCmd.cooldown
        };
      }
      return coreCmd; // Novo comando core
    });

    // Combina core (restaurados) + custom (verdadeiros)
    const allCommands = [...mergedCore, ...trueCustom];

    console.log(`[STORAGE] Comandos inicializados: ${mergedCore.length} core, ${trueCustom.length} custom`);

    return saveCommands(allCommands);
  } catch (error) {
    console.error('[STORAGE] Erro ao inicializar comandos core:', error.message);
    return false;
  }
}

/**
 * Remove apenas comandos customizados (preserva core)
 * Usado no reset database
 * @returns {boolean} Sucesso
 */
export function resetCustomCommands() {
  try {
    const allCommands = loadCommands();
    // Mantém apenas comandos core
    const coreOnly = allCommands.filter(cmd => cmd.type === 'core' || cmd.core === true);
    return saveCommands(coreOnly);
  } catch (error) {
    console.error('[STORAGE] Erro ao resetar comandos customizados:', error.message);
    return false;
  }
}
