# 🚀 Guia Completo - Deploy na Hostinger

## Passo 1: Criar Database MySQL

### 1.1 Acessar cPanel
1. Faça login na Hostinger (hpanel.hostinger.com)
2. Vá em **Websites** → Selecione seu site
3. Clique em **Avançado** → **cPanel**

### 1.2 Criar Database
1. No cPanel, procure por **"MySQL Databases"** ou **"Bancos de Dados MySQL"**
2. Na seção **"Create New Database"**:
   - Nome do database: `precompeonato` (ou outro nome)
   - Clique em **"Create Database"**
3. **Anote o nome completo** que aparece (geralmente será algo como `u123456789_precompeonato`)

### 1.3 Criar Usuário MySQL
1. Na mesma página, vá em **"MySQL Users"** ou **"Usuários MySQL"**
2. Na seção **"Add New User"**:
   - Username: `precompeonato_user` (ou outro)
   - Password: Crie uma senha forte
   - Clique em **"Create User"**
3. **Anote o username completo** (será algo como `u123456789_precompeonato_user`)
4. **Anote a senha**

### 1.4 Adicionar Usuário ao Database
1. Na seção **"Add User to Database"**:
   - Selecione o usuário que você criou
   - Selecione o database que você criou
   - Clique em **"Add"**
2. Na tela de privilégios:
   - Marque **"ALL PRIVILEGES"** (Todos os privilégios)
   - Clique em **"Make Changes"**

### 1.5 Anotar Informações
Você agora tem:
```
DB_HOST: localhost (ou o host fornecido pela Hostinger)
DB_USER: u123456789_precompeonato_user
DB_PASSWORD: sua_senha_forte
DB_NAME: u123456789_precompeonato
DB_PORT: 3306
```

## Passo 2: Fazer Upload dos Arquivos

### 2.1 Via File Manager (Recomendado)
1. No cPanel, clique em **"File Manager"**
2. Navegue até `public_html` (ou a pasta do seu domínio)
3. Clique em **"Upload"** no topo
4. Faça upload de TODOS os arquivos do projeto:
   - `server.js`
   - `db.js`
   - `setup-database.js`
   - `package.json`
   - `.env` (você vai editar depois)
   - `index.html`
   - `admin.html`
   - `estatisticas.html`
   - `app.js`
   - `estatisticas.js`
   - `styles.css`
   - `regras.html`
   - `.htaccess`

### 2.2 Via FTP (Alternativa)
1. Use FileZilla ou outro cliente FTP
2. Conecte usando as credenciais FTP da Hostinger
3. Faça upload de todos os arquivos para `public_html`

## Passo 3: Configurar Variáveis de Ambiente

### 3.1 Via Environment Variables da Hostinger (RECOMENDADO)
1. No hPanel, vá em **Setup Node.js App**
2. Clique na sua aplicação
3. Role até **"Environment Variables"**
4. Adicione as seguintes variáveis (clique em "+ Add more" para cada):

```
Key: DB_NAME
Value: u394631272_precompeonato

Key: DB_USER  
Value: u394631272_management

Key: DB_PASSWORD
Value: M#69ASO-*^6M

Key: DB_HOST
Value: localhost

Key: DB_PORT
Value: 3306

Key: PORT
Value: 3000

Key: NODE_ENV
Value: production
```

5. Clique em **"Save"** após adicionar todas

### 3.2 Via Arquivo .env (Alternativa)
Se preferir usar arquivo `.env`:

1. No File Manager, localize o arquivo `.env`
2. Clique com botão direito → **"Edit"**
3. Substitua com suas credenciais:

```env
DB_HOST=localhost
DB_USER=u394631272_management
DB_PASSWORD=M#69ASO-*^6M
DB_NAME=u394631272_precompeonato
DB_PORT=3306
PORT=3000
NODE_ENV=production
```

4. Clique em **"Save Changes"**

**IMPORTANTE:** Se usar Environment Variables da Hostinger, você NÃO precisa do arquivo `.env`!

## Passo 4: Instalar Node.js e Dependências

### 4.1 Ativar Node.js
1. No hPanel da Hostinger, vá em **Avançado**
2. Procure por **"Node.js"** ou **"Setup Node.js App"**
3. Clique em **"Create Application"**
4. Configure:
   - **Node.js version**: 18.x ou superior
   - **Application mode**: Production
   - **Application root**: `/public_html` (ou sua pasta)
   - **Application URL**: seu domínio (ex: precompeonato.com.br)
   - **Application startup file**: `server.js`
5. **NÃO CLIQUE EM CREATE AINDA!**
6. Role para baixo até **"Environment Variables"**
7. Adicione TODAS as variáveis do Passo 3.1
8. Agora sim, clique em **"Create"**

### 4.2 Instalar Dependências via hPanel (HOSTINGER)

**A Hostinger não permite npm direto no SSH. Use o Node.js App Manager:**

1. No hPanel, vá em **Setup Node.js App**
2. Clique na sua aplicação Node.js
3. Procure pela seção **"Run npm install"** ou **"Install dependencies"**
4. Clique no botão para instalar as dependências
5. Aguarde a instalação (pode levar 1-2 minutos)

**OU via Terminal da Aplicação:**

1. Na página da sua aplicação Node.js
2. Clique em **"Open Terminal"** ou **"Console"**
3. Execute:
```bash
npm install
```

### 4.3 Verificar Instalação
Após instalar, você deve ver a pasta `node_modules` no File Manager dentro da pasta da sua aplicação.

## Passo 5: Criar as Tabelas do Database

### 5.1 Via phpMyAdmin (RECOMENDADO para Hostinger)

1. No cPanel, clique em **"phpMyAdmin"**
2. Selecione seu database `u394631272_precompeonato` na esquerda
3. Clique na aba **"SQL"** no topo
4. Cole TODO o SQL abaixo e clique em **"Go"**:

```sql
-- Criar tabela de campeonatos
CREATE TABLE IF NOT EXISTS campeonatos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    edicao VARCHAR(100),
    data_inicio DATE NOT NULL,
    data_fim DATE,
    status ENUM('inscricoes', 'em_andamento', 'finalizado') DEFAULT 'inscricoes',
    descricao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de precons
CREATE TABLE IF NOT EXISTS precons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    set_nome VARCHAR(255) NOT NULL,
    comandante VARCHAR(255) NOT NULL,
    cores VARCHAR(50),
    ano INT,
    banido BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de emails permitidos
CREATE TABLE IF NOT EXISTS emails_permitidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de inscrições
CREATE TABLE IF NOT EXISTS inscricoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campeonato_id INT NOT NULL,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    deck_id INT,
    deck_nome VARCHAR(255),
    pontos INT DEFAULT 0,
    vitorias INT DEFAULT 0,
    segundos_lugares INT DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campeonato_id) REFERENCES campeonatos(id),
    FOREIGN KEY (deck_id) REFERENCES precons(id),
    UNIQUE KEY unique_email_campeonato (email, campeonato_id)
);

-- Criar tabela de rodadas
CREATE TABLE IF NOT EXISTS rodadas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campeonato_id INT NOT NULL,
    numero INT NOT NULL,
    data_rodada DATE NOT NULL,
    status ENUM('agendada', 'em_andamento', 'finalizada') DEFAULT 'agendada',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campeonato_id) REFERENCES campeonatos(id) ON DELETE CASCADE
);

-- Criar tabela de mesas
CREATE TABLE IF NOT EXISTS mesas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rodada_id INT NOT NULL,
    numero_mesa INT NOT NULL,
    vencedor_id INT,
    segundo_id INT,
    finalizada BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rodada_id) REFERENCES rodadas(id) ON DELETE CASCADE,
    FOREIGN KEY (vencedor_id) REFERENCES inscricoes(id),
    FOREIGN KEY (segundo_id) REFERENCES inscricoes(id)
);

-- Criar tabela de jogadores por mesa
CREATE TABLE IF NOT EXISTS mesa_jogadores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mesa_id INT NOT NULL,
    inscricao_id INT NOT NULL,
    posicao INT,
    eliminado BOOLEAN DEFAULT FALSE,
    posicao_final INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mesa_id) REFERENCES mesas(id) ON DELETE CASCADE,
    FOREIGN KEY (inscricao_id) REFERENCES inscricoes(id)
);

-- Criar tabela de histórico de partidas
CREATE TABLE IF NOT EXISTS historico_partidas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mesa_id INT NOT NULL,
    campeonato_id INT NOT NULL,
    jogador_id INT NOT NULL,
    deck_id INT NOT NULL,
    posicao_final INT NOT NULL,
    pontos_ganhos INT DEFAULT 0,
    oponente1_id INT,
    oponente1_deck_id INT,
    oponente2_id INT,
    oponente2_deck_id INT,
    oponente3_id INT,
    oponente3_deck_id INT,
    data_partida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mesa_id) REFERENCES mesas(id) ON DELETE CASCADE,
    FOREIGN KEY (campeonato_id) REFERENCES campeonatos(id),
    FOREIGN KEY (jogador_id) REFERENCES inscricoes(id),
    FOREIGN KEY (deck_id) REFERENCES precons(id),
    FOREIGN KEY (oponente1_id) REFERENCES inscricoes(id),
    FOREIGN KEY (oponente1_deck_id) REFERENCES precons(id),
    FOREIGN KEY (oponente2_id) REFERENCES inscricoes(id),
    FOREIGN KEY (oponente2_deck_id) REFERENCES precons(id),
    FOREIGN KEY (oponente3_id) REFERENCES inscricoes(id),
    FOREIGN KEY (oponente3_deck_id) REFERENCES precons(id)
);

-- Inserir campeonato de exemplo
INSERT INTO campeonatos (id, nome, edicao, data_inicio, status) VALUES
(1, 'Precompeonato Cowabunga', 'Etapa #1 2026 - Citadel Edition', '2026-03-11', 'inscricoes');

-- Inserir precons de exemplo
INSERT INTO precons (nome, set_nome, comandante, cores, ano) VALUES
('Draconic Dissent', 'Commander 2021', 'Vrondiss, Rage of Ancients', 'RG', 2021),
('Elven Empire', 'Commander 2021', 'Lathril, Blade of the Elves', 'BG', 2021),
('Quantum Quandrix', 'Strixhaven', 'Adrix and Nev, Twincasters', 'GU', 2021);

-- Inserir emails de exemplo
INSERT INTO emails_permitidos (email) VALUES
('exemplo1@email.com'),
('exemplo2@email.com'),
('exemplo3@email.com');
```

## Passo 6: Iniciar a Aplicação

### 6.1 Via Node.js App Manager
1. Volte para **Setup Node.js App** no hPanel
2. Clique no botão **"Start"** ou **"Restart"**
3. Aguarde alguns segundos

### 6.2 Via SSH
```bash
# Iniciar com PM2 (se disponível)
npm install -g pm2
pm2 start server.js --name precompeonato
pm2 save
pm2 startup

# Ou iniciar diretamente
node server.js
```

## Passo 7: Testar o Site

### 7.1 Verificar API
Acesse no navegador:
```
https://seudominio.com.br/api/health
```

Deve retornar:
```json
{"status":"ok","database":"connected"}
```

### 7.2 Testar Páginas
- `https://seudominio.com.br` - Página principal
- `https://seudominio.com.br/admin.html` - Admin
- `https://seudominio.com.br/estatisticas.html` - Estatísticas

## Passo 8: Configuração Inicial

### 8.1 Adicionar Emails Permitidos
1. Acesse phpMyAdmin
2. Selecione seu database
3. Clique na tabela `emails_permitidos`
4. Clique em **"Insert"**
5. Adicione os emails dos jogadores

Ou via SQL:
```sql
INSERT INTO emails_permitidos (email) VALUES 
('jogador1@email.com'),
('jogador2@email.com'),
('jogador3@email.com');
```

### 8.2 Adicionar Precons
Via phpMyAdmin ou SQL:
```sql
INSERT INTO precons (nome, set_nome, comandante, cores, ano) VALUES 
('Nome do Deck', 'Commander 2024', 'Nome do Comandante', 'WUB', 2024);
```

## Troubleshooting

### Erro: "Cannot connect to database"
- Verifique as credenciais no `.env`
- Confirme que o usuário tem permissões no database
- Teste a conexão via phpMyAdmin

### Erro: "Application not starting"
- Verifique os logs no Node.js App Manager
- Confirme que `node_modules` foi instalado
- Verifique se o `server.js` está na pasta correta

### Erro 500
- Verifique permissões dos arquivos (644 para arquivos, 755 para pastas)
- Veja os logs de erro no cPanel → Error Logs
- Confirme que todas as dependências foram instaladas

### Site não carrega
- Verifique se o domínio está apontando corretamente
- Confirme que a aplicação Node.js está rodando
- Verifique o `.htaccess`

## Comandos Úteis SSH

```bash
# Ver logs da aplicação
pm2 logs precompeonato

# Reiniciar aplicação
pm2 restart precompeonato

# Ver status
pm2 status

# Parar aplicação
pm2 stop precompeonato

# Ver processos Node.js
ps aux | grep node

# Testar conexão com MySQL
mysql -u seu_usuario -p seu_database
```

## Suporte

- **Hostinger**: https://support.hostinger.com
- **Node.js na Hostinger**: https://support.hostinger.com/en/articles/5617825
- **MySQL na Hostinger**: https://support.hostinger.com/en/collections/2742100

## Checklist Final

- [ ] Database MySQL criado
- [ ] Usuário MySQL criado com permissões
- [ ] Arquivos enviados via FTP/File Manager
- [ ] `.env` configurado com credenciais corretas
- [ ] Node.js ativado no hPanel
- [ ] Dependências instaladas (`npm install`)
- [ ] Tabelas criadas (`node setup-database.js`)
- [ ] Aplicação iniciada
- [ ] API testada (`/api/health`)
- [ ] Emails permitidos adicionados
- [ ] Precons cadastrados
- [ ] Campeonato criado

🎉 **Pronto! Seu site está no ar!**
