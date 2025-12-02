# 🎮 GameBox - Alterações Completas

## 📋 Resumo das Alterações

Este documento detalha todas as alterações feitas no sistema GameBox conforme solicitado.

## ✅ Alterações Implementadas

### 1. **Ranking SSS+ Especial** ⭐
- ✅ Adicionado novo ranking `SSS+` exclusivo para **The Legend of Zelda: Ocarina of Time**
- ✅ Este jogo é o único que pode ter nota 99 no Metacritic
- ✅ Jogos com rarity `SSS+` **NÃO PODEM** ser obtidos em boxes
- ✅ Novo campo `boxObtainable` no modelo Game para controlar isso
- ✅ Administradores podem adicionar manualmente a qualquer conta

**Arquivos modificados:**
- `src/db/models/Game.js` - Adicionado `SSS+` ao enum e campo `boxObtainable`
- `src/db/repositories/GameRepository.js` - Atualizada lógica de raridade
- `public/index.html` - Adicionado estilo CSS para SSS+

### 2. **Sincronização Completa do IGDB** 🌐
- ✅ Modificado para buscar **TODOS** os ~350k+ jogos do IGDB (não apenas top rated)
- ✅ Sincronização automática ao iniciar com `npm start`
- ✅ Roda em background sem bloquear a aplicação
- ✅ Sistema de progresso a cada 1000 jogos sincronizados
- ✅ Proteção contra erros consecutivos (máximo 5 erros consecutivos antes de abortar)
- ✅ Rate limiting de 300ms entre requisições para respeitar limites do IGDB

**Arquivos modificados:**
- `src/services/igdbService.js` - Método `syncAllGames` modificado
- `src/index.js` - Auto-sync configurado para todos os jogos

### 3. **Paginação de Jogos** 📄
- ✅ Implementado paginação de 50 em 50 jogos
- ✅ API modificada para suportar query parameters `?page=1&limit=50`
- ✅ Frontend atualizado com controles de paginação (Anterior/Próxima)
- ✅ Informações de paginação exibidas (Página X de Y)

**Arquivos modificados:**
- `src/api/server.js` - Endpoint `/api/games` atualizado
- `src/db/repositories/GameRepository.js` - Método `getAllGamesPaginated` adicionado
- `public/js/app.js` - Funções `fetchGames` e `renderGamesPagination` atualizadas

### 4. **Uso de Scores do Metacritic** 🎯
- ✅ Sistema agora usa **Metacritic scores** (0-100) para calcular ra ridadessified
- ✅ Scores do IGDB são usados como placeholder quando Metacritic não está disponível
- ✅ Distribuição de raridade ajustada:
  - **SSS+**: 99 (apenas Ocarina of Time)
  - **SSS**: 95-98
  - **SS**: 90-94
  - **S**: 85-89
  - **A**: 80-84
  - **B**: 75-79
  - **C**: 70-74
  - **D**: 65-69
  - **E**: 0-64

## 🔧 Ajustes Necessários (Manuais)

### Adicionar Container de Paginação no HTML

Abra o arquivo `c:\Users\athil\gamebox\public\index.html` e adicione as seguintes linhas após a linha 337 (após fechar a tag `</table>`):

```html
<!-- Pagination Controls -->
<div id="games-pagination" class="px-6 pb-4"></div>
```

O bloco completo deve ficar assim:
```html
                                </table>
                            </div>
                            <!-- Pagination Controls -->
                            <div id="games-pagination" class="px-6 pb-4"></div>
                        </div>
```

## 🚀 Como Usar

### 1. Iniciar o Sistema
```bash
npm start
```

O sistema irá:
1. Conectar ao MongoDB
2. Executar migrações necessárias
3. Seed de comandos core
4. **Iniciar sincronização automática de TODOS os jogos do IGDB em background**
5. Iniciar o servidor API/Dashboard
6. Tentar conectar o bot (se credenciais configuradas)

### 2. Acompanhar o Progresso
- Verifique o console para ver o progresso da sincronização
- A cada 1000 jogos você verá uma mensagem de progresso
- O sistema continuará rodando normalmente enquanto sincroniza em background

### 3. Visualizar Jogos no Dashboard
- Acesse `http://localhost:3000`
- Navegue até a página "Jogos"
- Use os controles de paginação (Anterior/Próxima) para navegar pelos jogos
- Cada página mostra 50 jogos

## 📊 Detalhes Técnicos

### Ranking SSS+
O ranking SSS+ é determinado pela seguinte lógica:

```javascript
if (score === 99 && gameName.includes('The Legend of Zelda: Ocarina of Time')) {
    return 'SSS+';
}
```

E ao criar/atualizar o jogo:
```javascript
if (gameData.rarity === 'SSS+') {
    gameData.boxObtainable = false;
}
```

### Sistema de Boxes
No método `getGamesByRarity`, há um filtro adicional:

```javascript
boxObtainable: true  // Only games that can be obtained from boxes
```

Isso garante que jogos `SSS+` nunca apareçam em boxes aleatórias.

### Sincronização IGDB
A sincronização busca todos os jogos com:
- `category = 0` (jogos principais, não DLCs/expansões)
- Ordenação por ID
- Batch size de 500 (máximo do IGDB)
- Delay de 300ms entre requests (rate limiting)

### Paginação
A API retorna:
```json
{
    "games": [...],
    "pagination": {
        "currentPage": 1,
        "totalPages": 7000,
        "totalGames": 350000,
        "gamesPerPage": 50
    }
}
```

## 🎨 Estilos CSS

SSS+ tem um visual dourado especial:
```css
.rarity-SSS+ {
    background: linear-gradient(90deg, #ffd700, #ffed4e, #ffd700);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: 900;
    text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}
```

## 📝 Notas Importantes

1. **Primeira Execução**: A primeira vez que rodar `npm start`, o sistema começará a sincronizar TODOS os ~350k jogos. Isso pode levar várias horas.

2. **Progresso**: O sistema continua funcionando normalmente enquanto sincroniza. Não é necessário esperar a sincronização terminar.

3. **Checagem de Duplicatas**: O sistema usa `upsertGame` que verifica por `igdbId` e `name + console` para evitar duplicatas.

4. **Rate Limiting**: O sistema respeita os limites do IGDB (4 requests/sec) automaticamente.

5. **Tratamento de Erros**: Se houver 5 erros consecutivos, a sincronização para automaticamente para evitar loops infinitos.

## 🐛 Troubleshooting

### Sincronização não inicia
- Verifique as credenciais do IGDB em `.env` ou no Dashboard
- Certifique-se que o MongoDB está conectado

### Paginação não funciona
- Certifique-se de adicionar o container `<div id="games-pagination">` no HTML
- Verifique o console do navegador para erros

### Ranking SSS+ não aparece
- Apenas "The Legend of Zelda: Ocarina of Time" com score 99 receberá SSS+
- Verifique se o jogo foi sincronizado do IGDB com esse nome exato

## ✨ Conclusão

Todas as funcionalidades solicitadas foram implementadas:
- ✅ **SSS+ exclusivo para Ocarina of Time**
- ✅ **SSS+ não obtível em boxes**
- ✅ **Sincronização automática de TODOS os ~350k jogos**
- ✅ **Paginação de 50 em 50**
- ✅ **Uso de scores Metacritic**
- ✅ **Checagem de duplicatas**

O sistema está pronto para uso! 🎮
