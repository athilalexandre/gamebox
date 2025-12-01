/**
 * CORE COMMANDS - Non-deletable, system commands
 * These commands are always present and cannot be removed by users or reset database
 */

export const CORE_COMMANDS = [
    // ==================== ECONOMY / PROFILE ====================
    {
        name: '!balance',
        type: 'core',
        core: true,
        category: 'economy',
        description: 'Mostra seu saldo de moedas e caixas disponíveis',
        enabled: true,
        cooldown: 5,
        level: 'viewer',
        aliases: ['!coins', '!moedas', '!saldo'],
        hidden: false,
        response: '💰 {user}, você tem [{balance} {currency}] e [{boxes} caixas].'
    },

    {
        name: '!level',
        type: 'core',
        core: true,
        category: 'game',
        description: 'Mostra seu nível, XP e progresso',
        enabled: true,
        cooldown: 5,
        level: 'viewer',
        aliases: ['!rank', '!xp', '!nivel'],
        hidden: false,
        response: '📈 {user}, você está no nível [{level} – {title}] com [{xp} XP]. Você precisa de [{nextlevel} XP] para o próximo nível ([{progress}%]).'
    },

    {
        name: '!profile',
        type: 'core',
        core: true,
        category: 'game',
        description: 'Mostra um resumo completo do seu perfil',
        enabled: true,
        cooldown: 10,
        level: 'viewer',
        aliases: ['!perfil', '!me'],
        hidden: false,
        response: '🧾 Perfil de {user}: {balance} {currency} • 📦 {boxes} caixas • 🎮 {inventory} jogos • ⭐ Nível {level} – {title} ({xp} XP, {progress}% para o próximo)'
    },

    {
        name: '!inventory',
        type: 'core',
        core: true,
        category: 'game',
        description: 'Mostra informações sobre sua coleção de jogos',
        enabled: true,
        cooldown: 10,
        level: 'viewer',
        aliases: ['!inv', '!colecao', '!jogos'],
        hidden: false,
        response: '🎮 {user}, você tem [{inventory} jogos] na sua coleção.'
    },

    {
        name: '!rarities',
        type: 'core',
        core: true,
        category: 'game',
        description: 'Mostra a distribuição de raridades na sua coleção',
        enabled: true,
        cooldown: 15,
        level: 'viewer',
        aliases: ['!raridades', '!drops'],
        hidden: false,
        response: '💎 {user}, suas raridades: SSS: {sss} • SS: {ss} • S: {s} • A: {a} • B: {b} • C: {c} • D: {d} • E: {e}'
    },

    // ==================== BOXES ====================
    {
        name: '!buybox',
        type: 'core',
        core: true,
        category: 'economy',
        description: 'Compra caixas usando suas moedas',
        enabled: true,
        cooldown: 3,
        level: 'viewer',
        aliases: ['!buy', '!comprarcaixa', '!comprar'],
        hidden: false,
        // Handler will be implemented in code
    },

    {
        name: '!openbox',
        type: 'core',
        core: true,
        category: 'game',
        description: 'Abre uma ou mais caixas do seu inventário',
        enabled: true,
        cooldown: 3,
        level: 'viewer',
        aliases: ['!open', '!abrir'],
        hidden: false,
        // Handler will be implemented in code
    },

    // ==================== RANKINGS ====================
    {
        name: '!topcoins',
        type: 'core',
        core: true,
        category: 'util',
        description: 'Mostra os jogadores mais ricos',
        enabled: true,
        cooldown: 30,
        level: 'viewer',
        aliases: ['!topmoedas', '!rich'],
        hidden: false,
        // Handler will be implemented in code
    },

    {
        name: '!topxp',
        type: 'core',
        core: true,
        category: 'util',
        description: 'Mostra os jogadores com mais XP/nível',
        enabled: true,
        cooldown: 30,
        level: 'viewer',
        aliases: ['!rankglobal', '!topnivel'],
        hidden: false,
        // Handler will be implemented in code
    },

    {
        name: '!topgames',
        type: 'core',
        core: true,
        category: 'util',
        description: 'Mostra os jogadores com mais jogos',
        enabled: true,
        cooldown: 30,
        level: 'viewer',
        aliases: ['!colecionador', '!topinv'],
        hidden: false,
        // Handler will be implemented in code
    },

    {
        name: '!gamebox',
        type: 'core',
        core: true,
        category: 'util',
        description: 'Mostra estatísticas globais do GameBox',
        enabled: true,
        cooldown: 20,
        level: 'viewer',
        aliases: ['!gb', '!status'],
        hidden: false,
        // Handler will be implemented in code
    },

    // ==================== UTILITY ====================
    {
        name: '!help',
        type: 'core',
        core: true,
        category: 'util',
        description: 'Mostra a lista de comandos disponíveis',
        enabled: true,
        cooldown: 10,
        level: 'viewer',
        aliases: ['!commands', '!ajuda', '!comandos'],
        hidden: false,
        response: '📋 Comandos principais: !balance, !level, !profile, !buybox, !openbox, !inventory, !rarities, !topcoins, !topxp, !gamebox. Use {prefix}help para mais informações!'
    },



    // ==================== ECONOMY INTERACTIONS ====================
    {
        name: '!giftcoins',
        type: 'core',
        core: true,
        category: 'economy',
        description: 'Transfere moedas para outro usuário',
        enabled: true,
        cooldown: 10,
        level: 'viewer',
        aliases: ['!doar', '!give'],
        hidden: false,
        // Handler will be implemented in code
    },

    {
        name: '!daily',
        type: 'core',
        core: true,
        category: 'economy',
        description: 'Resgata sua recompensa diária (Coins, Caixas ou Jogos)',
        enabled: true,
        cooldown: 5, // Lógica interna verifica 24h
        level: 'viewer',
        aliases: ['!bonus', '!login', '!diario'],
        hidden: false,
        // Handler will be implemented in code
    },

    // ==================== TRADING SYSTEM ====================
    {
        name: '!trade',
        type: 'core',
        core: true,
        category: 'game',
        description: 'Inicia uma troca de jogos com outro usuário',
        enabled: true,
        cooldown: 10,
        level: 'viewer',
        aliases: ['!troca', '!trocar'],
        hidden: false,
        // Handler will be implemented in code
    },

    {
        name: '!sim',
        type: 'core',
        core: true,
        category: 'game',
        description: 'Aceita uma troca pendente',
        enabled: true,
        cooldown: 0,
        level: 'viewer',
        aliases: ['!yes', '!aceitar'],
        hidden: true,
        // Handler will be implemented in code
    },

    {
        name: '!nao',
        type: 'core',
        core: true,
        category: 'game',
        description: 'Rejeita uma troca pendente',
        enabled: true,
        cooldown: 0,
        level: 'viewer',
        aliases: ['!no', '!não', '!recusar'],
        hidden: true,
        // Handler will be implemented in code
    },

    // ==================== ADMIN COMMANDS ====================
    {
        name: '!adminaddcoins',
        type: 'core',
        core: true,
        category: 'admin',
        description: 'Adiciona moedas a um usuário (Admin)',
        enabled: true,
        cooldown: 0,
        level: 'admin',
        aliases: ['!addcoins'],
        hidden: true,
        // Handler will be implemented in code
    },

    {
        name: '!adminremovecoins',
        type: 'core',
        core: true,
        category: 'admin',
        description: 'Remove moedas de um usuário (Admin)',
        enabled: true,
        cooldown: 0,
        level: 'admin',
        aliases: ['!removecoins'],
        hidden: true,
        // Handler will be implemented in code
    },

    {
        name: '!admingivebox',
        type: 'core',
        core: true,
        category: 'admin',
        description: 'Dá caixas a um usuário (Admin)',
        enabled: true,
        cooldown: 0,
        level: 'admin',
        aliases: ['!givebox'],
        hidden: true,
        // Handler will be implemented in code
    },

    {
        name: '!adminsetlevel',
        type: 'core',
        core: true,
        category: 'admin',
        description: 'Define o nível de um usuário (Admin)',
        enabled: true,
        cooldown: 0,
        level: 'admin',
        aliases: ['!setlevel'],
        hidden: true,
        // Handler will be implemented in code
    },

    {
        name: '!adminuserinfo',
        type: 'core',
        core: true,
        category: 'admin',
        description: 'Mostra informações detalhadas de um usuário (Admin)',
        enabled: true,
        cooldown: 0,
        level: 'admin',
        aliases: ['!userinfo'],
        hidden: true,
        // Handler will be implemented in code
    },

    {
        name: '!adminreloadconfig',
        type: 'core',
        core: true,
        category: 'admin',
        description: 'Recarrega a configuração sem reiniciar (Admin)',
        enabled: true,
        cooldown: 0,
        level: 'admin',
        aliases: ['!reloadconfig'],
        hidden: true,
        // Handler will be implemented in code
    }
];

/**
 * Get all core command names (including aliases)
 */
export function getAllCoreCommandNames() {
    const names = new Set();
    CORE_COMMANDS.forEach(cmd => {
        names.add(cmd.name);
        cmd.aliases.forEach(alias => names.add(alias));
    });
    return Array.from(names);
}

/**
 * Check if a command name is a core command
 */
export function isCoreCommand(commandName) {
    return CORE_COMMANDS.some(cmd =>
        cmd.name === commandName || cmd.aliases.includes(commandName)
    );
}

/**
 * Get core command by name or alias
 */
export function getCoreCommand(commandName) {
    return CORE_COMMANDS.find(cmd =>
        cmd.name === commandName || cmd.aliases.includes(commandName)
    );
}
