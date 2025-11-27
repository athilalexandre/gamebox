# 🎮 GameBox - Twitch Collector Bot

Um bot de Twitch divertido onde seus espectadores ganham moedas e colecionam jogos retrô e modernos abrindo caixas (Loot Boxes).

## ✨ Funcionalidades

- **Sistema de Economia:** Espectadores ganham moedas por mensagens.
- **Loot Boxes:** Compre e abra caixas para ganhar jogos com raridades diferentes (E a SSS).
- **Coleção:** Mais de 50 jogos icônicos para colecionar.
- **Dashboard Web:** Interface moderna para controlar o bot e gerenciar dados.
- **Zero Instalação:** Não precisa de banco de dados, tudo salvo em arquivos locais.

## 🚀 Como Usar

### 1. Instalação
Certifique-se de ter o [Node.js](https://nodejs.org/) instalado.

```bash
# Instale as dependências
npm install
```

### 2. Configuração
Você pode configurar tudo pelo Dashboard depois de iniciar, mas precisará de:
1. **Nome do Bot:** O usuário da Twitch do seu bot.
2. **Token OAuth:** Gere um token em [twitchapps.com/tmi](https://twitchapps.com/tmi/).
3. **Canal:** O nome do seu canal onde o bot vai entrar.

### 3. Rodando
```bash
npm start
```
Acesse o dashboard em: **http://localhost:3000**

## 🤖 Comandos do Chat

### Para Espectadores
- `!balance` - Mostra seu saldo de moedas e caixas.
- `!buybox [qtd]` - Compra caixas (Ex: `!buybox 5`).
- `!openbox` - Abre uma caixa e ganha um jogo aleatório.
- `!inventory` - Mostra resumo da sua coleção.
- `!help` - Lista os comandos.

### Para Admin (Streamer)
- `!givecoins <user> <amount>` - Dá moedas para um usuário.
- `!givebox <user> <amount>` - Dá caixas para um usuário.
- `!resetuser <user>` - Reseta o inventário de um usuário.

## 🛠️ Personalização
Você pode editar os jogos diretamente no arquivo `data/games.json` ou usar o Dashboard para adicionar novos jogos.

## 📂 Estrutura de Dados
Todos os dados são salvos na pasta `data/`:
- `users.json`: Saldo e inventário dos usuários.
- `games.json`: Catálogo de jogos.
- `config.json`: Configurações do bot.

---
Desenvolvido com ❤️ por Athila Alexandre
