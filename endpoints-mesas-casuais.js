// ========== MESAS CASUAIS ==========

// Listar mesas casuais abertas
app.get('/api/mesas-casuais', async (req, res) => {
    try {
        const { status, futuras } = req.query;
        
        let query = `
            SELECT 
                m.*,
                COUNT(mj.id) as jogadores_atuais
            FROM mesas_casuais m
            LEFT JOIN mesa_casual_jogadores mj ON m.id = mj.mesa_id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (status) {
            query += ' AND m.status = ?';
            params.push(status);
        }
        
        if (futuras === 'true') {
            query += ' AND m.data_hora > NOW()';
        }
        
        query += ' GROUP BY m.id ORDER BY m.data_hora ASC';
        
        const [mesas] = await db.query(query, params);
        
        // Buscar jogadores de cada mesa
        for (let mesa of mesas) {
            const [jogadores] = await db.query(`
                SELECT 
                    mj.jogador_email,
                    mj.comandante_1,
                    mj.comandante_2,
                    mj.joined_at,
                    p.nome as deck_nome
                FROM mesa_casual_jogadores mj
                LEFT JOIN precons p ON mj.deck_precon_id = p.id
                WHERE mj.mesa_id = ?
                ORDER BY mj.joined_at
            `, [mesa.id]);
            
            mesa.jogadores = jogadores;
        }
        
        res.json(mesas);
    } catch (error) {
        console.error('Erro ao listar mesas casuais:', error);
        res.status(500).json({ error: error.message });
    }
});

// Criar mesa casual
app.post('/api/mesas-casuais', authMiddleware, async (req, res) => {
    try {
        const { titulo, descricao, data_hora, max_jogadores, deck_precon_id, comandante_1, comandante_2 } = req.body;
        const criadorEmail = req.user.email;
        
        // Criar mesa
        const [result] = await db.query(`
            INSERT INTO mesas_casuais (criador_email, titulo, descricao, data_hora, max_jogadores)
            VALUES (?, ?, ?, ?, ?)
        `, [criadorEmail, titulo, descricao, data_hora, max_jogadores || 4]);
        
        const mesaId = result.insertId;
        
        // Adicionar criador como primeiro jogador
        await db.query(`
            INSERT INTO mesa_casual_jogadores (mesa_id, jogador_email, deck_precon_id, comandante_1, comandante_2)
            VALUES (?, ?, ?, ?, ?)
        `, [mesaId, criadorEmail, deck_precon_id, comandante_1, comandante_2]);
        
        res.json({ 
            id: mesaId,
            message: 'Mesa criada com sucesso!' 
        });
    } catch (error) {
        console.error('Erro ao criar mesa casual:', error);
        res.status(500).json({ error: error.message });
    }
});

// Entrar em uma mesa casual
app.post('/api/mesas-casuais/:id/join', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { deck_precon_id, comandante_1, comandante_2 } = req.body;
        const jogadorEmail = req.user.email;
        
        // Verificar se mesa existe e está aberta
        const [mesas] = await db.query(`
            SELECT m.*, COUNT(mj.id) as jogadores_atuais
            FROM mesas_casuais m
            LEFT JOIN mesa_casual_jogadores mj ON m.id = mj.mesa_id
            WHERE m.id = ?
            GROUP BY m.id
        `, [id]);
        
        if (mesas.length === 0) {
            return res.status(404).json({ error: 'Mesa não encontrada' });
        }
        
        const mesa = mesas[0];
        
        if (mesa.status !== 'aberta') {
            return res.status(400).json({ error: 'Mesa não está aberta para novos jogadores' });
        }
        
        if (mesa.jogadores_atuais >= mesa.max_jogadores) {
            return res.status(400).json({ error: 'Mesa está cheia' });
        }
        
        // Verificar se já está na mesa
        const [jaParticipa] = await db.query(`
            SELECT id FROM mesa_casual_jogadores 
            WHERE mesa_id = ? AND jogador_email = ?
        `, [id, jogadorEmail]);
        
        if (jaParticipa.length > 0) {
            return res.status(400).json({ error: 'Você já está nesta mesa' });
        }
        
        // Adicionar jogador
        await db.query(`
            INSERT INTO mesa_casual_jogadores (mesa_id, jogador_email, deck_precon_id, comandante_1, comandante_2)
            VALUES (?, ?, ?, ?, ?)
        `, [id, jogadorEmail, deck_precon_id, comandante_1, comandante_2]);
        
        res.json({ message: 'Você entrou na mesa!' });
    } catch (error) {
        console.error('Erro ao entrar na mesa:', error);
        res.status(500).json({ error: error.message });
    }
});

// Sair de uma mesa casual
app.delete('/api/mesas-casuais/:id/leave', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const jogadorEmail = req.user.email;
        
        // Verificar se é o criador
        const [mesa] = await db.query(`
            SELECT criador_email FROM mesas_casuais WHERE id = ?
        `, [id]);
        
        if (mesa.length === 0) {
            return res.status(404).json({ error: 'Mesa não encontrada' });
        }
        
        if (mesa[0].criador_email === jogadorEmail) {
            return res.status(400).json({ error: 'O criador não pode sair da mesa. Cancele a mesa se necessário.' });
        }
        
        // Remover jogador
        await db.query(`
            DELETE FROM mesa_casual_jogadores 
            WHERE mesa_id = ? AND jogador_email = ?
        `, [id, jogadorEmail]);
        
        res.json({ message: 'Você saiu da mesa' });
    } catch (error) {
        console.error('Erro ao sair da mesa:', error);
        res.status(500).json({ error: error.message });
    }
});

// Atualizar mesa casual (apenas criador)
app.put('/api/mesas-casuais/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { link_jogo, status } = req.body;
        const jogadorEmail = req.user.email;
        
        // Verificar se é o criador
        const [mesa] = await db.query(`
            SELECT criador_email FROM mesas_casuais WHERE id = ?
        `, [id]);
        
        if (mesa.length === 0) {
            return res.status(404).json({ error: 'Mesa não encontrada' });
        }
        
        if (mesa[0].criador_email !== jogadorEmail) {
            return res.status(403).json({ error: 'Apenas o criador pode atualizar a mesa' });
        }
        
        // Atualizar
        const updates = [];
        const params = [];
        
        if (link_jogo !== undefined) {
            updates.push('link_jogo = ?');
            params.push(link_jogo);
        }
        
        if (status) {
            updates.push('status = ?');
            params.push(status);
        }
        
        if (updates.length > 0) {
            params.push(id);
            await db.query(`
                UPDATE mesas_casuais 
                SET ${updates.join(', ')}
                WHERE id = ?
            `, params);
        }
        
        res.json({ message: 'Mesa atualizada com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar mesa:', error);
        res.status(500).json({ error: error.message });
    }
});

// Cancelar mesa (apenas criador)
app.delete('/api/mesas-casuais/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const jogadorEmail = req.user.email;
        
        // Verificar se é o criador
        const [mesa] = await db.query(`
            SELECT criador_email FROM mesas_casuais WHERE id = ?
        `, [id]);
        
        if (mesa.length === 0) {
            return res.status(404).json({ error: 'Mesa não encontrada' });
        }
        
        if (mesa[0].criador_email !== jogadorEmail) {
            return res.status(403).json({ error: 'Apenas o criador pode cancelar a mesa' });
        }
        
        // Marcar como cancelada ao invés de deletar
        await db.query(`
            UPDATE mesas_casuais 
            SET status = 'cancelada'
            WHERE id = ?
        `, [id]);
        
        res.json({ message: 'Mesa cancelada' });
    } catch (error) {
        console.error('Erro ao cancelar mesa:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== PERFIL E RANKING ==========

// Buscar perfil de um jogador (público)
app.get('/api/perfil/:email', async (req, res) => {
    try {
        const { email } = req.params;
        
        // Buscar dados do perfil
        const [perfil] = await db.query(`
            SELECT * FROM perfis_usuarios WHERE email = ?
        `, [email]);
        
        // Buscar estatísticas gerais
        const [stats] = await db.query(`
            SELECT 
                COUNT(DISTINCT h.campeonato_id) as campeonatos_participados,
                COUNT(h.id) as total_partidas,
                SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) as vitorias,
                SUM(CASE WHEN h.posicao_final = 2 THEN 1 ELSE 0 END) as segundos_lugares,
                SUM(h.pontos_ganhos) as pontos_totais,
                ROUND(SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(h.id), 0), 1) as winrate
            FROM historico_partidas h
            JOIN inscricoes i ON h.jogador_id = i.id
            WHERE i.email = ?
        `, [email]);
        
        // Buscar campeonatos
        const [campeonatos] = await db.query(`
            SELECT 
                c.id,
                c.nome,
                c.edicao,
                c.data_inicio,
                i.pontos,
                i.vitorias,
                i.segundos_lugares,
                (SELECT COUNT(*) FROM inscricoes WHERE campeonato_id = c.id AND ativo = TRUE) as total_jogadores,
                (SELECT COUNT(*) + 1 FROM inscricoes i2 
                 WHERE i2.campeonato_id = c.id 
                 AND i2.ativo = TRUE 
                 AND (i2.pontos > i.pontos OR (i2.pontos = i.pontos AND i2.vitorias > i.vitorias))
                ) as posicao
            FROM inscricoes i
            JOIN campeonatos c ON i.campeonato_id = c.id
            WHERE i.email = ? AND i.ativo = TRUE
            ORDER BY c.data_inicio DESC
        `, [email]);
        
        // Buscar decks mais usados
        const [decks] = await db.query(`
            SELECT 
                p.nome as deck_nome,
                CASE 
                    WHEN i.comandante_2 IS NOT NULL THEN CONCAT(i.comandante_1, ' + ', i.comandante_2)
                    ELSE i.comandante_1
                END as comandantes,
                COUNT(h.id) as partidas,
                SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) as vitorias,
                ROUND(SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(h.id), 1) as winrate
            FROM historico_partidas h
            JOIN inscricoes i ON h.jogador_id = i.id
            JOIN precons p ON h.deck_id = p.id
            WHERE i.email = ?
            GROUP BY p.id, i.comandante_1, i.comandante_2
            ORDER BY COUNT(h.id) DESC
            LIMIT 5
        `, [email]);
        
        res.json({
            perfil: perfil[0] || { email },
            stats: stats[0],
            campeonatos,
            decks_favoritos: decks
        });
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        res.status(500).json({ error: error.message });
    }
});

// Atualizar perfil (próprio usuário)
app.put('/api/perfil', authMiddleware, async (req, res) => {
    try {
        const { nome, bio, discord, whatsapp, avatar_url } = req.body;
        const email = req.user.email;
        
        // Verificar se perfil existe
        const [existe] = await db.query(`
            SELECT email FROM perfis_usuarios WHERE email = ?
        `, [email]);
        
        if (existe.length === 0) {
            // Criar perfil
            await db.query(`
                INSERT INTO perfis_usuarios (email, nome, bio, discord, whatsapp, avatar_url)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [email, nome, bio, discord, whatsapp, avatar_url]);
        } else {
            // Atualizar perfil
            await db.query(`
                UPDATE perfis_usuarios 
                SET nome = ?, bio = ?, discord = ?, whatsapp = ?, avatar_url = ?
                WHERE email = ?
            `, [nome, bio, discord, whatsapp, avatar_url, email]);
        }
        
        res.json({ message: 'Perfil atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({ error: error.message });
    }
});

// Ranking geral de jogadores
app.get('/api/ranking', async (req, res) => {
    try {
        const { campeonato_id } = req.query;
        
        let query = `
            SELECT 
                i.email,
                MAX(pu.nome) as nome,
                SUM(i.pontos) as pontos_totais,
                SUM(i.vitorias) as vitorias_totais,
                SUM(i.segundos_lugares) as segundos_totais,
                COUNT(DISTINCT i.campeonato_id) as campeonatos_participados,
                ROUND(SUM(i.vitorias) * 100.0 / NULLIF(COUNT(DISTINCT h.mesa_id), 0), 1) as winrate
            FROM inscricoes i
            LEFT JOIN perfis_usuarios pu ON i.email = pu.email
            LEFT JOIN historico_partidas h ON i.id = h.jogador_id
            WHERE i.ativo = TRUE
        `;
        
        const params = [];
        
        if (campeonato_id) {
            query += ' AND i.campeonato_id = ?';
            params.push(campeonato_id);
        }
        
        query += `
            GROUP BY i.email
            ORDER BY SUM(i.pontos) DESC, SUM(i.vitorias) DESC
            LIMIT 100
        `;
        
        const [ranking] = await db.query(query, params);
        
        res.json(ranking);
    } catch (error) {
        console.error('Erro ao buscar ranking:', error);
        res.status(500).json({ error: error.message });
    }
});
