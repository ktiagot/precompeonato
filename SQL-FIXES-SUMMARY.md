# SQL Files - Fixes Applied

## Issues Found and Fixed

### 1. Missing Deck in Precons Table
**Problem**: Player ID 1 (Barros) was using "Heads I Win, Tails You Lose" from Fallout Commander, but this deck didn't exist in the precons table.

**Fix**: Added the missing deck to `data/precons-data.sql`:
```sql
('Heads I Win, Tails You Lose', 'Fallout Commander', 'Mr. House, President and CEO', 'URW', 2024)
```

### 2. Invalid Column Reference in Rodadas
**Problem**: `dados-rodadas-mockup.sql` was trying to insert into a `status` column that doesn't exist in the `rodadas` table.

**Fixes**:
- Removed `status` column from CREATE TABLE in `setup-database.js`
- Removed `status` values from INSERT statements in `dados-rodadas-mockup.sql`

### 3. NULL Deck Filter in Historico Partidas
**Problem**: `dados-historico-partidas.sql` had a filter `WHERE i.deck_id IS NOT NULL` that was excluding players without valid deck references.

**Fix**: Removed the NULL filter since all players now have valid deck_id references after adding the missing deck.

### 4. Deck Reference in Inscricoes
**Problem**: Player ID 1 had `deck_id = NULL` in the inscricoes insert.

**Fix**: Changed from `NULL` to a SELECT query that will find the deck_id:
```sql
(SELECT id FROM precons WHERE nome = 'Heads I Win, Tails You Lose' LIMIT 1)
```

## Execution Order

To populate the database correctly, execute the SQL files in this order:

1. `data/precons-data.sql` - Populate all precon decks (including the missing one)
2. `data/dados-auth-system.sql` - Create auth tables and admin users
3. `data/dados-campeonato-yipyip.sql` - Create championship and player registrations
4. `data/adicionar-temas-campeonatos.sql` - Add theme columns and Yip Yip theme
5. `data/dados-rodadas-mockup.sql` - Create 4 rounds with 11 tables each
6. `data/dados-historico-partidas.sql` - Populate match history for statistics

## Verification Queries

After executing all files, run these queries to verify:

```sql
-- Check if all players have valid deck_id
SELECT id, nome, deck_id, deck_nome 
FROM inscricoes 
WHERE campeonato_id = 1 AND deck_id IS NULL;
-- Should return 0 rows

-- Check total match history records
SELECT COUNT(*) as total_partidas FROM historico_partidas;
-- Should return 176 records (44 players × 4 rounds)

-- Check records per round
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

## All Files Are Now Correct

All SQL files have been reviewed and fixed. The queries should now execute without errors and populate all data correctly.
