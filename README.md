# Precompeonato - Sistema de Torneio de Commander

Sistema web completo para gerenciamento de múltiplos torneios de Magic: The Gathering Commander com decks pré-montados (precons).

## Funcionalidades

### Para Jogadores
- ✅ Cadastro com validação de email autorizado
- ✅ Busca inteligente de precons de Commander
- ✅ Visualização de rodadas e pareamentos
- ✅ Estatísticas detalhadas pessoais:
  - Total de partidas, vitórias e win rate
  - Performance por deck utilizado
  - Matchups contra outros decks
  - Histórico completo de partidas
  - Filtro por campeonato

### Para Administradores
- ✅ Gerenciamento de múltiplos campeonatos
- ✅ Cadastro de precons disponíveis
- ✅ Controle de emails permitidos
- ✅ Pareamento automático por sistema suíço
- ✅ Registro de resultados
- ✅ Estatísticas de metagame

### Sistema
- ✅ Banco de dados MySQL para persistência
- ✅ Histórico completo de todas as partidas
- ✅ Métricas detalhadas para análise
- ✅ Suporte a múltiplos campeonatos simultâneos

## Tecnologias

- **Backend**: Node.js + Express
- **Database**: MySQL
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)

## Instalação Local

### 1. Pré-requisitos

- Node.js 14+ instalado
- MySQL 5.7+ instalado e rodando

### 2. Clonar e Instalar

```bash
npm install
```

### 3. Configurar Database

1. Copie `.env.example` para `.env`
2. Configure as credenciais do MySQL no `.env`
3. Execute o setup:

```bash
npm run setup-db
```

### 4. Iniciar Servidor

```bash
npm start
```

Ou para desenvolvimento com auto-reload:

```bash
npm run dev
```

Acesse: `http://localhost:3000`

## Deploy na Hostinger

Veja o guia completo em [DEPLOY.md](DEPLOY.md)

## Estrutura do Banco de Dados

### Tabelas Principais

- **campeonatos**: Gerenciamento de múltiplos torneios
- **precons**: Lista de decks pré-montados disponíveis
- **emails_permitidos**: Emails autorizados a se inscrever
- **inscricoes**: Jogadores inscritos (por campeonato)
- **rodadas**: Rodadas de cada campeonato
- **mesas**: Mesas de cada rodada
- **mesa_jogadores**: Relação jogadores x mesas
- **historico_partidas**: Registro completo de todas as partidas para estatísticas

## Páginas

### `/index.html` - Página Principal
- Inscrição no campeonato ativo
- Visualização de rodadas
- Metagame geral

### `/estatisticas.html` - Estatísticas do Jogador
- Busca por email
- Filtro por campeonato
- Métricas detalhadas:
  - Resumo geral (partidas, vitórias, win rate, pontos)
  - Decks utilizados
  - Performance por deck
  - Matchups contra outros decks
  - Histórico completo de partidas

### `/admin.html` - Painel Administrativo
- Criar e gerenciar campeonatos
- Cadastrar precons
- Adicionar emails permitidos
- Gerar pareamentos
- Reportar resultados

## API Endpoints

### Campeonatos
- `GET /api/campeonatos` - Listar todos
- `GET /api/campeonatos/:id` - Buscar específico
- `POST /api/campeonatos` - Criar novo
- `PUT /api/campeonatos/:id/status` - Atualizar status

### Precons
- `GET /api/precons?busca=termo` - Buscar precons
- `POST /api/precons` - Cadastrar precon

### Inscrições
- `GET /api/inscricoes` - Listar inscritos
- `POST /api/inscricoes` - Criar inscrição

### Rodadas
- `GET /api/rodadas` - Listar rodadas
- `POST /api/parear` - Gerar pareamento
- `POST /api/resultado` - Salvar resultado

### Estatísticas
- `GET /api/estatisticas?email=x&campeonato_id=y` - Estatísticas do jogador
- `GET /api/metagame` - Estatísticas gerais

## Uso

### Criar um Campeonato

1. Acesse `/admin.html`
2. Preencha o formulário "Criar Campeonato"
3. Gerencie o status: inscrições → em_andamento → finalizado

### Inscrever Jogadores

1. Adicione emails permitidos no admin
2. Jogadores acessam a página principal
3. Preenchem nome, email e selecionam o precon
4. Sistema valida email e registra inscrição

### Gerar Rodadas

1. No admin, use "Gerar Pareamento"
2. Sistema cria mesas de 4 jogadores por sistema suíço
3. Jogadores veem os pareamentos na página principal

### Reportar Resultados

1. No admin, informe ID da mesa, vencedor e segundo lugar
2. Sistema atualiza pontuação automaticamente
3. Registra no histórico para estatísticas

### Ver Estatísticas

1. Acesse `/estatisticas.html`
2. Digite seu email
3. Opcionalmente filtre por campeonato
4. Veja todas as suas métricas

## Gerenciamento via SQL

### Adicionar Precons

```sql
INSERT INTO precons (nome, set_nome, comandante, cores, ano) 
VALUES ('Nome do Deck', 'Commander 2024', 'Comandante', 'WUB', 2024);
```

### Adicionar Emails Permitidos

```sql
INSERT INTO emails_permitidos (email) 
VALUES ('jogador@email.com');
```

### Banir Precon

```sql
UPDATE precons SET banido = TRUE WHERE id = 1;
```

### Ver Estatísticas de um Jogador

```sql
SELECT * FROM historico_partidas 
WHERE jogador_id = (SELECT id FROM inscricoes WHERE email = 'jogador@email.com')
ORDER BY data_partida DESC;
```

## Segurança

- Validação de emails permitidos
- Proteção contra SQL injection (prepared statements)
- HTTPS recomendado em produção
- Variáveis de ambiente para credenciais
- Unique constraints para evitar duplicatas

## Próximas Melhorias

- [ ] Autenticação para área admin
- [ ] Sistema de check-in semanal
- [ ] Notificações por email
- [ ] Integração com Discord
- [ ] Exportação de relatórios PDF
- [ ] Dashboard com gráficos
- [ ] Ranking geral entre campeonatos
- [ ] Sistema de pontos ELO

## Suporte

Para dúvidas sobre deploy na Hostinger, consulte [DEPLOY.md](DEPLOY.md)

## Licença

MIT
