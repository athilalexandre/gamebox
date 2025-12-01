# 🔄 CONTINUAÇÃO DA MIGRAÇÃO - Etapas Restantes

## ✅ CONCLUÍDO ATÉ AGORA

- ✅ **Etapa 1**: Esquemas MongoDB e Repositórios criados
- ✅ **Etapa 2**: SeedService criado para comandos core
- ✅ **Etapa 3**: index.js atualizado com MongoDB + migração automática
- ✅ **Etapa 4**: BoxService reescrito com lógica de probabilidades

---

## 🚧 PRÓXIMAS ETAPAS A EXECUTAR

### ETAPA 5: Atualizar UserService
**Arquivo**: `src/services/userService.js`

**Mudanças necessárias**:
```javascript
// ANTES (JSON):
import { loadUsers, saveUsers } from '../utils/storage.js';

// DEPOIS (MongoDB):
import { UserRepository } from '../db/repositories/index.js';

// Substituir todas as funções:
export async function getOrCreateUser(username) {
  return await UserRepository.findOrCreateUser(username);
}

export async function addCoins(username, amount) {
  return await UserRepository.addCoins(username, amount);
}

export async function addXP(username, amount, levelTable) {
  return await UserRepository.addXP(username, amount, levelTable);
}

// ... etc
```

---

### ETAPA 6: Atualizar DailyService
**Arquivo**: `src/services/dailyService.js`

**Mudanças necessárias**:
```javascript
// Importar repositórios:
import { ConfigRepository, UserRepository, GameRepository } from '../db/repositories/index.js';

// Atualizar função claimDailyReward:
export async function claimDailyReward(username) {
  const config = await ConfigRepository.getDailySettings();
  const user = await UserRepository.findOrCreateUser(username);
  
  // Verificar cooldown
  const canClaim = await UserRepository.canClaimDaily(username, config.dailyCooldownHours);
  if (!canClaim) {
    // retornar erro de cooldown
  }
  
  // Escolher recompensa (90% coins, 5% box, 5% game)
  // Se game, usar GameRepository.getRandomGameByRarity()
  // Atualizar user com UserRepository.updateLastDailyReward()
}
```

---

### ETAPA 7: Atualizar TradeService
**Arquivo**: `src/services/tradeService.js`

**Mudanças necessárias**:
```javascript
import { TradeRepository, UserRepository, GameRepository, ConfigRepository } from '../db/repositories/index.js';

export async function initiateTrade(initiator, target, gameFromInitiator, gameFromTarget) {
  const config = await ConfigRepository.getTradingSettings();
  
  if (!config.tradingEnabled) {
    throw new Error('Trading is disabled');
  }
  
  // Buscar games no DB
  const gameA = await GameRepository.searchGamesByName(gameFromInitiator);
  const gameB = await GameRepository.searchGamesByName(gameFromTarget);
  
  // Criar trade pendente
  const trade = await TradeRepository.createTrade({
    initiator,
    target,
    gameFromInitiator: gameA._id,
    gameFromTarget: gameB._id,
    coinCostEach: config.tradeCoinCost,
    status: 'pending'
  });
  
  return trade;
}

export async function acceptTrade(username) {
  const trade = await TradeRepository.getPendingTradeForUser(username);
  
  // Validar + executar troca
  // UserRepository.removeGameFromInventory()
  // UserRepository.addGameToInventory()
  // UserRepository.removeCoins()
  // TradeRepository.updateTradeStatus(trade._id, 'completed')
}
```

---

### ETAPA 8: Atualizar commands.js
**Arquivo**: `src/bot/commands.js`

**CRÍTICO**: Atualizar TODOS os handlers para usar os novos services:

```javascript
// !box / !open
case '!box':
case '!open':
  const result = await BoxService.openBox(username, quantity);
  // formatar resposta...
  break;

// !buy / !comprar
case '!buy':
  const purchase = await BoxService.purchaseBoxes(username, quantity);
  break;

// !daily
case '!daily':
  const reward = await DailyService.claimDailyReward(username);
  break;

// !trade
case '!trade':
  const trade = await TradeService.initiateTrade(...);
  break;

// !sim
case '!sim':
  await TradeService.acceptTrade(username);
  break;

// !nao
case '!nao':
  await TradeService.rejectTrade(username);
  break;
```

---

### ETAPA 9: Atualizar API Routes (server.js)
**Arquivo**: `src/api/server.js`

**Endpoints a atualizar**:

```javascript
import { 
  ConfigRepository, 
  UserRepository, 
  GameRepository, 
  CommandRepository, 
  TradeRepository 
} from '../db/repositories/index.js';

// GET /api/settings
app.get('/api/settings', async (req, res) => {
  const config = await ConfigRepository.getConfig();
  res.json(config);
});

// PUT /api/settings
app.put('/api/settings', async (req, res) => {
  await ConfigRepository.updateConfig(req.body);
  res.json({ success: true });
});

// GET /api/users
app.get('/api/users', async (req, res) => {
  const users = await UserRepository.getAllUsers();
  res.json(users);
});

// GET /api/games
app.get('/api/games', async (req, res) => {
  const games = await GameRepository.getAllGames();
  res.json(games);
});

// POST /api/games (criar jogo)
app.post('/api/games', async (req, res) => {
  const game = await GameRepository.createGame(req.body);
  res.json(game);
});

// GET /api/commands
app.get('/api/commands', async (req, res) => {
  const commands = await CommandRepository.getAllCommands();
  res.json(commands);
});

// DELETE /api/commands/:name (proteger core)
app.delete('/api/commands/:name', async (req, res) => {
  try {
    await CommandRepository.deleteCommand(req.params.name);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/trades
app.get('/api/trades', async (req, res) => {
  const trades = await TradeRepository.getRecentTrades(50);
  res.json(trades);
});
```

---

### ETAPA 10: Endpoint de Reset Database
**Arquivo**: `src/api/server.js`

```javascript
app.delete('/api/reset-database', async (req, res) => {
  try {
    // 1. Limpar usuários
    await UserRepository.deleteAll();
    
    // 2. Limpar trades
    await TradeRepository.deleteAll();
    
    // 3. Limpar APENAS comandos custom (preservar core)
    await CommandRepository.deleteAllCustomCommands();
    
    // 4. Re-seed comandos core (garantir que existem)
    await SeedService.seedCoreCommands();
    
    // 5. (Opcional) Resetar config para defaults
    // await ConfigRepository.resetToDefaults();
    
    res.json({ 
      success: true, 
      message: 'Database reset. Core commands preserved.' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### ETAPA 11-12: IGDB Sync Service (AVANÇADO)

Criar `src/services/gameSyncService.js`:

```javascript
import axios from 'axios';
import { GameRepository } from '../db/repositories/index.js';

class GameSyncService {
  async syncAllGames() {
    // 1. Obter token IGDB
    // 2. Paginar resultados IGDB
    // 3. Para cada jogo:
    //    - Buscar Metacritic score
    //    - Calcular rarity
    //    - GameRepository.upsertGame()
  }
}

export default new GameSyncService();
```

Adicionar endpoint em `server.js`:
```javascript
app.post('/api/sync-games', async (req, res) => {
  await GameSyncService.syncAllGames();
  res.json({ success: true });
});
```

---

### ETAPA 13: Criar .env e Testar

1. **Criar arquivo .env**:
```bash
MONGO_URI=mongodb://localhost:27017/gamebox
MONGO_DB_NAME=gamebox
PORT=3000
```

2. **Testar**:
```bash
npm start
```

3. **Verificar logs**:
- ✅ MongoDB connected
- ✅ Migration (se necessário)
- ✅ Core commands seeded
- ✅ Dashboard rodando

---

## 📝 CHECKLIST FINAL

- [ ] UserService usa UserRepository
- [ ] DailyService usa repositórios
- [ ] TradeService usa repositórios  
- [ ] BoxService usa repositórios (✅ JÁ FEITO)
- [ ] commands.js atualizado
- [ ] server.js (API) atualizado
- [ ] Reset database protege core commands
- [ ] GameSyncService (IGDB) criado
- [ ] .env criado
- [ ] Testado end-to-end

---

## ⚠️ PROBLEMAS COMUNS

### Erro: Cannot find module
- Verificar imports (usar `.js` no final)
- Usar caminhos relativos corretos

### Erro: MongoDB connection
- Verificar se MongoDB está rodando (`mongod`)
- Verificar MONGO_URI no .env

### Comandos não funcionam
- Verificar se seed executou (`npm start` deve mostrar "Core commands seeded")
- Verificar se CommandRepository.getCommandByNameOrAlias() funciona

---

## 🎯 COMO CONTINUAR

**Ordem recomendada**:
1. Atualizar UserService (Etapa 5)
2. Atualizar DailyService (Etapa 6)
3. Atualizar TradeService (Etapa 7)
4. Atualizar commands.js (Etapa 8)
5. Atualizar server.js API (Etapa 9)
6. Implementar reset protegido (Etapa 10)
7. Criar .env e testar (Etapa 13)
8. (Opcional) IGDB Sync (Etapas 11-12)

**Arquivos mais críticos**:
- `src/services/userService.js`
- `src/services/dailyService.js`
- `src/services/tradeService.js`
- `src/bot/commands.js`
- `src/api/server.js`
