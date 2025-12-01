# 📋 GameBox - Variáveis Completas do Sistema

## 🎯 TODAS AS VARIÁVEIS DISPONÍVEIS

---

## 1️⃣ CONFIGURAÇÕES DO BOT (`config.json`)

### ✅ Variáveis Existentes (Implementadas)
```javascript
{
  // Configurações do Bot Twitch
  twitchBotUsername: '',        // Nome do bot na Twitch
  twitchOAuthToken: '',          // Token OAuth para autenticação
  twitchChannels: [],            // Array de canais para conectar
  commandPrefix: '!',            // Prefixo dos comandos (padrão: !)
  
  // Sistema de Moedas
  currencyName: 'Coins',         // Nome da moeda do sistema
  boxPrice: 100,                 // Preço de uma caixa em moedas
  
  // Recompensas de Chat
  coinsPerMessage: 5,            // Moedas por mensagem no chat
  messageCooldown: 60,           // Cooldown entre mensagens (segundos)
  
  // Estado do Bot
  botConnected: false            // Se o bot está conectado
}
```

### ⚠️ Variáveis FALTANDO (Devem ser adicionadas)
```javascript
{
  // Sistema de Timer Automático
  currencyTimerInterval: 600,    // Intervalo do timer (segundos) - padrão 10 min
  currencyTimerAmount: 50,       // Moedas dadas por timer
  
  // Recompensas de Engajamento
  coinsPerSub: 500,              // Moedas por subscription
  coinsPerSubGift: 250,          // Moedas por gift sub
  coinsPerBit: 1,                // Moedas por bit doado
  coinsPerRaid: 100,             // Moedas por raid recebido
  coinsPerFollow: 50,            // Moedas por novo follow
  
  // Integração IGDB
  igdbClientId: '',              // Client ID da IGDB/Twitch
  igdbClientSecret: '',          // Client Secret da IGDB/Twitch
  
  // Sistema de Níveis
  levelTable: [                  // Tabela de níveis e XP
    { level: 1, xp: 0, name: 'Iniciante' },
    { level: 2, xp: 100, name: 'Novato' },
    { level: 3, xp: 250, name: 'Jogador' },
    { level: 4, xp: 500, name: 'Experiente' },
    { level: 5, xp: 1000, name: 'Veterano' },
    { level: 10, xp: 5000, name: 'Mestre' },
    { level: 20, xp: 20000, name: 'Lenda' }
  ],
  
  // Configurações Avançadas
  autoSync: false,               // Auto-sync com IGDB ao iniciar
  maxBoxesPerPurchase: 10,       // Máximo de caixas por compra
  allowDuplicates: true,         // Permitir jogos duplicados no inventário
  
  // Moderação
  adminUsers: [],                // Lista de usuários admin (além do broadcaster)
  bannedUsers: [],               // Lista de usuários banidos do bot
  
  // Personalização
  welcomeMessage: '🎮 Bem-vindo ao GameBox!',
  boxOpenAnimation: true,        // Mostrar animação ao abrir caixa
  rarityAnnouncement: true       // Anunciar raridades altas no chat
}
```

---

## 2️⃣ ESTRUTURA DE USUÁRIO (`users.json`)

### ✅ Campos Existentes
```javascript
{
  username: {
    coins: 0,                    // Quantidade de moedas
    boxCount: 0,                 // Quantidade de caixas disponíveis
    inventory: [],               // Array de jogos coletados
    xp: 0,                       // Experiência total
    level: 1,                    // Nível atual
    lastMessageTime: 0,          // Timestamp da última mensagem
    totalBoxesOpened: 0,         // Total de caixas abertas (lifetime)
    totalCoinsEarned: 0,         // Total de moedas ganhas (lifetime)
    role: 'viewer'               // Papel do usuário (viewer/admin/broadcaster)
  }
}
```

### ⚠️ Campos FALTANDO (Recomendados)
```javascript
{
  username: {
    // Estatísticas Avançadas
    favoriteRarity: 'E',         // Raridade mais dropada
    luckyStreak: 0,              // Sequência de raridades altas
    unluckyStreak: 0,            // Sequência de raridades baixas
    bestDrop: null,              // Melhor jogo já dropado
    
    // Histórico
    firstBoxDate: null,          // Data da primeira caixa
    lastBoxDate: null,           // Data da última caixa
    lastLoginDate: null,         // Último login/mensagem
    
    // Conquistas
    achievements: [],            // Array de conquistas desbloqueadas
    
    // Trading (futuro)
    tradeLocked: false,          // Se pode fazer trades
    wishlist: [],                // Lista de jogos desejados
    
    // Preferences
    notificationsEnabled: true,  // Se recebe notificações
    language: 'pt-BR'            // Idioma preferido
  }
}
```

---

## 3️⃣ ESTRUTURA DE JOGO (`games.json`)

### ✅ Campos Existentes
```javascript
{
  id: 1,                         // ID único do jogo
  name: 'Nome do Jogo',          // Nome do jogo
  rarity: 'E',                   // Raridade (E, D, C, B, A, S, SS, SSS)
  console: 'PC',                 // Console/Plataforma
  releaseYear: 2024,             // Ano de lançamento
  originalRating: 75,            // Rating original (Metacritic)
  cover: null                    // URL da capa (opcional)
}
```

### ⚠️ Campos FALTANDO (Recomendados)
```javascript
{
  // Metadados IGDB
  igdbId: null,                  // ID no banco IGDB
  genres: [],                    // Gêneros do jogo
  developer: '',                 // Desenvolvedora
  publisher: '',                 // Publicadora
  
  // Estatísticas
  dropCount: 0,                  // Vezes que foi dropado
  popularityScore: 0,            // Score de popularidade
  
  // Informações Adicionais
  description: '',               // Descrição curta
  tags: [],                      // Tags customizadas
  
  // Trading
  tradeable: true,               // Se pode ser trocado
  marketValue: 100,              // Valor de mercado estimado
  
  // Admin
  disabled: false,               // Se está desabilitado do pool
  customRarity: false            // Se raridade foi definida manualmente
}
```

---

## 4️⃣ VARIÁVEIS PARA COMANDOS CUSTOMIZADOS

### ✅ Variáveis Disponíveis nos Comandos
```javascript
{
  // Usuário
  {user}          // Nome do usuário
  {balance}       // Saldo de moedas
  {boxes}         // Quantidade de caixas
  {level}         // Nível atual
  {xp}            // XP atual
  
  // Sistema
  {currency}      // Nome da moeda configurada
  {boxprice}      // Preço da caixa
  {prefix}        // Prefixo dos comandos
  
  // Estatísticas
  {totalusers}    // Total de usuários cadastrados
  {totalgames}    // Total de jogos no banco
  {totalboxes}    // Total de caixas abertas (global)
}
```

### ⚠️ Variáveis FALTANDO (Recomendadas)
```javascript
{
  // Usuário Avançado
  {inventory}     // Quantidade de jogos no inventário
  {rank}          // Posição no ranking
  {title}         // Título do nível atual
  {nextlevel}     // XP necessário para próximo nível
  {progress}      // Progresso percentual para próximo nível
  
  // Raridades
  {sss}           // Quantidade de jogos SSS
  {ss}            // Quantidade de jogos SS
  {s}             // Quantidade de jogos S
  {a}             // Quantidade de jogos A
  {b}             // Quantidade de jogos B
  {c}             // Quantidade de jogos C
  {d}             // Quantidade de jogos D
  {e}             // Quantidade de jogos E
  
  // Estatísticas Globais
  {toprarity}     // Raridade mais comum no servidor
  {rarestrarity}  // Raridade mais rara no servidor
  {topuser}       // Usuário com mais jogos
  {richestuser}   // Usuário com mais moedas
  
  // Tempo
  {time}          // Hora atual
  {date}          // Data atual
  {uptime}        // Tempo que o bot está online
  
  // Canal
  {channel}       // Nome do canal
  {viewers}       // Viewers atuais (se disponível)
  {game}          // Jogo atual da stream (se disponível)
}
```

---

## 5️⃣ ESTRUTURA DE COMANDO (`commands.json`)

### ✅ Campos Existentes
```javascript
{
  name: '!comando',              // Nome do comando
  type: 'core',                  // Tipo: 'core' ou 'custom'
  description: 'Descrição',      // Descrição do comando
  response: 'Resposta',          // Resposta (para custom)
  enabled: true,                 // Se está habilitado
  cooldown: 5,                   // Cooldown em segundos
  level: 'viewer',               // Nível requerido (viewer/admin)
  aliases: []                    // Aliases do comando
}
```

### ⚠️ Campos FALTANDO (Recomendados)
```javascript
{
  // Estatísticas
  usageCount: 0,                 // Vezes que foi usado
  lastUsed: null,                // Última vez que foi usado
  
  // Restrições
  minLevel: 1,                   // Nível mínimo do usuário
  minCoins: 0,                   // Moedas mínimas para usar
  maxUsesPerUser: -1,            // Limite de usos por usuário (-1 = infinito)
  
  // Custo
  cost: 0,                       // Custo em moedas para usar
  
  // Configurações Avançadas
  category: 'util',              // Categoria (util/fun/admin/game)
  hidden: false,                 // Se não aparece no !help
  disabledChannels: [],          // Canais onde está desabilitado
  
  // Ações
  actions: [],                   // Ações a executar (dar moedas, etc)
  conditions: []                 // Condições para executar
}
```

---

## 6️⃣ VARIÁVEIS DE AMBIENTE / SISTEMA

### ⚠️ Variáveis que DEVEM ser adicionadas
```javascript
{
  // Servidor
  PORT: 3000,                    // Porta do servidor web
  NODE_ENV: 'development',       // Ambiente (development/production)
  
  // Segurança
  SESSION_SECRET: 'random-key',  // Chave de sessão
  JWT_SECRET: 'jwt-key',         // Chave JWT (se usar autenticação)
  
  // Database
  DB_PATH: './data',             // Caminho do banco de dados
  BACKUP_ENABLED: true,          // Se faz backup automático
  BACKUP_INTERVAL: 3600000,      // Intervalo de backup (ms)
  
  // Logs
  LOG_LEVEL: 'info',             // Nível de log (debug/info/warn/error)
  LOG_FILE: './logs/app.log',    // Arquivo de log
  
  // Rate Limiting
  RATE_LIMIT_ENABLED: true,      // Se tem rate limit
  RATE_LIMIT_MAX: 100,           // Max requests por janela
  RATE_LIMIT_WINDOW: 900000      // Janela em ms (15 min)
}
```

---

## 7️⃣ VARIÁVEIS DO BOT TWITCH

### ✅ Implementadas
```javascript
{
  username: '',                  // Nome do bot
  token: '',                     // OAuth token
  channels: []                   // Canais conectados
}
```

### ⚠️ FALTANDO
```javascript
{
  // Moderação
  modChannels: [],               // Canais onde é moderador
  autoModEnabled: false,         // Se tem auto-mod
  spamProtection: true,          // Proteção anti-spam
  
  // Mensagens Automáticas
  autoMessages: [],              // Mensagens agendadas
  autoMessageInterval: 600000,   // Intervalo entre mensagens (ms)
  
  // Eventos
  onSubscribe: 'default',        // Mensagem ao sub
  onRaid: 'default',             // Mensagem ao raid
  onFollow: 'default',           // Mensagem ao follow
  
  // Reconnect
  autoReconnect: true,           // Reconectar automaticamente
  reconnectDelay: 3000,          // Delay para reconectar (ms)
  maxReconnectAttempts: 5        // Max tentativas de reconexão
}
```

---

## 📊 RESUMO: O QUE ESTÁ FALTANDO

### 🔴 CRÍTICO (Necessário para funcionar 100%)
1. ✅ `currencyTimerInterval` - Timer de moedas
2. ✅ `currencyTimerAmount` - Quantidade por timer
3. ✅ `coinsPerSub` - Moedas por sub
4. ✅ `coinsPerSubGift` - Moedas por gift
5. ✅ `coinsPerBit` - Moedas por bit
6. ✅ `igdbClientId` - ID da IGDB
7. ✅ `igdbClientSecret` - Secret da IGDB
8. ✅ `levelTable` - Tabela de níveis

### 🟡 IMPORTANTE (Melhora a experiência)
1. ⚠️ Estatísticas avançadas de usuários
2. ⚠️ Sistema de conquistas
3. ⚠️ Mais variáveis para comandos customizados
4. ⚠️ Metadados completos dos jogos
5. ⚠️ Configurações de moderação

### 🟢 OPCIONAL (Funcionalidades futuras)
1. 📦 Sistema de trading
2. 🏆 Rankings globais
3. 🎯 Wishlist de jogos
4. 📊 Analytics avançado
5. 🌐 Multi-idioma

---

## ✅ IMPLEMENTAÇÃO RECOMENDADA

### Passo 1: Atualizar `storage.js`
Adicionar valores padrão para todas as variáveis críticas:

```javascript
export function loadConfig() {
  return readJSON('config.json') || {
    // Existentes
    twitchBotUsername: '',
    twitchOAuthToken: '',
    twitchChannels: [],
    commandPrefix: '!',
    currencyName: 'Coins',
    boxPrice: 100,
    coinsPerMessage: 5,
    messageCooldown: 60,
    botConnected: false,
    
    // NOVOS - Críticos
    currencyTimerInterval: 600,
    currencyTimerAmount: 50,
    coinsPerSub: 500,
    coinsPerSubGift: 250,
    coinsPerBit: 1,
    igdbClientId: '',
    igdbClientSecret: '',
    levelTable: [
      { level: 1, xp: 0, name: 'Iniciante' },
      { level: 2, xp: 100, name: 'Novato' },
      { level: 3, xp: 250, name: 'Jogador' },
      { level: 4, xp: 500, name: 'Experiente' },
      { level: 5, xp: 1000, name: 'Veterano' }
    ]
  };
}
```

### Passo 2: Atualizar Dashboard
Adicionar campos de configuração no `index.html` para as novas variáveis (JÁ FEITO!).

### Passo 3: Implementar Sistema de Timer
Criar módulo de timer automático para dar moedas periodicamente.

### Passo 4: Implementar Event Handlers
Handlers para subs, bits, raids, follows.

---

## 📝 CHECKLIST DE VARIÁVEIS

- ✅ Variáveis básicas do bot
- ✅ Sistema de moedas básico
- ✅ Sistema de caixas
- ✅ Sistema de XP
- ⚠️ Sistema de timer (FALTANDO)
- ⚠️ Recompensas de engajamento (FALTANDO)
- ✅ Integração IGDB (IMPLEMENTADO)
- ⚠️ Tabela de níveis customizável (INTERFACE PRONTA)
- ⚠️ Variáveis avançadas para comandos (FALTANDO)
- ⚠️ Configurações de moderação (FALTANDO)

**Status**: ~70% completo. Funcional, mas pode ser muito melhorado! 🚀
