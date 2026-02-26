# Guia de Deploy - Hostinger

## Pré-requisitos na Hostinger

1. **Plano necessário**: Business ou superior (para Node.js)
2. **Acesso**: cPanel e MySQL Database

## Passo a Passo

### 1. Configurar MySQL

1. Acesse o cPanel da Hostinger
2. Vá em "MySQL Databases"
3. Crie um novo database: `precompeonato`
4. Crie um usuário MySQL e anote as credenciais
5. Adicione o usuário ao database com todas as permissões

### 2. Preparar Arquivos

1. Faça upload de todos os arquivos via FTP ou File Manager:
   - Todos os arquivos `.js`
   - `package.json`
   - `.env` (configurado)
   - Arquivos HTML e CSS
   - `.htaccess`

### 3. Configurar .env

Edite o arquivo `.env` com as credenciais do MySQL:

```env
DB_HOST=localhost
DB_USER=seu_usuario_mysql
DB_PASSWORD=sua_senha_mysql
DB_NAME=precompeonato
DB_PORT=3306
PORT=3000
NODE_ENV=production
```

### 4. Instalar Dependências

Via SSH (se disponível):
```bash
cd /home/seu_usuario/public_html
npm install
```

Ou via cPanel > Terminal

### 5. Configurar Database

Execute o script de setup:
```bash
npm run setup-db
```

Isso criará todas as tabelas necessárias.

### 6. Iniciar Aplicação

#### Opção A: Node.js Selector (Hostinger)
1. No cPanel, vá em "Node.js Selector"
2. Selecione a versão do Node.js (14+)
3. Defina o diretório da aplicação
4. Application startup file: `server.js`
5. Clique em "Start"

#### Opção B: PM2 (via SSH)
```bash
npm install -g pm2
pm2 start server.js --name precompeonato
pm2 save
pm2 startup
```

### 7. Configurar Domínio

1. No cPanel, vá em "Domains"
2. Configure `precompeonato.com.br` para apontar para a pasta da aplicação
3. Se usar subdomínio, crie um apontamento

### 8. Testar

Acesse: `https://precompeonato.com.br/api/health`

Deve retornar: `{"status":"ok","database":"connected"}`

## Gerenciar Emails Permitidos

Via MySQL (phpMyAdmin no cPanel):

```sql
-- Adicionar email
INSERT INTO emails_permitidos (email) VALUES ('novo@email.com');

-- Listar emails
SELECT * FROM emails_permitidos;

-- Desativar email
UPDATE emails_permitidos SET ativo = FALSE WHERE email = 'email@exemplo.com';
```

## Gerenciar Precons

```sql
-- Adicionar precon
INSERT INTO precons (nome, set_nome, comandante, cores, ano) 
VALUES ('Nome do Deck', 'Set', 'Comandante', 'WU', 2024);

-- Banir precon
UPDATE precons SET banido = TRUE WHERE id = 1;

-- Listar todos
SELECT * FROM precons ORDER BY ano DESC;
```

## Backup

### Backup do Database
No cPanel > phpMyAdmin:
1. Selecione o database `precompeonato`
2. Clique em "Export"
3. Escolha "Quick" e "SQL"
4. Clique em "Go"

### Backup Automático
Configure no cPanel > Backup Wizard

## Troubleshooting

### Erro de conexão com database
- Verifique as credenciais no `.env`
- Confirme que o usuário tem permissões no database
- Teste a conexão via phpMyAdmin

### Aplicação não inicia
- Verifique os logs: `pm2 logs` ou no cPanel
- Confirme que todas as dependências foram instaladas
- Verifique se a porta está disponível

### Erro 500
- Verifique permissões dos arquivos (644 para arquivos, 755 para pastas)
- Confira os logs de erro do servidor

## Manutenção

### Ver logs
```bash
pm2 logs precompeonato
```

### Reiniciar aplicação
```bash
pm2 restart precompeonato
```

### Atualizar código
```bash
git pull  # se usar git
pm2 restart precompeonato
```

## Segurança

1. Nunca commite o arquivo `.env`
2. Use senhas fortes para o MySQL
3. Mantenha o Node.js atualizado
4. Configure SSL/HTTPS (Let's Encrypt gratuito na Hostinger)
5. Faça backups regulares

## Suporte

- Documentação Hostinger: https://support.hostinger.com
- Node.js na Hostinger: https://support.hostinger.com/en/articles/5617825-how-to-set-up-a-node-js-application
