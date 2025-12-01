# MongoDB Migration - Implementation Progress

## ✅ Completed

### 1. Database Layer Setup
- ✅ MongoDB connection module (`src/db/connection.js`)
- ✅ Environment variables added to `.env.example`
- ✅ Mongoose dependency installed

### 2. MongoDB Schemas Created
- ✅ `Config` model - Global bot configuration with rarity odds
- ✅ `User` model - User data with inventory (supports duplicates via quantity)
- ✅ `Game` model - Games with IGDB, Metacritic, and rarity
- ✅ `Command` model - Commands with `isCore` protection
- ✅ `Trade` model - Trade history and pending trades

### 3. Repositories Created
- ✅ `ConfigRepository` - Config management, rarity odds, trading/daily settings
- ✅ `UserRepository` - User CRUD, inventory management, coins, XP, daily rewards
- ✅ `GameRepository` - Game CRUD, rarity calculation, random game selection
- ✅ `CommandRepository` - Command management with core command protection
- ✅ `TradeRepository` - Trade creation, pending trades, history

### 4. Migration Service
- ✅ `MigrationService` - One-time JSON to MongoDB migration

## 🚧 In Progress / Next Steps

### 5. Update Main Entry Point
- [ ] Update `src/index.js` to connect to MongoDB before starting bot
- [ ] Run migration if needed
- [ ] Seed core commands

### 6. Update Services
- [ ] Refactor `userService.js` to use `UserRepository`
- [ ] Refactor `dailyService.js` to use repositories  
- [ ] Refactor `tradeService.js` to use repositories
- [ ] Create `BoxService.js` with probability-based rarity logic
- [ ] Create `GameSyncService.js` for IGDB + Metacritic auto-sync

### 7. Update Bot Commands
- [ ] Update all command handlers in `src/bot/commands.js` to use repositories
- [ ] Implement probability-based box opening
- [ ] Update daily reward with game selection by rarity
- [ ] Update trading commands to use TradeRepository

### 8. Update API Routes
- [ ] Update `src/api/server.js` to use repositories
- [ ] Add `/api/sync-games` endpoint for IGDB sync
- [ ] Update dashboard endpoints (users, games, trades, config, commands)
- [ ] Update `/api/reset-database` to preserve core commands

### 9. Core Commands Definition
- [ ] Create `src/bot/coreCommandsDefinition.js` with all core commands
- [ ] Mark all core commands with `isCore: true`

### 10. IGDB + Metacritic Sync
- [ ] Create `GameSyncService` with:
  - `syncAllGames()` - Full IGDB sync with paging
  - `syncSingleGame(igdbId)` - Single game sync
  - Metacritic score fetching
  - Rarity calculation from score
  - Preserve `customRarity` flag

### 11. Loot Box Logic Update
- [ ] Implement probability-based rarity selection
- [ ] Use `rarityOdds` from config
- [ ] Select random game from selected rarity
- [ ] Support duplicates via quantity increment
- [ ] Update dropCount for each game

### 12. Testing
- [ ] Test MongoDB connection
- [ ] Test JSON migration
- [ ] Test all repositories
- [ ] Test box opening with probabilities
- [ ] Test daily rewards
- [ ] Test trading system
- [ ] Test database reset (core commands preserved)

## 📋 Key Design Decisions

### Inventory System
- Uses `{ gameId: ObjectId, quantity: number }` format
- Fully supports duplicates (required for trading)
- Quantity incremented when same game dropped multiple times

### Rarity System
- Rarities stored as enum: E, D, C, B, A, S, SS, SSS
- Derived from Metacritic score via `rarityFromMetacritic()`
- `customRarity` flag prevents auto-update during sync
- Rarity odds stored in config (must sum to 100)

### Core Commands Protection
- All core commands have `isCore: true`
- Cannot be deleted via dashboard
- Cannot have `isCore` flag changed
- Preserved during database reset
- Re-seeded if missing

### Trading System
- Pending trades stored in MongoDB with 5min expiration
- Completed/rejected trades kept for history
- Supports duplicates (users can own multiple of same game)
- Coin cost deducted from both users

### Migration Strategy
- One-time automatic migration on first run
- JSON files preserved (not deleted)
- Config migrated to single MongoDB document
- Users migrated with stats preserved
- Games migrated with rarity calculated if Metacritic score exists
- Commands migrated with core flag preserved

## 🔧 Configuration

### Environment Variables Required
```bash
MONGO_URI=mongodb://localhost:27017/gamebox
MONGO_DB_NAME=gamebox
```

### Rarity Odds (Default)
```javascript
{
  E: 40,    // 40%
  D: 25,    // 25%
  C: 15,    // 15%
  B: 10,    // 10%
  A: 5,     // 5%
  S: 3,     // 3%
  SS: 1.5,  // 1.5%
  SSS: 0.5  // 0.5%
}
```

### Metacritic → Rarity Mapping
- 98+ → SSS
- 94-97 → SS
- 90-93 → S
- 85-89 → A
- 80-84 → B
- 70-79 → C
- 60-69 → D
- < 60 → E

## 📁 File Structure Created

```
src/
├── db/
│   ├── connection.js              # MongoDB connection
│   ├── models/
│   │   ├── index.js
│   │   ├── Config.js              # Config schema
│   │   ├── User.js                # User schema
│   │   ├── Game.js                # Game schema
│   │   ├── Command.js             # Command schema
│   │   └── Trade.js               # Trade schema
│   ├── repositories/
│   │   ├── index.js
│   │   ├── ConfigRepository.js
│   │   ├── UserRepository.js
│   │   ├── GameRepository.js
│   │   ├── CommandRepository.js
│   │   └── TradeRepository.js
│   └── services/
│       └── MigrationService.js    # JSON → MongoDB migration
```

## 🎯 Next Implementation Priority

1. **Update `src/index.js`** - Connect to MongoDB, run migration, seed commands
2. **Update Services** - Refactor existing services to use repositories
3. **Update Bot Commands** - Use MongoDB instead of JSON
4. **Update API Routes** - Dashboard endpoints using repositories
5. **Implement GameSyncService** - IGDB + Metacritic auto-sync
6. **Test Everything** - Comprehensive testing of all features

## ⚠️ Important Notes

- **Backward Compatibility**: Old JSON files will still exist after migration (not deleted)
- **Core Commands**: Never deleted, always re-seeded if missing
- **Inventory**: Fully supports duplicates (critical for trading)
- **Metacritic Sync**: Only updates rarity if `customRarity === false`
- **Database Reset**: Clears users/trades/custom commands, preserves core commands and config
