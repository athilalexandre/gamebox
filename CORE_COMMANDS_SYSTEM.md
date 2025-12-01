# 🎮 GameBox - Sistema de Comandos Core

## ✅ IMPLEMENTAÇÃO COMPLETA

---

## 📋 Resumo

Foi implementado um sistema robusto de **comandos core não-deletáveis** para o GameBox. Estes comandos:
- ✅ São sempre criados/restaurados no startup do bot
- ✅ **NÃO podem ser deletados** por usuários
- ✅ **São preservados** no Reset Database
- ✅ Podem ter `enabled` e `cooldown` customizados
- ✅ Não podem ter `type`, `core`, `name` ou `aliases` modificados

---

## 🎯 22 Comandos Core Implementados

### 💰 Economia / Perfil (5 comandos)
1. **!balance** - Mostra saldo e caixas
   - Aliases: !coins, !moedas, !saldo
2. **!level** - Mostra nível, XP e progresso
   - Aliases: !rank, !xp, !nivel
3. **!profile** - Resumo completo do perfil
   - Aliases: !perfil, !me
4. **!inventory** - Informações da coleção
   - Aliases: !inv, !colecao, !jogos
5. **!rarities** - Distribuição de raridades
   - Aliases: !raridades, !drops

### 📦 Caixas (2 comandos)
6. **!buybox** - Compra caixas
   - Aliases: !buy, !comprarcaixa, !comprar
7. **!openbox** - Abre caixas
   - Aliases: !open, !abrir

### 🏆 Rankings (4 comandos)
8. **!topcoins** - Top jogadores por moedas
   - Aliases: !topmoedas, !rich
9. **!topxp** - Top jogadores por XP/nível
   - Aliases: !rankglobal, !topnivel
10. **!topgames** - Top jogadores por coleção
    - Aliases: !colecionador, !topinv
11. **!gamebox** - Estatísticas globais
    - Aliases: !gb, !status

### 🛠️ Utilidade (3 comandos)
12. **!help** - Lista de comandos
    - Aliases: !commands, !ajuda, !comandos
13. **!uptime** - Tempo online do bot
    - Aliases: !tempo, !online
14. **!game** - Jogo atual da stream
    - Aliases: !jogo, !now

### 💸 Interações Econômicas (2 comandos)
15. **!giftcoins** - Transfere moedas
    - Aliases: !doar, !give
16. **!daily** - Recompensa diária
    - Aliases: !bonus, !login

### 👑 Admin (6 comandos - hidden)
17. **!adminaddcoins** - Adiciona moedas
    - Aliases: !addcoins
18. **!adminremovecoins** - Remove moedas
    - Aliases: !removecoins
19. **!admingivebox** - Dá caixas
    - Aliases: !givebox
20. **!adminsetlevel** - Define nível
    - Aliases: !setlevel
21. **!adminuserinfo** - Info de usuário
    - Aliases: !userinfo
22. **!adminreloadconfig** - Recarrega config
    - Aliases: !reloadconfig

---

## 🏗️ Arquitetura Implementada

### Arquivos Criados/Modificados

#### 1. `src/bot/coreCommands.js` (NOVO)
- Define todos os 22 comandos core
- Funções auxiliares:
  - `getAllCoreCommandNames()` - Lista todos os nomes/aliases
  - `isCoreCommand(name)` - Verifica se é core
  - `getCoreCommand(name)` - Busca comando core

#### 2. `src/utils/storage.js` (MODIFICADO)
- **Nova função**: `initializeCoreCommands(coreCommands)`
  - Chamada no startup
  - Mescla comandos core com existentes
  - Preserva `enabled` e `cooldown` customizados
  - Garante que todos os core existam

- **Nova função**: `resetCustomCommands()`
  - Remove apenas comandos customizados
  - Preserva todos os comandos core
  - Usada no Reset Database

#### 3. `src/bot/index.js` (MODIFICADO)
- Importa `CORE_COMMANDS` e `initializeCoreCommands`
- Inicializa comandos core no carregamento do módulo
- Log: `[BOT] Inicializando comandos core...`

#### 4. `src/api/server.js` (MODIFICADO)
- **Rota DELETE `/api/commands/:name`**:
  - Já tinha proteção: `if (cmd.type === 'core') return 403`
  
- **Rota POST `/api/reset-database`**:
  - Agora usa `resetCustomCommands()`
  - **NÃO deleta** `commands.json`
  - Remove apenas comandos customizados
  - Mensagem: "Comandos core foram preservados"

---

## 🔒 Proteções Implementadas

### 1. Proteção contra Deleção
```javascript
// Em server.js - DELETE /api/commands/:name
if (cmd.type === 'core' || cmd.core === true) {
    return res.status(403).json({ 
        success: false, 
        error: 'Não é possível deletar comandos do sistema' 
    });
}
```

### 2. Proteção no Reset Database
```javascript
// Remove apenas comandos customizados
export function resetCustomCommands() {
    const allCommands = loadCommands();
    const coreOnly = allCommands.filter(cmd => 
        cmd.type === 'core' || cmd.core === true
    );
    return saveCommands(coreOnly);
}
```

### 3. Inicialização Automática
```javascript
// Em bot/index.js - executado no startup
initializeCoreCommands(CORE_COMMANDS);
```

### 4. Merge Inteligente
```javascript
// Preserva customizações do usuário
const mergedCore = coreCommands.map(coreCmd => {
    const existing = existingCoreMap.get(coreCmd.name);
    if (existing) {
        return {
            ...coreCmd,
            enabled: existing.enabled,  // Preserva
            cooldown: existing.cooldown // Preserva
        };
    }
    return coreCmd;
});
```

---

## 📊 Estrutura de Comando Core

```javascript
{
  name: '!balance',              // Nome principal
  type: 'core',                  // Tipo CORE (não-deletável)
  core: true,                    // Flag adicional
  category: 'economy',           // Categoria
  description: 'Descrição...',   // Descrição
  enabled: true,                 // Pode ser customizado
  cooldown: 5,                   // Pode ser customizado
  level: 'viewer',               // Permissão mínima
  aliases: ['!coins', '!moedas'], // Aliases
  hidden: false,                 // Se aparece no !help
  response: '...'                // Resposta (se aplicável)
}
```

---

## 🎯 Comportamento do Sistema

### No Startup do Bot
1. ✅ Carrega `commands.json`
2. ✅ Separa comandos em core e custom
3. ✅ Mescla core commands canônicos com existentes
4. ✅ Preserva customizações de `enabled` e `cooldown`
5. ✅ Salva comandos mesclados
6. ✅ Bot está pronto com todos os comandos core

### No Reset Database
1. ✅ Deleta `games.json` e `users.json`
2. ✅ Recria arquivos vazios
3. ✅ **NÃO deleta** `commands.json`
4. ✅ Remove apenas comandos customizados
5. ✅ Comandos core permanecem intactos
6. ✅ Retorna mensagem: "Comandos core foram preservados"

### Na Tentativa de Deletar Core Command
1. ✅ API verifica `cmd.type === 'core'`
2. ✅ Retorna erro 403
3. ✅ Mensagem: "Não é possível deletar comandos do sistema"
4. ✅ Comando permanece no sistema

---

## 🧪 Como Testar

### Teste 1: Startup
```bash
npm start
```
**Esperado**: 
```
[BOT] Inicializando comandos core...
[BOT] Comandos core inicializados!
```

### Teste 2: Verificar Comandos
1. Acesse Dashboard → Gestão → Comandos
2. Veja 22 comandos core listados
3. Comandos core devem ter indicador visual (se implementado no frontend)

### Teste 3: Tentar Deletar Core Command
1. No dashboard, tente deletar `!balance`
2. **Esperado**: Erro 403 ou botão de delete desabilitado

### Teste 4: Reset Database
1. Vá em Configurações → Zona de Perigo
2. Clique em "Resetar Tudo"
3. Confirme 3 vezes
4. **Esperado**: 
   - Usuários deletados ✅
   - Jogos deletados ✅
   - Comandos customizados deletados ✅
   - **Comandos core preservados** ✅

### Teste 5: Comandos no Chat (quando handlers estiverem implementados)
```
!balance
!level
!profile
!help
!topcoins
```

---

## 📝 Próximos Passos

### 1. Implementar Handlers dos Comandos
Cada comando core precisa de sua lógica de execução. Exemplo:

```javascript
// Em commands.js
export const coreHandlers = {
  '!buybox': async (client, channel, user, args) => {
    const amount = parseInt(args[0]) || 1;
    const config = loadConfig();
    const result = await BoxService.buyBoxes(user.username, amount, config.boxPrice);
    if (result.success) {
      client.say(channel, `📦 ${user.username} comprou ${amount} caixa(s)!`);
    } else {
      client.say(channel, `❌ ${user.username}, ${result.error}`);
    }
  },
  
  '!topcoins': async (client, channel, user, args) => {
    const users = UserService.getAllUsers();
    const sorted = Object.entries(users)
      .sort((a, b) => b[1].coins - a[1].coins)
      .slice(0, 3);
    const msg = sorted.map((u, i) => `${i+1}) ${u[0]} - ${u[1].coins}`).join(', ');
    client.say(channel, `🏆 Top moedas: ${msg}`);
  }
  // ... outros handlers
};
```

### 2. Implementar Variáveis Dinâmicas
Expandir o sistema de variáveis para suportar:
- `{inventory}` - Total de jogos
- `{nextlevel}` - XP para próximo nível
- `{progress}` - Progresso percentual
- `{sss}`, `{ss}`, `{s}`, etc - Contagem por raridade
- `{topuser}`, `{richestuser}` - Rankings
- `{uptime}`, `{time}`, `{date}` - Tempo

### 3. UI do Dashboard
Atualizar `index.html` para:
- Mostrar badge "CORE" em comandos core
- Desabilitar botão "Deletar" para comandos core
- Adicionar tooltip explicando que são comandos do sistema

### 4. Documentação
Criar guia para usuários explicando:
- Quais comandos são core
- Por que não podem ser deletados
- Como customizar cooldown/enabled
- Como adicionar comandos customizados

---

## ✅ Status Atual

```
✅ Core commands definidos (22 comandos)
✅ Sistema de proteção implementado
✅ Inicialização automática no startup
✅ Proteção no reset database
✅ Proteção contra deleção via API
✅ Merge inteligente com customizações
⚠️ Handlers dos comandos (próximo passo)
⚠️ Variáveis dinâmicas expandidas (próximo passo)
⚠️ UI do dashboard atualizada (próximo passo)
```

---

## 🎉 Conclusão

O sistema de comandos core está **100% implementado e protegido**!

**Garantias**:
- ✅ Comandos core **nunca serão deletados**
- ✅ Reset database **preserva comandos core**
- ✅ Usuários **não podem remover** comandos core
- ✅ Comandos core **sempre existem** no sistema
- ✅ Customizações de `enabled` e `cooldown` **são preservadas**

**O GameBox agora tem uma base sólida de comandos que sempre estarão disponíveis!** 🚀
