# Configuração de Email para Autenticação

## Problema Atual
O sistema de autenticação por email não está funcionando porque as variáveis de ambiente de email não estão configuradas no servidor VPS.

## Solução: Configurar Gmail com Senha de App

### Passo 1: Criar Senha de App no Gmail

1. Acesse sua conta Google: https://myaccount.google.com/
2. Vá em "Segurança" no menu lateral
3. Ative a "Verificação em duas etapas" (se ainda não estiver ativa)
4. Depois de ativar, volte em "Segurança"
5. Procure por "Senhas de app" (aparece após ativar 2FA)
6. Selecione:
   - App: "Email"
   - Dispositivo: "Outro (nome personalizado)" → digite "Precompeonato VPS"
7. Clique em "Gerar"
8. **COPIE A SENHA DE 16 CARACTERES** (sem espaços)

### Passo 2: Configurar no VPS

```bash
# SSH no servidor
ssh root@187.77.228.122

# Editar arquivo .env
cd /var/www/precompeonato
nano .env
```

### Passo 3: Adicionar as Variáveis de Email

Adicione estas linhas no arquivo `.env`:

```env
# Configurações de Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu_email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_FROM=Precompeonato <noreply@precompeonato.com.br>
```

**Substitua:**
- `seu_email@gmail.com` → seu email do Gmail
- `xxxx xxxx xxxx xxxx` → a senha de app de 16 caracteres (pode deixar com espaços ou sem)

### Passo 4: Reiniciar o Servidor

```bash
# Reiniciar PM2
pm2 restart precompeonato

# Verificar logs
pm2 logs precompeonato --lines 50
```

Você deve ver a mensagem: `✉️  Email configurado`

### Passo 5: Testar

1. Acesse: https://precompeonato.com.br/login.html
2. Digite seu email
3. Clique em "Enviar Código"
4. Verifique sua caixa de entrada (e spam)

## Alternativa: Usar Outro Provedor de Email

Se não quiser usar Gmail, pode usar outros provedores:

### SendGrid (Recomendado para produção)
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=SG.sua_api_key_aqui
```

### Mailgun
```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@seu-dominio.mailgun.org
EMAIL_PASSWORD=sua_senha_mailgun
```

### Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=seu_email@outlook.com
EMAIL_PASSWORD=sua_senha
```

## Verificar se Está Funcionando

```bash
# Ver logs em tempo real
pm2 logs precompeonato

# Verificar status
pm2 status

# Ver últimas 100 linhas de log
pm2 logs precompeonato --lines 100
```

## Troubleshooting

### Erro: "Invalid login"
- Verifique se a senha de app está correta
- Certifique-se que a verificação em 2 etapas está ativa
- Tente gerar uma nova senha de app

### Erro: "Connection timeout"
- Verifique se a porta 587 está aberta no firewall
- Tente usar porta 465 com `secure: true`

### Email não chega
- Verifique a pasta de spam
- Verifique se o EMAIL_FROM está correto
- Veja os logs do servidor: `pm2 logs precompeonato`

## Comandos Úteis

```bash
# Ver variáveis de ambiente carregadas
pm2 env 0

# Reiniciar com logs
pm2 restart precompeonato && pm2 logs precompeonato

# Parar e iniciar novamente
pm2 stop precompeonato
pm2 start precompeonato
pm2 logs precompeonato
```
