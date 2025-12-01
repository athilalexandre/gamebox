# Instruções para Adicionar Botão de Reset e Avisos

## 1. Adicionar Botão de Reset no HTML

Abra `public/index.html` e adicione este bloco ANTES do botão "Salvar Configurações" (procure por `btn-save-settings`):

```html
<div class="card" style="grid-column: span 3; border: 2px solid #ff5555;">
    <h3 style="color: #ff5555;">⚠️ Zona de Perigo</h3>
    <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 15px;">
        Ações irreversíveis que resetam todos os dados do sistema.
    </p>
    
    <div style="background: rgba(255, 85, 85, 0.1); padding: 15px; border-radius: 8px; border: 1px solid rgba(255, 85, 85, 0.3);">
        <h4 style="margin-top: 0; color: #ff5555;">🗑️ Resetar Banco de Dados</h4>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 10px;">
            Esta ação irá <strong>deletar permanentemente</strong>:
        </p>
        <ul style="font-size: 0.85rem; color: var(--text-muted); margin-left: 20px; margin-bottom: 15px;">
            <li>Todos os usuários e seus inventários</li>
            <li>Todos os jogos cadastrados</li>
            <li>Todos os comandos customizados</li>
            <li>Histórico de XP e níveis</li>
        </ul>
        <button class="btn danger" id="btn-reset-database" style="width: 100%;">
            <i class="fa-solid fa-triangle-exclamation"></i> Resetar Tudo
        </button>
    </div>
</div>
```

## 2. Adicionar JavaScript no app.js

Abra `public/js/app.js` e adicione estas funções no final do arquivo (antes do `init()`):

```javascript
// Reset Database
async function resetDatabase() {
    const confirmation1 = confirm('⚠️ ATENÇÃO! Esta ação irá DELETAR PERMANENTEMENTE todos os dados:\n\n• Todos os usuários\n• Todos os jogos\n• Todos os comandos customizados\n• Todo o histórico\n\nTem CERTEZA que deseja continuar?');
    
    if (!confirmation1) return;
    
    const confirmation2 = confirm('🚨 ÚLTIMA CHANCE!\n\nEsta ação é IRREVERSÍVEL!\n\nTodos os dados serão perdidos para sempre.\n\nDigite OK para confirmar.');
    
    if (!confirmation2) return;
    
    const confirmation3 = prompt('Digite "RESETAR TUDO" (sem aspas) para confirmar:');
    
    if (confirmation3 !== 'RESETAR TUDO') {
        alert('❌ Ação cancelada. Texto não corresponde.');
        return;
    }
    
    const btn = document.getElementById('btn-reset-database');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resetando...';
    btn.disabled = true;
    
    try {
        const res = await fetch(`${API_URL}/reset-database`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await res.json();
        
        if (data.success) {
            alert('✅ Banco de dados resetado com sucesso!\n\nTodos os dados foram apagados.\n\nA página será recarregada.');
            window.location.reload();
        } else {
            alert('❌ Erro ao resetar: ' + (data.error || 'Erro desconhecido'));
        }
    } catch (err) {
        console.error(err);
        alert('❌ Erro ao resetar banco de dados: ' + err.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
```

E adicione este event listener dentro da função `setupEventListeners()`:

```javascript
// Reset Database Button
const btnResetDatabase = document.getElementById('btn-reset-database');
if (btnResetDatabase) {
    btnResetDatabase.addEventListener('click', resetDatabase);
}
```

## 3. Adicionar Aviso ao Salvar Configurações

Encontre a função que salva as configurações (procure por `btn-save-settings`) e SUBSTITUA o `alert('Configurações salvas!')` por:

```javascript
alert('✅ Configurações salvas com sucesso!\n\nAs alterações foram aplicadas.');
```

E ADICIONE antes do `alert` de erro:

```javascript
alert('❌ Erro ao salvar configurações.\n\nVerifique os dados e tente novamente.');
```

## 4. Backend já está pronto!

A rota `/api/reset-database` já foi criada no servidor e está funcionando.

## Testando

1. Reinicie o servidor (`npm start`)
2. Acesse as Configurações no dashboard
3. Role até o final e veja a "Zona de Perigo"
4. Teste o botão de reset (CUIDADO: vai apagar tudo!)
5. Teste salvar configurações e veja os avisos

## Avisos de Segurança

O botão de reset tem 3 níveis de confirmação:
1. Primeiro confirm com lista do que será deletado
2. Segundo confirm de última chance
3. Prompt pedindo para digitar "RESETAR TUDO"

Isso evita cliques acidentais!
