# VPS Database Setup - Complete Guide

## Current Status
- VPS IP: 187.77.228.122
- Domain: precompeonato.com.br (HTTPS working)
- MySQL Database: u394631272_precompeonato
- MySQL User: u394631272_management
- Node.js app running on PM2

## Issues Fixed in SQL Files
1. Added missing deck "Heads I Win, Tails You Lose" to precons
2. Removed invalid `status` column from rodadas table
3. Fixed NULL deck_id filter in historico_partidas query
4. Updated player ID 1 to reference the correct deck

## Step-by-Step Database Population

### 1. Connect to VPS via SSH
```bash
ssh root@187.77.228.122
```

### 2. Navigate to Project Directory
```bash
cd /var/www/precompeonato
```

### 3. Pull Latest Changes from Git
```bash
git pull origin main
```

### 4. Connect to MySQL
```bash
mysql -u u394631272_management -p u394631272_precompeonato
```
Password: `MH69ASO~xA6M`

### 5. Execute SQL Files in Order

#### A. Populate Precons (includes the missing deck)
```sql
SOURCE /var/www/precompeonato/data/precons-data.sql;
```

Verify:
```sql
SELECT COUNT(*) FROM precons;
-- Should return 200+ decks

SELECT * FROM precons WHERE nome = 'Heads I Win, Tails You Lose';
-- Should return 1 row with Fallout Commander
```

#### B. Create Auth System Tables
```sql
SOURCE /var/www/precompeonato/data/dados-auth-system.sql;
```

Verify:
```sql
SHOW TABLES LIKE '%admin%';
SHOW TABLES LIKE '%codigo%';
SHOW TABLES LIKE '%sessoes%';
```

#### C. Populate Championship and Players
```sql
SOURCE /var/www/precompeonato/data/dados-campeonato-yipyip.sql;
```

Verify:
```sql
SELECT COUNT(*) FROM inscricoes WHERE campeonato_id = 1;
-- Should return 44 players

SELECT id, nome, deck_id, deck_nome FROM inscricoes WHERE deck_id IS NULL;
-- Should return 0 rows (all players have valid decks)
```

#### D. Add Theme System
```sql
SOURCE /var/www/precompeonato/data/adicionar-temas-campeonatos.sql;
```

Verify:
```sql
DESCRIBE campeonatos;
-- Should show cor_primaria, cor_secundaria, cor_destaque, logo_url columns

SELECT cor_primaria, cor_secundaria, cor_destaque FROM campeonatos WHERE id = 1;
-- Should show Avatar theme colors
```

#### E. Populate Rounds and Tables
```sql
SOURCE /var/www/precompeonato/data/dados-rodadas-mockup.sql;
```

Verify:
```sql
SELECT COUNT(*) FROM rodadas WHERE campeonato_id = 1;
-- Should return 4 rounds

SELECT COUNT(*) FROM mesas;
-- Should return 44 tables (11 per round × 4 rounds)

SELECT COUNT(*) FROM mesa_jogadores;
-- Should return 176 records (44 tables × 4 players)
```

#### F. Populate Match History
```sql
SOURCE /var/www/precompeonato/data/dados-historico-partidas.sql;
```

Verify:
```sql
SELECT COUNT(*) FROM historico_partidas;
-- Should return 176 records (44 players × 4 rounds)

-- Check distribution per round
SELECT 
    r.numero AS rodada,
    COUNT(DISTINCT hp.mesa_id) AS mesas,
    COUNT(*) AS registros
FROM historico_partidas hp
JOIN mesas m ON hp.mesa_id = m.id
JOIN rodadas r ON m.rodada_id = r.id
GROUP BY r.numero
ORDER BY r.numero;
-- Should show 11 tables and 44 records per round
```

### 6. Exit MySQL
```sql
EXIT;
```

### 7. Restart PM2 Process
```bash
pm2 restart precompeonato
pm2 logs precompeonato --lines 50
```

### 8. Test the API Endpoints

#### Test Health Check
```bash
curl https://precompeonato.com.br/api/health
```

Expected response:
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

#### Test Statistics Endpoint
```bash
curl https://precompeonato.com.br/api/estatisticas/geral?campeonato_id=1
```

Should return statistics with:
- `totalJogadores`: 44
- `totalPartidas`: 176
- `decksUsados`: Array of decks with usage stats
- `decksMaisVencedores`: Top winning decks
- `matchupsComuns`: Common matchups

### 9. Test in Browser
Open: https://precompeonato.com.br/estatisticas.html

Should display:
- Total players: 44
- Total matches: 176
- Most used decks chart
- Top winning decks chart
- Common matchups table

## Troubleshooting

### If Statistics API Returns 500 Error

Check PM2 logs:
```bash
pm2 logs precompeonato --lines 100
```

Look for SQL errors. Common issues:
- GROUP BY errors (should be fixed now)
- Missing columns (should be fixed now)
- Foreign key constraint errors

### If No Data Shows Up

Verify data was inserted:
```bash
mysql -u u394631272_management -p u394631272_precompeonato -e "
SELECT 
    (SELECT COUNT(*) FROM precons) as precons,
    (SELECT COUNT(*) FROM inscricoes) as inscricoes,
    (SELECT COUNT(*) FROM rodadas) as rodadas,
    (SELECT COUNT(*) FROM mesas) as mesas,
    (SELECT COUNT(*) FROM mesa_jogadores) as mesa_jogadores,
    (SELECT COUNT(*) FROM historico_partidas) as historico_partidas;
"
```

Expected output:
```
+----------+------------+---------+-------+-----------------+---------------------+
| precons  | inscricoes | rodadas | mesas | mesa_jogadores  | historico_partidas  |
+----------+------------+---------+-------+-----------------+---------------------+
|     200+ |         44 |       4 |    44 |             176 |                 176 |
+----------+------------+---------+-------+-----------------+---------------------+
```

### If MySQL Connection Fails

Check .env file:
```bash
cat /var/www/precompeonato/.env
```

Verify credentials match:
- DB_HOST=127.0.0.1
- DB_USER=u394631272_management
- DB_PASSWORD=MH69ASO~xA6M
- DB_NAME=u394631272_precompeonato
- DB_PORT=3306

## All Fixed!

All SQL files have been reviewed and corrected. The database should now populate completely without errors, and the statistics page should work correctly.
