# Casos de Teste - GameBox

## 1. Sistema de Recompensa Diária (!daily)

### Cenário 1: Primeiro Resgate
- **Ação:** Usuário digita `!daily`.
- **Resultado Esperado:** O bot responde com uma mensagem de sucesso indicando o prêmio recebido (Coins, Caixa ou Jogo).
- **Verificação:** Verifique se o saldo de coins, caixas ou inventário do usuário aumentou.

### Cenário 2: Cooldown
- **Ação:** Usuário digita `!daily` novamente logo após o primeiro resgate.
- **Resultado Esperado:** O bot responde informando que o comando está em cooldown e quanto tempo falta.

### Cenário 3: Probabilidades (Teste de Longa Duração)
- **Ação:** Executar `!daily` várias vezes (simulando dias ou alterando o banco de dados).
- **Resultado Esperado:** A maioria das recompensas deve ser Coins (90%), seguido de Caixas (5%) e Jogos (5%).

---

## 2. Sistema de Trocas (!trade)

### Cenário 1: Iniciar Troca Válida
- **Pré-requisitos:** Usuário A tem "Jogo A" e 100 coins. Usuário B tem "Jogo B" e 100 coins. Configuração de custo = 50.
- **Ação:** Usuário A digita `!trade @UsuarioB Jogo A | Jogo B`.
- **Resultado Esperado:** O bot envia uma mensagem no chat marcando o Usuário B, descrevendo a troca e pedindo confirmação (`!sim` ou `!nao`).

### Cenário 2: Aceitar Troca (!sim)
- **Ação:** Usuário B digita `!sim` após receber a solicitação.
- **Resultado Esperado:**
    - Mensagem de sucesso no chat.
    - Usuário A perde "Jogo A" e ganha "Jogo B".
    - Usuário B perde "Jogo B" e ganha "Jogo A".
    - Ambos os usuários têm o custo da troca (50 coins) deduzido.
    - A troca aparece na aba "Trocas" do Dashboard.

### Cenário 3: Rejeitar Troca (!nao)
- **Ação:** Usuário B digita `!nao` após receber a solicitação.
- **Resultado Esperado:** Mensagem de troca recusada. Nenhuma alteração nos inventários ou saldos.

### Cenário 4: Falta de Recursos
- **Ação:** Tentar trocar sem ter coins suficientes ou sem ter o jogo especificado.
- **Resultado Esperado:** O bot deve negar o início da troca com uma mensagem de erro explicativa.

### Cenário 5: Troca Inválida (Auto-troca)
- **Ação:** Usuário tenta trocar consigo mesmo.
- **Resultado Esperado:** Mensagem de erro.

---

## 3. Inventário (!inventory)

### Cenário 1: Visualização Simplificada
- **Ação:** Usuário digita `!inventory`.
- **Resultado Esperado:** O bot envia **apenas uma mensagem** contendo o total de jogos e um resumo das raridades (ex: `SSS:0 | S:1 | ...`). Não deve haver lista detalhada de jogos floodando o chat.
