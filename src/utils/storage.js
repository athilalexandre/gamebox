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
  return readJSON('config.json') || {
    twitchBotUsername: '',
    twitchOAuthToken: '',
    twitchChannels: [],
    commandPrefix: '!',
    currencyName: 'Coins',
    boxPrice: 100,
    coinsPerMessage: 5,
    messageCooldown: 60,
    botConnected: false
  };
}

/**
 * Salva a configuração do bot
 * @param {Object} config - Configuração para salvar
 * @returns {boolean} Sucesso
 */
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
 * Carrega configuração de comandos
 * @returns {Array} Array de comandos
 */
export function loadCommands() {
  return readJSON('commands.json') || [];
}

/**
 * Salva configuração de comandos
 * @param {Array} commands - Array de comandos
 * @returns {boolean} Sucesso
 */
export function saveCommands(commands) {
  return writeJSON('commands.json', commands);
}
