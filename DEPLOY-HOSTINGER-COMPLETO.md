# 🚀 Deploy Completo do Zero na Hostinger

Guia passo a passo para deploy limpo do Precompeonato na Hostinger.

---

## 1️⃣ Limpar Tudo na Hostinger

1. **Deletar a aplicação Node.js atual:**
   - Vá em "Websites" > "GitHub"
   - Delete a aplicação existente

2. **Deletar o banco de dados (opcional, mas recomendado):**
   - Vá em "Databases" > "MySQL Databases"
   - Delete o banco `u394631272_precompeonato` e usuário `u394631272_management`

---

## 2️⃣ Criar Banco de Dados MySQL

1. **Vá em "Databases" > "MySQL Databases"**

2. **Clique em "Create a New MySQL Database And Database User"**

3. **Preencha:**
   - Database name: `precompeonato` (vai ficar `u394631272_precompeonato`)
   - Username: `precomp_app` (vai ficar `u394631272_precomp_app`)
   - Password: Gere uma senha forte (ex: `Precomp2026!@#Node`)
   - **⚠️ ANOTE ESSAS CREDENCIAIS!**

4. **Clique em "Create"**

5. **Acesse phpMyAdmin** (botão "Enter phpMyAdmin")

6. **Selecione o banco `u394631272_precompeonato`**

7. **Vá na aba "SQL" e execute os scripts de criação:**

```sql
-- Execute o conteúdo do arquivo: data/dados-auth-system.sql
-- Isso vai criar todas as tabelas necessárias
```

**Opcional - Adicionar dados de exemplo:**

```sql
-- Precons (lista completa)
-- Execute o conteúdo de: data/precons-data.sql

-- Emails permitidos
INSERT INTO emails_permitidos (email) VALUES 
('seu@email.com'),
('outro@email.com');

-- Admins
INSERT INTO admins (email, nome) VALUES 
('admin@precompeonato.com.br', 'Admin');
```

---

## 3️⃣ Criar Aplicação Node.js

1. **Vá em "Websites" > "Create Website"**

2. **Escolha "Node.js Application"**

3. **Configure:**
   - **GitHub Repository:** Conecte seu repositório `precompeonato`
   - **Branch:** `master`
   - **Root directory:** `/` (deixe vazio ou apenas barra)
   - **Entry file:** `server.js`
   - **Node version:** `22.x`
   - **Package manager:** `npm`
   - **Framework preset:** `Express`

4. **Clique em "Create"**

5. **Aguarde a aplicação ser criada**

---

## 4️⃣ Configurar Variáveis de Ambiente

1. **Na página da aplicação Node.js, vá em "Settings and redeploy"**

2. **Role até "Environment Variables"**

3. **Adicione TODAS estas variáveis (uma por uma):**

```
Key: DB_HOST
Value: localhost

Key: DB_USER
Value: u394631272_precomp_app

Key: DB_PASSWORD
Value: [senha que você criou no passo 2]

Key: DB_NAME
Value: u394631272_precompeonato

Key: DB_PORT
Value: 3306

Key: NODE_ENV
Value: production

Key: EMAIL_HOST
Value: smtp.hostinger.com

Key: EMAIL_PORT
Value: 587

Key: EMAIL_USER
Value: noreply@precompeonato.com.br

Key: EMAIL_PASSWORD
Value: [senha do email - criar no passo 5]

Key: EMAIL_FROM
Value: Precompeonato <noreply@precompeonato.com.br>
```

4. **Clique em "Save" ou "Update & Deploy"**

---

## 5️⃣ Criar Email (para autenticação)

1. **Vá em "Emails"**

2. **Clique em "Create Email Account"**

3. **Crie:**
   - Email: `noreply@precompeonato.com.br`
   - Password: Senha forte (ex: `EmailPrecomp2026!`)
   - **⚠️ ANOTE A SENHA!**

4. **Volte para as variáveis de ambiente e atualize:**
   - `EMAIL_PASSWORD` = [senha que você acabou de criar]

5. **Clique em "Update & Deploy"**

---

## 6️⃣ Configurar DNS

1. **Vá em "Domains" > precompeonato.com.br > "DNS/Nameservers"**

2. **Verifique o IP do servidor:**
   - Vá em "Websites" > precompeonato.com.br
   - Procure por "Website IP address" ou "Access your website at"
   - Anote o IP (ex: `217.21.77.117`)

3. **Configure os registros DNS:**

**Se tiver CDN ativado, DESATIVE PRIMEIRO:**
   - Procure por "CDN" nas configurações do domínio
   - Desative o toggle

**Adicione/edite os registros:**

```
Type: A
Name: @
Content: [IP do servidor]
TTL: 300

Type: A
Name: www
Content: [IP do servidor]
TTL: 300
```

4. **Delete ou desative o registro ALIAS se existir**

5. **Aguarde 10-30 minutos para propagação do DNS**

---

## 7️⃣ Configurar SSL

1. **Vá em "Websites" > precompeonato.com.br > "SSL"**

2. **Ative o SSL gratuito (Let's Encrypt)**

3. **Aguarde 5-10 minutos para o certificado ser emitido**

4. **Status deve mudar para "Active" (verde)**

---

## 8️⃣ Aguardar Deploy

1. **Vá em "Websites" > "GitHub" > sua aplicação**

2. **Verifique o status do deploy:**
   - Deve aparecer "Completed" (verde)
   - Se aparecer erro, clique para ver os logs

3. **Aguarde 2-5 minutos para o primeiro deploy**

---

## 9️⃣ Testar a Aplicação

### Teste 1: URL de Preview

1. **Encontre a URL de preview:**
   - Vá em "Websites" > precompeonato.com.br
   - Procure por "Preview your site at"
   - Exemplo: `https://lawngreen-wallaby-914080.hostingersite.com`

2. **Teste o health check:**
   ```
   https://[sua-url-preview].hostingersite.com/api/health
   ```

3. **Deve retornar algo como:**
   ```json
   {
     "status": "ok",
     "database": "connected",
     "env": {
       "hasDbHost": true,
       "hasDbUser": true,
       "hasDbName": true,
       "hasEmail": true
     }
   }
   ```

4. **Se der erro, verifique:**
   - Variáveis de ambiente estão corretas?
   - Banco de dados foi criado?
   - Tabelas foram criadas no banco?

### Teste 2: Domínio Principal

1. **Teste com HTTP primeiro (enquanto SSL não ativa):**
   ```
   http://precompeonato.com.br/api/health
   ```

2. **Depois que SSL ativar, teste com HTTPS:**
   ```
   https://precompeonato.com.br/api/health
   ```

3. **Teste a página principal:**
   ```
   https://precompeonato.com.br/
   ```

4. **Teste o admin:**
   ```
   https://precompeonato.com.br/admin.html
   ```

---

## 🔟 Popular Banco de Dados (Opcional)

Se quiser adicionar mais dados de exemplo:

### Via phpMyAdmin:

```sql
-- Adicionar mais emails permitidos
INSERT INTO emails_permitidos (email) VALUES 
('jogador1@email.com'),
('jogador2@email.com'),
('jogador3@email.com');

-- Adicionar mais admins
INSERT INTO admins (email, nome) VALUES 
('admin2@precompeonato.com.br', 'Admin 2');

-- Criar um campeonato de exemplo
INSERT INTO campeonatos (nome, edicao, data_inicio, descricao, status) VALUES 
('Precompeonato Cowabunga', 'Etapa #1 2026', '2026-03-11', 'Primeiro campeonato de teste', 'inscricoes');
```

---

## ✅ Checklist Final

Marque conforme for completando:

- [ ] Banco de dados criado (`u394631272_precompeonato`)
- [ ] Usuário MySQL criado (`u394631272_precomp_app`)
- [ ] Tabelas criadas via SQL (dados-auth-system.sql)
- [ ] Aplicação Node.js criada e conectada ao GitHub
- [ ] Entry file configurado como `server.js`
- [ ] Node version 22.x selecionada
- [ ] Todas as 11 variáveis de ambiente configuradas
- [ ] Email `noreply@precompeonato.com.br` criado
- [ ] DNS configurado (registros A para @ e www)
- [ ] CDN desativado
- [ ] SSL ativado e status "Active"
- [ ] Deploy completado com sucesso (status "Completed")
- [ ] `/api/health` retorna `{"status":"ok","database":"connected"}`
- [ ] Site carrega normalmente em `https://precompeonato.com.br/`
- [ ] Admin carrega em `https://precompeonato.com.br/admin.html`

---

## 🆘 Troubleshooting

### Erro: "Access denied for user"

**Problema:** Credenciais do banco incorretas

**Solução:**
1. Verifique as variáveis `DB_USER`, `DB_PASSWORD`, `DB_NAME`
2. Certifique-se que o usuário foi criado corretamente
3. Tente `DB_HOST = 127.0.0.1` ao invés de `localhost`

### Erro: 503 Service Unavailable

**Problema:** Aplicação não está rodando

**Solução:**
1. Aguarde o deploy completar (pode levar alguns minutos)
2. Verifique se há erros no deploy (clique no deploy para ver logs)
3. Teste a URL de preview primeiro
4. Verifique se todas as variáveis de ambiente estão configuradas

### Erro: DNS não resolve

**Problema:** DNS ainda não propagou

**Solução:**
1. Aguarde até 48h para propagação completa
2. Use a URL de preview enquanto isso
3. Verifique se os registros A estão corretos
4. Certifique-se que o CDN está desativado

### Erro: "Cannot add A record when CDN is enabled"

**Problema:** CDN está bloqueando configuração de DNS

**Solução:**
1. Vá em configurações do domínio
2. Procure por "CDN" ou "Performance"
3. Desative o CDN
4. Aguarde alguns minutos
5. Tente adicionar os registros A novamente

### Site carrega mas banco não conecta

**Problema:** Variáveis de ambiente não estão sendo lidas

**Solução:**
1. Verifique se salvou as variáveis corretamente
2. Faça um "Redeploy" manual
3. Teste `/api/health` para ver quais variáveis estão faltando
4. Certifique-se que não tem espaços extras nos valores

### Email não envia

**Problema:** Credenciais de email incorretas ou SMTP bloqueado

**Solução:**
1. Verifique `EMAIL_USER` e `EMAIL_PASSWORD`
2. Certifique-se que o email foi criado na Hostinger
3. Teste com outro provedor de email se necessário
4. Verifique se a porta 587 está aberta

---

## 📝 Credenciais para Anotar

**Banco de Dados:**
- Host: `localhost`
- Database: `u394631272_precompeonato`
- User: `u394631272_precomp_app`
- Password: `___________________________`

**Email:**
- Email: `noreply@precompeonato.com.br`
- Password: `___________________________`

**URLs:**
- Preview: `https://_____________________________.hostingersite.com`
- Produção: `https://precompeonato.com.br`
- Admin: `https://precompeonato.com.br/admin.html`

**IP do Servidor:**
- IP: `___________________________`

---

## 🎯 Próximos Passos Após Deploy

1. **Adicionar emails permitidos** via phpMyAdmin
2. **Adicionar admins** via phpMyAdmin
3. **Criar primeiro campeonato** via admin
4. **Testar fluxo completo:**
   - Inscrição de jogador
   - Login de admin
   - Criação de rodadas
   - Registro de resultados
5. **Configurar backup automático** do banco de dados

---

**Boa sorte com o deploy! 🚀**

Se tiver qualquer problema, volte aqui e me avise em qual passo travou.
