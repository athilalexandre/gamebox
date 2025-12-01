# Plano de Migração MongoDB - GameBox Bot

## 📋 ETAPAS DE IMPLEMENTAÇÃO

### FASE 1: CORE & FUNDAÇÃO (Etapas 1-3)
- ✅ Etapa 1: Criar esquemas MongoDB e repositórios [CONCLUÍDO]
- 🔄 Etapa 2: Definir comandos core e criar serviço de seed
- 🔄 Etapa 3: Atualizar arquivo principal (index.js) com MongoDB

### FASE 2: SERVIÇOS (Etapas 4-7)
- 🔄 Etapa 4: Criar BoxService com lógica de probabilidades
- 🔄 Etapa 5: Atualizar UserService para usar MongoDB
- 🔄 Etapa 6: Atualizar DailyService para usar MongoDB
- 🔄 Etapa 7: Atualizar TradeService para usar MongoDB

### FASE 3: COMANDOS DO BOT (Etapa 8)
- 🔄 Etapa 8: Refatorar commands.js para usar repositórios

### FASE 4: API & DASHBOARD (Etapas 9-10)
- 🔄 Etapa 9: Atualizar rotas da API (server.js)
- 🔄 Etapa 10: Implementar endpoint de reset com proteção de comandos core

### FASE 5: IGDB SYNC (Etapas 11-12)
- 🔄 Etapa 11: Criar GameSyncService (IGDB + Metacritic)
- 🔄 Etapa 12: Adicionar endpoint de auto-sync no dashboard

### FASE 6: TESTES & VALIDAÇÃO (Etapa 13)
- 🔄 Etapa 13: Criar arquivo .env e testar conexão MongoDB

---

## DETALHAMENTO DAS ETAPAS

### Etapa 1: ✅ Criar esquemas MongoDB e repositórios
**Status**: CONCLUÍDO
**Arquivos criados**:
- src/db/connection.js
- src/db/models/*.js (5 schemas)
- src/db/repositories/*.js (5 repositories)
- src/db/services/MigrationService.js

---

### Etapa 2: Definir comandos core e criar serviço de seed
**Arquivos a criar**:
- src/bot/coreCommandsDefinition.js
- src/db/services/SeedService.js

**Descrição**: Definir lista completa de comandos core com flag `isCore: true` para proteção contra exclusão.

---

### Etapa 3: Atualizar arquivo principal (index.js) com MongoDB
**Arquivos a modificar**:
- src/index.js

**Tarefas**:
- Importar connectToDatabase
- Conectar ao MongoDB antes de iniciar bot
- Executar migração se necessário
- Executar seed de comandos core

---

### Etapa 4: Criar BoxService com lógica de probabilidades
**Arquivos a criar**:
- src/services/boxService.js (NOVO)

**Tarefas**:
- Implementar seleção de raridade baseada em probabilidades (rarityOdds)
- Implementar seleção de jogo aleatório por raridade
- Suportar duplicatas (incrementar quantity)
- Atualizar dropCount dos jogos

---

### Etapa 5: Atualizar UserService para usar MongoDB
**Arquivos a modificar**:
- src/services/userService.js

**Tarefas**:
- Substituir readJSON/writeJSON por UserRepository
- Manter mesmas funções públicas para compatibilidade
- Atualizar lógica de inventário para usar gameId + quantity

---

### Etapa 6: Atualizar DailyService para usar MongoDB
**Arquivos a modificar**:
- src/services/dailyService.js

**Tarefas**:
- Usar ConfigRepository para settings
- Usar UserRepository para lastDailyRewardAt
- Usar GameRepository para seleção de jogos por raridade

---

### Etapa 7: Atualizar TradeService para usar MongoDB
**Arquivos a modificar**:
- src/services/tradeService.js

**Tarefas**:
- Usar TradeRepository para criar/atualizar trades
- Usar UserRepository para validação e transferência de jogos
- Implementar expiração automática de trades pendentes

---

### Etapa 8: Refatorar commands.js para usar repositórios
**Arquivos a modificar**:
- src/bot/commands.js

**Tarefas**:
- Atualizar todos os handlers de comandos
- Usar repositórios ao invés de services antigos
- Garantir que BoxService seja usado para !box/!open

---

### Etapa 9: Atualizar rotas da API (server.js)
**Arquivos a modificar**:
- src/api/server.js

**Tarefas**:
- GET/PUT /api/settings → ConfigRepository
- GET /api/users → UserRepository
- GET /api/games → GameRepository
- POST/PUT/DELETE /api/games/:id → GameRepository
- GET /api/commands → CommandRepository
- POST/PUT/DELETE /api/commands → CommandRepository (proteger core)
- GET /api/trades → TradeRepository

---

### Etapa 10: Implementar endpoint de reset com proteção
**Arquivos a modificar**:
- src/api/server.js

**Tarefas**:
- DELETE /api/reset-database
- Limpar users, trades, custom commands
- Preservar core commands
- Re-seed comandos core se necessário
- Resetar config para defaults (opcional)

---

### Etapa 11: Criar GameSyncService (IGDB + Metacritic)
**Arquivos a criar**:
- src/services/gameSyncService.js (NOVO)

**Tarefas**:
- Implementar syncAllGames() com paginação IGDB
- Buscar Metacritic score para cada jogo
- Calcular rarity baseado em Metacritic
- Respeitar flag customRarity
- Usar GameRepository.upsertGame()

---

### Etapa 12: Adicionar endpoint de auto-sync
**Arquivos a modificar**:
- src/api/server.js

**Tarefas**:
- POST /api/sync-games
- Chamar GameSyncService.syncAllGames()
- Retornar progresso/status

---

### Etapa 13: Criar arquivo .env e testar
**Arquivos a criar**:
- .env

**Tarefas**:
- Copiar .env.example para .env
- Adicionar MONGO_URI
- Testar conexão MongoDB
- Executar migração
- Testar comandos básicos

---

## 🎯 ORDEM DE EXECUÇÃO

1. Etapa 2 → Definir comandos core
2. Etapa 3 → Atualizar index.js
3. Etapa 4 → Criar BoxService
4. Etapa 5-7 → Atualizar services existentes
5. Etapa 8 → Atualizar commands.js
6. Etapa 9-10 → Atualizar API
7. Etapa 11-12 → IGDB Sync
8. Etapa 13 → Testar tudo

---

## ⏱️ ESTIMATIVA DE TEMPO
- Etapas 2-3: ~15 min
- Etapas 4-7: ~30 min
- Etapa 8: ~20 min
- Etapas 9-10: ~20 min
- Etapas 11-12: ~25 min
- Etapa 13: ~10 min
**Total: ~2 horas**
