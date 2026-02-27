# Precompeonato - Sistema de Torneio de Commander

Sistema web para gerenciamento de torneios de Magic: The Gathering Commander com decks pré-montados (precons).

## O que é

Plataforma completa para organizar campeonatos de Commander usando apenas precons oficiais da Wizards. Permite inscrições de jogadores, pareamento automático por sistema suíço, registro de resultados e acompanhamento de estatísticas detalhadas.

## Funcionalidades

### Para Jogadores

- Inscrição em campeonatos com validação de email autorizado
- Busca e seleção de precons de Commander (2011-2026)
- Visualização de rodadas e pareamentos
- Autenticação por código enviado ao email
- Estatísticas pessoais:
  - Total de partidas, vitórias e win rate
  - Performance por deck utilizado
  - Matchups contra outros decks
  - Histórico completo de partidas
  - Filtro por campeonato

### Para Administradores

- Autenticação por código enviado ao email
- Gerenciamento de múltiplos campeonatos
- Cadastro de precons disponíveis
- Controle de emails permitidos
- Pareamento automático por sistema suíço
- Registro de resultados de mesas
- Visualização de estatísticas gerais de metagame

### Estatísticas Públicas

- Metagame geral (decks mais usados)
- Top decks por win rate
- Matchups mais comuns
- Números gerais do campeonato
- Filtro por campeonato

## Como Usar

### Inscrição em Campeonato

1. Acesse a página principal
2. Preencha nome e email (deve estar na lista de permitidos)
3. Busque e selecione seu precon
4. Confirme a inscrição

### Acompanhar Rodadas

1. Acesse a página principal
2. Veja as rodadas criadas
3. Confira sua mesa e oponentes
4. Jogue sua partida

### Ver Estatísticas Pessoais

1. Acesse a página de Estatísticas
2. Faça login com seu email (receba código por email)
3. Veja suas estatísticas detalhadas
4. Filtre por campeonato específico

### Administração (apenas admins)

1. Acesse `/admin.html`
2. Faça login com email de administrador
3. Crie campeonatos e gerencie status
4. Adicione emails permitidos
5. Gere pareamentos de rodadas
6. Registre resultados das mesas

## Páginas

- `/index.html` - Página principal com inscrições e rodadas
- `/estatisticas.html` - Estatísticas gerais e pessoais
- `/regras.html` - Regras do torneio
- `/admin.html` - Painel administrativo (requer autenticação)
- `/login.html` - Login com código por email

## Sistema de Pontuação

Baseado em sistema suíço para Commander multiplayer:

- Vencedor: 3 pontos
- Segundo lugar: 1 ponto
- Terceiro e quarto: 0 pontos

Pareamento considera pontuação acumulada e vitórias para criar mesas balanceadas.

## Autenticação

Sistema de autenticação por código de 6 dígitos enviado ao email:

1. Digite seu email
2. Receba código por email
3. Insira o código (válido por 15 minutos)
4. Sessão válida por 7 dias

Disponível para jogadores (estatísticas pessoais) e administradores (painel admin).

## Suporte

Para dúvidas sobre instalação e deploy, consulte [HOSTINGER-SETUP.md](HOSTINGER-SETUP.md)
