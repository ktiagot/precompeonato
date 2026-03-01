-- Atualização do sistema de pareamento
-- Este script adiciona campos necessários para o sistema suíço melhorado

-- 1. Adicionar campo de pontos cumulativos na tabela inscricoes (se não existir)
ALTER TABLE inscricoes 
ADD COLUMN IF NOT EXISTS pontos_cumulativos INT DEFAULT 0 AFTER pontos;

-- 2. Adicionar índices para melhorar performance das queries de pareamento
CREATE INDEX IF NOT EXISTS idx_inscricoes_campeonato_pontos 
ON inscricoes(campeonato_id, pontos DESC, pontos_cumulativos DESC);

CREATE INDEX IF NOT EXISTS idx_historico_jogadores 
ON historico_partidas(jogador_id, campeonato_id);

CREATE INDEX IF NOT EXISTS idx_mesa_jogadores_mesa 
ON mesa_jogadores(mesa_id, inscricao_id);

-- 3. Criar tabela para rastrear oponentes já enfrentados (se não existir)
CREATE TABLE IF NOT EXISTS historico_oponentes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campeonato_id INT NOT NULL,
    jogador1_id INT NOT NULL,
    jogador2_id INT NOT NULL,
    vezes_enfrentados INT DEFAULT 1,
    ultima_rodada INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campeonato_id) REFERENCES campeonatos(id) ON DELETE CASCADE,
    FOREIGN KEY (jogador1_id) REFERENCES inscricoes(id) ON DELETE CASCADE,
    FOREIGN KEY (jogador2_id) REFERENCES inscricoes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_oponentes (campeonato_id, jogador1_id, jogador2_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Atualizar pontos cumulativos baseado no histórico existente
UPDATE inscricoes i
SET pontos_cumulativos = (
    SELECT COALESCE(SUM(h.pontos_ganhos), 0)
    FROM historico_partidas h
    WHERE h.jogador_id = i.id
)
WHERE i.id IN (SELECT DISTINCT jogador_id FROM historico_partidas);

-- 5. Popular tabela de histórico de oponentes com dados existentes
INSERT IGNORE INTO historico_oponentes (campeonato_id, jogador1_id, jogador2_id, vezes_enfrentados, ultima_rodada)
SELECT 
    h1.campeonato_id,
    LEAST(h1.jogador_id, h2.jogador_id) as jogador1_id,
    GREATEST(h1.jogador_id, h2.jogador_id) as jogador2_id,
    COUNT(*) as vezes_enfrentados,
    MAX(r.numero) as ultima_rodada
FROM historico_partidas h1
JOIN historico_partidas h2 ON h1.mesa_id = h2.mesa_id AND h1.jogador_id < h2.jogador_id
JOIN mesas m ON h1.mesa_id = m.id
JOIN rodadas r ON m.rodada_id = r.id
GROUP BY h1.campeonato_id, jogador1_id, jogador2_id;

-- 6. Verificar estrutura final
SELECT 'Verificação de estrutura:' as status;
SHOW COLUMNS FROM inscricoes LIKE 'pontos_cumulativos';
SELECT COUNT(*) as total_historico_oponentes FROM historico_oponentes;
