-- Atualizar cores do tema do campeonato YipYip
UPDATE campeonatos 
SET 
    cor_primaria = '#FF6B35',      -- Laranja vibrante do YipYip
    cor_secundaria = '#1B2845',    -- Azul escuro do PRECOM PRONATO
    cor_destaque = '#D4A574'       -- Bege/dourado da borda
WHERE nome = 'Precom Pronato' AND edicao = 'YipYip';

-- Verificar a atualização
SELECT id, nome, edicao, status, cor_primaria, cor_secundaria, cor_destaque 
FROM campeonatos 
WHERE nome = 'Precom Pronato' AND edicao = 'YipYip';
