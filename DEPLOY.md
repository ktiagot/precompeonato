# 🚀 Deploy do Precompeonato

## Deploy Rápido

```bash
npm run deploy
git add .
git commit -m "Deploy com atualizações"
git push
```

No servidor:
```bash
git pull
pm2 restart precompeonato
```

## O que o `npm run deploy` faz?

1. ✅ Gera hashes MD5 de todos os arquivos JS/CSS
2. ✅ Salva em `versions.json`
3. ✅ Mostra próximos passos

## Como Funciona o Cache Busting Automático?

### No Servidor
- Middleware intercepta requisições HTML
- Injeta versões automaticamente: `app.js` → `app.js?v=16b54063`
- Hash muda apenas quando arquivo muda

### No Cliente
- Navegador vê nova versão do arquivo
- Baixa automaticamente quando hash é diferente
- Mantém cache quando hash é o mesmo (performance)

## Vantagens

✅ **Automático**: Não precisa editar HTMLs manualmente  
✅ **Inteligente**: Versão muda apenas quando arquivo muda  
✅ **Performance**: Arquivos não modificados continuam em cache  
✅ **Simples**: Um comando antes do deploy  

## Comandos Úteis

```bash
# Gerar versões
npm run version

# Deploy completo
npm run deploy

# Desenvolvimento local
npm run dev
```

## Arquivos Importantes

- `auto-version.js` - Gera hashes
- `version-middleware.js` - Injeta versões
- `versions.json` - Hashes dos arquivos (gerado)
- `deploy.js` - Script de deploy

## Troubleshooting

**Usuário não vê atualização?**
1. Peça para fazer Ctrl+F5
2. Verifique se `versions.json` foi gerado
3. Verifique se servidor foi reiniciado

**Versões não estão sendo injetadas?**
1. Verifique se `version-middleware.js` está importado no `server.js`
2. Verifique se `versions.json` existe
3. Reinicie o servidor

**Banner não aparece?**
1. Sistema de banner foi removido
2. Usuários devem fazer Ctrl+F5 manualmente
3. Versões automáticas garantem atualização quando necessário
