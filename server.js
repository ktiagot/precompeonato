// Tentar carregar .env se existir (desenvolvimento local)
try {
    require('dotenv').config();
} catch (e) {
    // dotenv não instalado ou .env não existe - usar variáveis do sistema
}
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const dbOriginal = require('./db');

// Wrapper para logar todas as queries SQL
const db = {
    query: async function(sql, params) {
        const sqlPreview = typeof sql === 'string' ? sql.substring(0, 150).replace(/\s+/g, ' ') : 'QUERY OBJECT';
        console.log(`\n🔍 SQL Query: ${sqlPreview}...`);
        if (params && params.length > 0) {
            console.log(`   Params:`, params);
        }
        try {
            const result = await dbOriginal.query(sql, params);
            console.log(`   ✅ Query OK - ${result[0]?.length || 0} rows`);
            return result;
        } catch (error) {
            console.error(`   ❌ Query FAILED!`);
            console.error(`   Error Code: ${error.code}`);
            console.error(`   Error Message: ${error.message}`);
            console.error(`   SQL State: ${error.sqlState}`);
            console.error(`   Full SQL:`, typeof sql === 'string' ? sql : 'OBJECT');
            throw error;
        }
    }
};

const app = express();
const PORT = process.env.PORT || 3000;
const BETA_MODE = process.env.BETA_MODE === 'true';

// Middleware para evitar cache de arquivos estáticos
app.use((req, res, next) => {
    // Não fazer cache de HTML, JS, CSS
    if (req.url.endsWith('.html') || req.url.endsWith('.js') || req.url.endsWith('.css')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
});

// Middleware para bloquear endpoints em modo beta
function betaBlockMiddleware(req, res, next) {
    if (BETA_MODE) {
        return res.status(503).json({ 
            error: 'Esta funcionalidade está temporariamente indisponível no modo beta',
            beta: true 
        });
    }
    next();
}

// Função helper para logar erros SQL
function logSQLError(endpoint, error, query = '') {
    console.error(`\n❌ ERRO SQL no endpoint: ${endpoint}`);
    console.error(`   Mensagem: ${error.message}`);
    console.error(`   Código: ${error.code}`);
    if (query) {
        console.error(`   Query: ${query.substring(0, 200)}...`);
    }
    console.error(`   Stack: ${error.stack}\n`);
}

// Log de inicialização
console.log('🔧 Iniciando servidor...');
console.log('📊 Variáveis de ambiente:');
console.log('  - DB_HOST:', process.env.DB_HOST || 'NÃO DEFINIDO');
console.log('  - DB_USER:', process.env.DB_USER || 'NÃO DEFINIDO');
console.log('  - DB_NAME:', process.env.DB_NAME || 'NÃO DEFINIDO');
console.log('  - PORT:', PORT);
console.log('  - BETA_MODE:', BETA_MODE ? '🔒 ATIVADO' : '✅ DESATIVADO');

// Importar middleware de versionamento
const { versionMiddleware } = require('./version-middleware');

app.use(cors());
app.use(express.json());
app.use(versionMiddleware); // Injetar versões automaticamente
app.use(express.static('.'));

// Middleware global de erro para capturar erros SQL
app.use((err, req, res, next) => {
    if (err) {
        console.error('\n🔥 ERRO GLOBAL CAPTURADO:');
        console.error('   URL:', req.method, req.path);
        console.error('   Erro:', err.message);
        console.error('   Stack:', err.stack);
        return res.status(500).json({ error: err.message });
    }
    next();
});

// Middleware de log para todas as requisições
app.use((req, res, next) => {
    console.log(`\n🌐 ${req.method} ${req.path}`);
    console.log('   Query:', req.query);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('   Body:', req.body);
    }
    next();
});

// Configurar transporte de email
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
    console.log('✉️  Email configurado');
} else {
    console.log('⚠️  Email não configurado - autenticação desabilitada');
}

// Middleware de autenticação
async function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    try {
        const [sessoes] = await db.query(
            'SELECT * FROM sessoes WHERE token = ? AND expira_em > NOW()',
            [token]
        );
        
        if (sessoes.length === 0) {
            return res.status(401).json({ error: 'Sessão inválida ou expirada' });
        }
        
        req.user = {
            email: sessoes[0].email,
            isAdmin: sessoes[0].is_admin
        };
        next();
    } catch (error) {
        res.status(500).json({ error: 'Erro ao verificar autenticação' });
    }
}

// Middleware para verificar se é admin
function adminMiddleware(req, res, next) {
    if (!req.user?.isAdmin) {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    next();
}

// Endpoint para ver logs de erro
app.get('/api/debug/errors', (req, res) => {
    res.json({
        totalErrors: global.dbErrorLog?.length || 0,
        errors: global.dbErrorLog || [],
        env: {
            DB_HOST: process.env.DB_HOST,
            DB_USER: process.env.DB_USER,
            DB_NAME: process.env.DB_NAME,
            DB_PORT: process.env.DB_PORT,
            hasPassword: !!process.env.DB_PASSWORD
        }
    });
});

// Rota de teste
app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ 
            status: 'ok', 
            database: 'connected',
            beta_mode: BETA_MODE,
            env: {
                hasDbHost: !!process.env.DB_HOST,
                hasDbUser: !!process.env.DB_USER,
                hasDbName: !!process.env.DB_NAME,
                hasEmail: !!process.env.EMAIL_USER
            }
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: error.message,
            code: error.code,
            env: {
                hasDbHost: !!process.env.DB_HOST,
                hasDbUser: !!process.env.DB_USER,
                hasDbName: !!process.env.DB_NAME
            }
        });
    }
});

// Endpoint para verificar modo beta (público)
app.get('/api/beta-status', (req, res) => {
    res.json({ beta_mode: BETA_MODE });
});

// ========== AUTENTICAÇÃO ==========

// Solicitar código de verificação (BLOQUEADO EM MODO BETA)
app.post('/api/auth/solicitar-codigo', betaBlockMiddleware, async (req, res) => {
    try {
        if (!transporter) {
            return res.status(503).json({ error: 'Sistema de email não configurado. Contate o administrador.' });
        }
        
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email é obrigatório' });
        }
        
        // Verificar se é admin
        const [admin] = await db.query(
            'SELECT * FROM admins WHERE email = ? AND ativo = TRUE',
            [email]
        );
        
        const isAdmin = admin.length > 0;
        
        // Gerar código de 6 dígitos
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Salvar código no banco (expira em 15 minutos)
        const expiraEm = new Date(Date.now() + 15 * 60 * 1000);
        await db.query(
            'INSERT INTO codigos_verificacao (email, codigo, expira_em) VALUES (?, ?, ?)',
            [email, codigo, expiraEm]
        );
        
        // Enviar email
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'Precompeonato <noreply@precompeonato.com.br>',
            to: email,
            subject: 'Seu código de acesso - Precompeonato',
            html: `
                <h2>Código de Acesso</h2>
                <p>Olá${isAdmin ? ', Admin' : ''}!</p>
                <p>Seu código de acesso é:</p>
                <h1 style="font-size: 32px; letter-spacing: 8px; color: #2563eb;">${codigo}</h1>
                <p>Este código expira em 15 minutos.</p>
                <p>Se você não solicitou este código, ignore este email.</p>
                <hr>
                <p style="font-size: 12px; color: #666;">Precompeonato - Sistema de Torneios</p>
            `
        };
        
        await transporter.sendMail(mailOptions);
        
        res.json({ 
            message: 'Código enviado para seu email',
            expiresIn: 15 
        });
    } catch (error) {
        console.error('Erro ao enviar código:', error);
        res.status(500).json({ error: 'Erro ao enviar código' });
    }
});

// Verificar código e criar sessão
app.post('/api/auth/verificar-codigo', betaBlockMiddleware, async (req, res) => {
    try {
        const { email, codigo } = req.body;
        
        if (!email || !codigo) {
            return res.status(400).json({ error: 'Email e código são obrigatórios' });
        }
        
        // Buscar código válido
        const [codigos] = await db.query(
            'SELECT * FROM codigos_verificacao WHERE email = ? AND codigo = ? AND expira_em > NOW() AND usado = FALSE ORDER BY created_at DESC LIMIT 1',
            [email, codigo]
        );
        
        if (codigos.length === 0) {
            return res.status(401).json({ error: 'Código inválido ou expirado' });
        }
        
        // Marcar código como usado
        await db.query(
            'UPDATE codigos_verificacao SET usado = TRUE WHERE id = ?',
            [codigos[0].id]
        );
        
        // Verificar se é admin
        const [admin] = await db.query(
            'SELECT * FROM admins WHERE email = ? AND ativo = TRUE',
            [email]
        );
        
        const isAdmin = admin.length > 0;
        
        // Criar token de sessão
        const token = crypto.randomBytes(32).toString('hex');
        const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
        
        await db.query(
            'INSERT INTO sessoes (token, email, is_admin, expira_em) VALUES (?, ?, ?, ?)',
            [token, email, isAdmin, expiraEm]
        );
        
        res.json({
            token,
            email,
            isAdmin,
            expiresIn: 7 * 24 * 60 * 60 // segundos
        });
    } catch (error) {
        console.error('Erro ao verificar código:', error);
        res.status(500).json({ error: 'Erro ao verificar código' });
    }
});

// Verificar sessão atual
app.get('/api/auth/me', betaBlockMiddleware, authMiddleware, async (req, res) => {
    res.json({
        email: req.user.email,
        is_admin: req.user.isAdmin
    });
});

// Logout
app.post('/api/auth/logout', betaBlockMiddleware, authMiddleware, async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        await db.query('DELETE FROM sessoes WHERE token = ?', [token]);
        res.json({ message: 'Logout realizado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao fazer logout' });
    }
});

// Minhas mesas (usuário logado)
app.get('/api/minhas-mesas', betaBlockMiddleware, authMiddleware, async (req, res) => {
    try {
        const userEmail = req.user.email;
        
        // Buscar campeonato ativo
        const [campeonatos] = await db.query(`
            SELECT id FROM campeonatos 
            WHERE status IN ('inscricoes', 'em_andamento')
            ORDER BY data_inicio DESC 
            LIMIT 1
        `);
        
        if (campeonatos.length === 0) {
            return res.json([]);
        }
        
        const campeonatoId = campeonatos[0].id;
        
        // Buscar inscrição do usuário
        const [inscricoes] = await db.query(`
            SELECT id FROM inscricoes 
            WHERE email = ? AND campeonato_id = ?
        `, [userEmail, campeonatoId]);
        
        if (inscricoes.length === 0) {
            return res.json([]);
        }
        
        const inscricaoId = inscricoes[0].id;
        
        // Buscar todas as mesas do usuário
        const [mesas] = await db.query(`
            SELECT 
                m.id,
                m.numero_mesa,
                m.finalizada,
                m.vencedor_id,
                r.numero as rodada_numero,
                r.data_rodada,
                v.nome as vencedor_nome
            FROM mesa_jogadores mj
            JOIN mesas m ON mj.mesa_id = m.id
            JOIN rodadas r ON m.rodada_id = r.id
            LEFT JOIN inscricoes v ON m.vencedor_id = v.id
            WHERE mj.inscricao_id = ?
            ORDER BY r.numero DESC, m.numero_mesa
        `, [inscricaoId]);
        
        // Para cada mesa, buscar os jogadores
        for (let mesa of mesas) {
            // Converter data para formato ISO
            if (mesa.data_rodada) {
                mesa.data_rodada = new Date(mesa.data_rodada).toISOString().split('T')[0];
            }
            
            const [jogadores] = await db.query(`
                SELECT 
                    i.id as inscricao_id,
                    i.nome,
                    i.email,
                    i.deck_nome,
                    h.posicao_final
                FROM mesa_jogadores mj
                JOIN inscricoes i ON mj.inscricao_id = i.id
                LEFT JOIN precons p ON i.deck_id = p.id
                LEFT JOIN historico_partidas h ON h.mesa_id = mj.mesa_id AND h.jogador_id = i.id
                WHERE mj.mesa_id = ?
                ORDER BY mj.posicao
            `, [mesa.id]);
            
            mesa.jogadores = jogadores;
        }
        
        res.json(mesas);
    } catch (error) {
        console.error('Erro ao buscar minhas mesas:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== MESAS CASUAIS ==========

// Listar mesas casuais abertas
app.get('/api/mesas-casuais', betaBlockMiddleware, async (req, res) => {
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
app.post('/api/mesas-casuais', betaBlockMiddleware, authMiddleware, async (req, res) => {
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
app.post('/api/mesas-casuais/:id/join', betaBlockMiddleware, authMiddleware, async (req, res) => {
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
app.delete('/api/mesas-casuais/:id/leave', betaBlockMiddleware, authMiddleware, async (req, res) => {
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
app.put('/api/mesas-casuais/:id', betaBlockMiddleware, authMiddleware, async (req, res) => {
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
app.delete('/api/mesas-casuais/:id', betaBlockMiddleware, authMiddleware, async (req, res) => {
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
app.get('/api/perfil/:email', betaBlockMiddleware, async (req, res) => {
    try {
        const { email } = req.params;
        
        // Verificar se tabela perfis_usuarios existe
        const [tables] = await db.query("SHOW TABLES LIKE 'perfis_usuarios'");
        const temPerfis = tables.length > 0;
        
        // Buscar dados do perfil (se a tabela existir)
        let perfil = [{ email }];
        if (temPerfis) {
            perfil = await db.query(`
                SELECT * FROM perfis_usuarios WHERE email = ?
            `, [email]);
            perfil = perfil[0];
        }
        
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
app.put('/api/perfil', betaBlockMiddleware, authMiddleware, async (req, res) => {
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
app.get('/api/ranking', betaBlockMiddleware, async (req, res) => {
    try {
        const { campeonato_id } = req.query;
        
        // Verificar se tabela perfis_usuarios existe
        const [tables] = await db.query("SHOW TABLES LIKE 'perfis_usuarios'");
        const temPerfis = tables.length > 0;
        
        let query = `
            SELECT 
                i.email,
                ${temPerfis ? 'MAX(pu.nome)' : 'MAX(i.nome)'} as nome,
                SUM(i.pontos) as pontos_totais,
                SUM(i.vitorias) as vitorias_totais,
                SUM(i.segundos_lugares) as segundos_totais,
                COUNT(DISTINCT i.campeonato_id) as campeonatos_participados,
                COUNT(DISTINCT h.id) as total_partidas,
                ROUND(SUM(i.vitorias) * 100.0 / NULLIF(COUNT(DISTINCT h.id), 0), 1) as winrate
            FROM inscricoes i
            ${temPerfis ? 'LEFT JOIN perfis_usuarios pu ON i.email = pu.email' : ''}
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

// ========== CAMPEONATOS ==========
app.get('/api/campeonatos', async (req, res) => {
    try {
        const [campeonatos] = await db.query(`
            SELECT * FROM campeonatos ORDER BY data_inicio DESC
        `);
        res.json(campeonatos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/campeonatos/:id', async (req, res) => {
    try {
        const [campeonatos] = await db.query(
            'SELECT * FROM campeonatos WHERE id = ?',
            [req.params.id]
        );
        
        if (campeonatos.length === 0) {
            return res.status(404).json({ error: 'Campeonato não encontrado' });
        }
        
        res.json(campeonatos[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/campeonatos', async (req, res) => {
    try {
        const { nome, edicao, data_inicio, descricao } = req.body;
        const [result] = await db.query(
            'INSERT INTO campeonatos (nome, edicao, data_inicio, descricao) VALUES (?, ?, ?, ?)',
            [nome, edicao, data_inicio, descricao]
        );
        res.json({ id: result.insertId, nome, edicao, data_inicio, descricao });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/campeonatos/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        await db.query(
            'UPDATE campeonatos SET status = ? WHERE id = ?',
            [status, req.params.id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Buscar tema do campeonato ativo
app.get('/api/tema', async (req, res) => {
    console.log('🎨 Requisição /api/tema recebida');
    try {
        console.log('  - Tentando conectar no banco...');
        const [campeonatos] = await db.query(`
            SELECT cor_primaria, cor_secundaria, cor_destaque, cor_header, logo_url, nome, edicao, data_fim_inscricoes
            FROM campeonatos 
            WHERE status IN ('inscricoes', 'em_andamento')
            ORDER BY data_inicio DESC 
            LIMIT 1
        `);
        
        console.log('  - Query executada com sucesso');
        console.log('  - Campeonatos encontrados:', campeonatos.length);
        
        if (campeonatos.length === 0) {
            console.log('  - Nenhum campeonato ativo, usando tema padrão');
            // Tema padrão
            return res.json({
                cor_primaria: '#2563eb',
                cor_secundaria: '#16a34a',
                cor_destaque: '#dc2626',
                cor_header: '#ffffff',
                logo_url: null,
                nome: 'Precompeonato',
                edicao: ''
            });
        }
        
        console.log('  - Tema encontrado:', campeonatos[0].nome);
        res.json(campeonatos[0]);
    } catch (error) {
        console.error('❌ Erro em /api/tema:');
        console.error('  - Message:', error.message);
        console.error('  - Code:', error.code);
        console.error('  - SQL State:', error.sqlState);
        console.error('  - SQL Message:', error.sqlMessage);
        res.status(500).json({ 
            error: error.message,
            code: error.code,
            details: error.sqlMessage 
        });
    }
});

// ========== PRECONS ==========
app.get('/api/precons', async (req, res) => {
    try {
        console.log('📊 GET /api/precons - Iniciando...');
        const { busca } = req.query;
        let query = 'SELECT * FROM precons WHERE banido = FALSE';
        let params = [];
        
        if (busca) {
            query += ' AND (nome LIKE ? OR comandante_principal LIKE ? OR comandante_secundario LIKE ? OR set_nome LIKE ?)';
            const searchTerm = `%${busca}%`;
            params = [searchTerm, searchTerm, searchTerm, searchTerm];
        }
        
        query += ' ORDER BY ano DESC, nome ASC';
        
        console.log('   Query:', query);
        const [precons] = await db.query(query, params);
        console.log('✅ GET /api/precons - Sucesso:', precons.length, 'registros');
        res.json(precons);
    } catch (error) {
        logSQLError('GET /api/precons', error, 'SELECT * FROM precons...');
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/precons', async (req, res) => {
    try {
        const { nome, set_nome, comandante, cores, ano } = req.body;
        const [result] = await db.query(
            'INSERT INTO precons (nome, set_nome, comandante, cores, ano) VALUES (?, ?, ?, ?, ?)',
            [nome, set_nome, comandante, cores, ano]
        );
        res.json({ id: result.insertId, nome, set_nome, comandante, cores, ano });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Buscar comandantes disponíveis de um precon (para partner)
app.get('/api/precons/:id/comandantes', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar se a tabela precon_comandantes existe
        const [tables] = await db.query("SHOW TABLES LIKE 'precon_comandantes'");
        
        if (tables.length === 0) {
            // Tabela não existe, usar estrutura antiga (comandante_principal e secundario)
            const [precons] = await db.query(
                'SELECT comandante_principal, comandante_secundario FROM precons WHERE id = ?',
                [id]
            );
            
            if (precons.length === 0) {
                return res.status(404).json({ error: 'Precon não encontrado' });
            }
            
            const comandantes = [];
            if (precons[0].comandante_principal) {
                comandantes.push({
                    comandante: precons[0].comandante_principal,
                    ordem: 1,
                    tem_partner: false
                });
            }
            if (precons[0].comandante_secundario) {
                comandantes.push({
                    comandante: precons[0].comandante_secundario,
                    ordem: 2,
                    tem_partner: false
                });
            }
            
            return res.json({
                tem_partner: false,
                comandantes
            });
        }
        
        // Tabela existe, usar nova estrutura
        const [comandantes] = await db.query(
            'SELECT comandante, ordem, tem_partner FROM precon_comandantes WHERE precon_id = ? ORDER BY ordem',
            [id]
        );
        
        if (comandantes.length === 0) {
            return res.status(404).json({ error: 'Nenhum comandante encontrado para este precon' });
        }
        
        // Verificar se algum tem partner
        const temPartner = comandantes.some(c => c.tem_partner);
        
        res.json({
            tem_partner: temPartner,
            comandantes
        });
    } catch (error) {
        console.error('Erro ao buscar comandantes:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== EMAILS PERMITIDOS ==========
app.get('/api/emails-permitidos', async (req, res) => {
    try {
        const [emails] = await db.query(`
            SELECT 
                ep.email,
                MAX(i.nome) as nome
            FROM emails_permitidos ep
            LEFT JOIN inscricoes i ON ep.email = i.email AND i.ativo = TRUE
            WHERE ep.ativo = TRUE
            GROUP BY ep.email
            ORDER BY ep.email
        `);
        res.json(emails);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/emails-permitidos', async (req, res) => {
    try {
        const { email } = req.body;
        await db.query('INSERT INTO emails_permitidos (email) VALUES (?)', [email.toLowerCase()]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/emails-permitidos/:email', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { email } = req.params;
        await db.query('UPDATE emails_permitidos SET ativo = FALSE WHERE email = ?', [email.toLowerCase()]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== INSCRIÇÕES ==========
app.get('/api/inscricoes', betaBlockMiddleware, async (req, res) => {
    try {
        const [inscricoes] = await db.query(`
            SELECT i.*, p.nome as deck_nome_completo, p.comandante_principal as comandante, p.set_nome
            FROM inscricoes i
            LEFT JOIN precons p ON i.deck_id = p.id
            WHERE i.ativo = TRUE
            ORDER BY i.pontos DESC, i.vitorias DESC
        `);
        res.json(inscricoes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/inscricoes', betaBlockMiddleware, async (req, res) => {
    try {
        const { nome, email, discord, whatsapp, deckId, deckNome, campeonatoId, comandante_1, comandante_2 } = req.body;
        
        // Se não especificar campeonato, pegar o ativo
        let campId = campeonatoId;
        if (!campId) {
            const [campAtivo] = await db.query(
                "SELECT id FROM campeonatos WHERE status = 'inscricoes' ORDER BY data_inicio DESC LIMIT 1"
            );
            if (campAtivo.length === 0) {
                return res.status(400).json({ error: 'Nenhum campeonato com inscrições abertas' });
            }
            campId = campAtivo[0].id;
        }
        
        // Validar email
        const [emailCheck] = await db.query(
            'SELECT email FROM emails_permitidos WHERE email = ? AND ativo = TRUE',
            [email.toLowerCase()]
        );
        
        if (emailCheck.length === 0) {
            return res.status(403).json({ error: 'Email não autorizado' });
        }
        
        // Verificar se já está inscrito neste campeonato
        const [existente] = await db.query(
            'SELECT id FROM inscricoes WHERE email = ? AND campeonato_id = ?',
            [email.toLowerCase(), campId]
        );
        
        if (existente.length > 0) {
            return res.status(400).json({ error: 'Email já cadastrado neste campeonato' });
        }
        
        // Verificar se a tabela tem as novas colunas comandante_1 e comandante_2
        const [columns] = await db.query("SHOW COLUMNS FROM inscricoes LIKE 'comandante_%'");
        
        if (columns.length > 0) {
            // Nova estrutura com comandante_1 e comandante_2
            const [result] = await db.query(
                'INSERT INTO inscricoes (campeonato_id, nome, email, discord, whatsapp, deck_id, deck_nome, comandante_1, comandante_2) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [campId, nome, email.toLowerCase(), discord, whatsapp, deckId, deckNome, comandante_1, comandante_2]
            );
            
            res.json({ 
                id: result.insertId, 
                campeonatoId: campId,
                nome, 
                email: email.toLowerCase(),
                discord,
                whatsapp,
                deckId,
                deckNome,
                comandante_1,
                comandante_2
            });
        } else {
            // Estrutura antiga com cd_comandante
            const cdComandante = req.body.cdComandante || 1;
            const [result] = await db.query(
                'INSERT INTO inscricoes (campeonato_id, nome, email, discord, whatsapp, deck_id, cd_comandante, deck_nome) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [campId, nome, email.toLowerCase(), discord, whatsapp, deckId, cdComandante, deckNome]
            );
            
            res.json({ 
                id: result.insertId, 
                campeonatoId: campId,
                nome, 
                email: email.toLowerCase(),
                discord,
                whatsapp,
                deckId,
                cdComandante,
                deckNome 
            });
        }
    } catch (error) {
        console.error('Erro ao criar inscrição:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== RODADAS ==========
app.get('/api/rodadas', async (req, res) => {
    try {
        const [rodadas] = await db.query(`
            SELECT * FROM rodadas ORDER BY numero DESC
        `);
        
        for (let rodada of rodadas) {
            // Converter data_rodada para formato ISO string se existir
            if (rodada.data_rodada) {
                rodada.data_rodada = new Date(rodada.data_rodada).toISOString().split('T')[0];
            }
            
            const [mesas] = await db.query(`
                SELECT m.*, 
                       v.nome as vencedor_nome,
                       s.nome as segundo_nome,
                       m.ic_empate
                FROM mesas m
                LEFT JOIN inscricoes v ON m.vencedor_id = v.id
                LEFT JOIN inscricoes s ON m.segundo_id = s.id
                WHERE m.rodada_id = ?
                ORDER BY m.numero_mesa
            `, [rodada.id]);
            
            for (let mesa of mesas) {
                // Buscar jogadores da mesa
                const [jogadores] = await db.query(`
                    SELECT 
                        i.id, 
                        i.nome, 
                        i.deck_nome
                    FROM mesa_jogadores mj
                    JOIN inscricoes i ON mj.inscricao_id = i.id
                    LEFT JOIN precons p ON i.deck_id = p.id
                    WHERE mj.mesa_id = ?
                    ORDER BY mj.posicao
                `, [mesa.id]);
                
                mesa.jogadores = jogadores;
            }
            
            rodada.mesas = mesas;
        }
        
        res.json(rodadas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/rodadas', async (req, res) => {
    try {
        const { numero, data_rodada } = req.body;
        const [result] = await db.query(
            'INSERT INTO rodadas (numero, data_rodada) VALUES (?, ?)',
            [numero, data_rodada]
        );
        res.json({ id: result.insertId, numero, data_rodada });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== PAREAMENTO ==========
app.post('/api/parear', async (req, res) => {
    try {
        const { rodadaNumero, dataRodada } = req.body;
        
        // Criar rodada
        const [rodadaResult] = await db.query(
            'INSERT INTO rodadas (numero, data_rodada) VALUES (?, ?)',
            [rodadaNumero, dataRodada || new Date()]
        );
        const rodadaId = rodadaResult.insertId;
        
        // Buscar jogadores ativos ordenados por pontos
        const [jogadores] = await db.query(`
            SELECT * FROM inscricoes 
            WHERE ativo = TRUE 
            ORDER BY pontos DESC, vitorias DESC, RAND()
        `);
        
        if (jogadores.length < 4) {
            return res.status(400).json({ error: 'Mínimo de 4 jogadores necessários' });
        }
        
        // Criar mesas de 4 jogadores
        const mesas = [];
        for (let i = 0; i < jogadores.length; i += 4) {
            const jogadoresMesa = jogadores.slice(i, i + 4);
            
            if (jogadoresMesa.length >= 2) {
                const numeroMesa = Math.floor(i / 4) + 1;
                
                // Criar mesa
                const [mesaResult] = await db.query(
                    'INSERT INTO mesas (rodada_id, numero_mesa) VALUES (?, ?)',
                    [rodadaId, numeroMesa]
                );
                const mesaId = mesaResult.insertId;
                
                // Adicionar jogadores à mesa
                for (let j = 0; j < jogadoresMesa.length; j++) {
                    await db.query(
                        'INSERT INTO mesa_jogadores (mesa_id, inscricao_id, posicao) VALUES (?, ?, ?)',
                        [mesaId, jogadoresMesa[j].id, j + 1]
                    );
                }
                
                mesas.push({ numero: numeroMesa, jogadores: jogadoresMesa.length });
            }
        }
        
        res.json({ 
            rodadaId, 
            numero: rodadaNumero, 
            mesasCriadas: mesas.length,
            totalJogadores: jogadores.length 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== RESULTADO ==========
app.post('/api/resultado', async (req, res) => {
    try {
        const { mesaId, vencedorId, segundoId } = req.body;
        
        // Buscar informações da mesa
        const [mesa] = await db.query(`
            SELECT m.*, r.campeonato_id, r.numero as rodada_numero, r.data_rodada
            FROM mesas m
            JOIN rodadas r ON m.rodada_id = r.id
            WHERE m.id = ?
        `, [mesaId]);
        
        if (mesa.length === 0) {
            return res.status(404).json({ error: 'Mesa não encontrada' });
        }
        
        const mesaInfo = mesa[0];
        
        // Buscar jogadores da mesa
        const [jogadores] = await db.query(`
            SELECT mj.*, i.deck_id, i.email
            FROM mesa_jogadores mj
            JOIN inscricoes i ON mj.inscricao_id = i.id
            WHERE mj.mesa_id = ?
            ORDER BY mj.posicao
        `, [mesaId]);
        
        // Atualizar mesa
        await db.query(
            'UPDATE mesas SET vencedor_id = ?, segundo_id = ?, finalizada = TRUE WHERE id = ?',
            [vencedorId, segundoId, mesaId]
        );
        
        // Atualizar pontos do vencedor
        await db.query(
            'UPDATE inscricoes SET pontos = pontos + 3, vitorias = vitorias + 1 WHERE id = ?',
            [vencedorId]
        );
        
        // Atualizar pontos do segundo
        if (segundoId) {
            await db.query(
                'UPDATE inscricoes SET pontos = pontos + 1, segundos_lugares = segundos_lugares + 1 WHERE id = ?',
                [segundoId]
            );
        }
        
        // Registrar histórico para cada jogador
        for (const jogador of jogadores) {
            const posicaoFinal = jogador.inscricao_id === vencedorId ? 1 : 
                                 jogador.inscricao_id === segundoId ? 2 : 
                                 jogadores.length;
            const pontosGanhos = posicaoFinal === 1 ? 3 : posicaoFinal === 2 ? 1 : 0;
            
            // Pegar oponentes
            const oponentes = jogadores.filter(j => j.inscricao_id !== jogador.inscricao_id);
            
            await db.query(`
                INSERT INTO historico_partidas 
                (mesa_id, campeonato_id, jogador_id, deck_id, posicao_final, pontos_ganhos,
                 oponente1_id, oponente1_deck_id, oponente2_id, oponente2_deck_id, 
                 oponente3_id, oponente3_deck_id, data_partida)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                mesaId,
                mesaInfo.campeonato_id,
                jogador.inscricao_id,
                jogador.deck_id,
                posicaoFinal,
                pontosGanhos,
                oponentes[0]?.inscricao_id || null,
                oponentes[0]?.deck_id || null,
                oponentes[1]?.inscricao_id || null,
                oponentes[1]?.deck_id || null,
                oponentes[2]?.inscricao_id || null,
                oponentes[2]?.deck_id || null,
                mesaInfo.data_rodada
            ]);
        }
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== ADMIN ENDPOINTS ==========

// Listar rodadas com estatísticas (admin)
app.get('/api/admin/rodadas', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const [rodadas] = await db.query(`
            SELECT 
                r.id,
                r.campeonato_id,
                r.numero,
                r.data_rodada,
                r.created_at,
                MAX(c.nome) as campeonato_nome,
                COUNT(DISTINCT m.id) as total_mesas,
                SUM(CASE WHEN m.finalizada = TRUE THEN 1 ELSE 0 END) as mesas_finalizadas
            FROM rodadas r
            JOIN campeonatos c ON r.campeonato_id = c.id
            LEFT JOIN mesas m ON r.id = m.rodada_id
            GROUP BY r.id, r.campeonato_id, r.numero, r.data_rodada, r.created_at
            ORDER BY r.numero DESC
        `);
        
        // Converter data_rodada para formato ISO string
        rodadas.forEach(r => {
            if (r.data_rodada) {
                r.data_rodada = new Date(r.data_rodada).toISOString().split('T')[0];
            }
        });
        
        res.json(rodadas);
    } catch (error) {
        console.error('❌ Erro ao buscar rodadas:', error);
        res.status(500).json({ error: error.message });
    }
});

// Listar mesas de uma rodada (admin)
app.get('/api/admin/rodadas/:id/mesas', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const [mesas] = await db.query(`
            SELECT m.*, 
                   v.nome as vencedor_nome,
                   s.nome as segundo_nome
            FROM mesas m
            LEFT JOIN inscricoes v ON m.vencedor_id = v.id
            LEFT JOIN inscricoes s ON m.segundo_id = s.id
            WHERE m.rodada_id = ?
            ORDER BY m.numero_mesa
        `, [id]);
        
        for (let mesa of mesas) {
            const [jogadores] = await db.query(`
                SELECT 
                    i.id,
                    i.nome,
                    i.deck_nome,
                    mj.posicao_final
                FROM mesa_jogadores mj
                JOIN inscricoes i ON mj.inscricao_id = i.id
                LEFT JOIN precons p ON i.deck_id = p.id
                WHERE mj.mesa_id = ?
                ORDER BY mj.posicao
            `, [mesa.id]);
            
            mesa.jogadores = jogadores;
        }
        
        res.json(mesas);
    } catch (error) {
        console.error('❌ Erro ao buscar mesas:', error);
        res.status(500).json({ error: error.message });
    }
});

// Buscar detalhes de uma mesa (admin)
app.get('/api/admin/mesas/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const [mesas] = await db.query('SELECT * FROM mesas WHERE id = ?', [id]);
        
        if (mesas.length === 0) {
            return res.status(404).json({ error: 'Mesa não encontrada' });
        }
        
        const mesa = mesas[0];
        
        const [jogadores] = await db.query(`
            SELECT 
                mj.inscricao_id,
                i.nome,
                i.deck_nome
            FROM mesa_jogadores mj
            JOIN inscricoes i ON mj.inscricao_id = i.id
            LEFT JOIN precons p ON i.deck_id = p.id
            WHERE mj.mesa_id = ?
            ORDER BY mj.posicao
        `, [id]);
        
        mesa.jogadores = jogadores;
        
        res.json(mesa);
    } catch (error) {
        console.error('❌ Erro ao buscar mesa:', error);
        res.status(500).json({ error: error.message });
    }
});

// Listar mesas pendentes (admin)
app.get('/api/admin/mesas-pendentes', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const [mesas] = await db.query(`
            SELECT 
                m.*,
                r.numero as rodada_numero,
                c.nome as campeonato_nome
            FROM mesas m
            JOIN rodadas r ON m.rodada_id = r.id
            JOIN campeonatos c ON r.campeonato_id = c.id
            WHERE m.finalizada = FALSE
            ORDER BY r.numero, m.numero_mesa
        `);
        
        for (let mesa of mesas) {
            const [jogadores] = await db.query(`
                SELECT 
                    i.nome,
                    i.deck_nome
                FROM mesa_jogadores mj
                JOIN inscricoes i ON mj.inscricao_id = i.id
                WHERE mj.mesa_id = ?
                ORDER BY mj.posicao
            `, [mesa.id]);
            
            mesa.jogadores = jogadores;
        }
        
        res.json(mesas);
    } catch (error) {
        console.error('❌ Erro ao buscar mesas pendentes:', error);
        res.status(500).json({ error: error.message });
    }
});

// Gerar pareamento (admin)
app.post('/api/admin/parear', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { campeonatoId, numero, dataRodada } = req.body;
        
        console.log(`📊 Gerando pareamento - Rodada ${numero} - Campeonato ${campeonatoId}`);
        
        // Criar rodada
        const [rodadaResult] = await db.query(
            'INSERT INTO rodadas (campeonato_id, numero, data_rodada) VALUES (?, ?, ?)',
            [campeonatoId, numero, dataRodada || new Date()]
        );
        const rodadaId = rodadaResult.insertId;
        console.log(`   ✓ Rodada ${numero} criada (ID: ${rodadaId})`);
        
        // Buscar jogadores ativos do campeonato
        const [jogadores] = await db.query(`
            SELECT 
                id, 
                nome, 
                email, 
                deck_id, 
                deck_nome,
                pontos,
                COALESCE(pontos_cumulativos, 0) as pontos_cumulativos,
                vitorias
            FROM inscricoes 
            WHERE campeonato_id = ? AND ativo = TRUE 
            ORDER BY pontos DESC, pontos_cumulativos DESC, vitorias DESC
        `, [campeonatoId]);
        
        if (jogadores.length < 4) {
            return res.status(400).json({ error: 'Mínimo de 4 jogadores necessários' });
        }
        
        console.log(`   ✓ ${jogadores.length} jogadores ativos encontrados`);
        
        // Gerar pareamento usando o algoritmo suíço
        const { gerarPareamento, atualizarHistoricoOponentes } = require('./pareamento');
        const mesas = await gerarPareamento(jogadores, numero, db, campeonatoId);
        
        console.log(`   ✓ ${mesas.length} mesas geradas`);
        
        // Criar mesas no banco
        const mesasCriadas = [];
        for (let i = 0; i < mesas.length; i++) {
            const jogadoresMesa = mesas[i];
            const numeroMesa = i + 1;
            
            // Criar mesa
            const [mesaResult] = await db.query(
                'INSERT INTO mesas (rodada_id, numero_mesa) VALUES (?, ?)',
                [rodadaId, numeroMesa]
            );
            const mesaId = mesaResult.insertId;
            
            // Adicionar jogadores à mesa
            for (let j = 0; j < jogadoresMesa.length; j++) {
                await db.query(
                    'INSERT INTO mesa_jogadores (mesa_id, inscricao_id, posicao) VALUES (?, ?, ?)',
                    [mesaId, jogadoresMesa[j].id, j + 1]
                );
            }
            
            // Atualizar histórico de oponentes
            await atualizarHistoricoOponentes(db, campeonatoId, mesaId, jogadoresMesa, numero);
            
            mesasCriadas.push({ 
                numero: numeroMesa, 
                jogadores: jogadoresMesa.map(j => j.nome)
            });
            
            console.log(`   ✓ Mesa ${numeroMesa}: ${jogadoresMesa.map(j => j.nome).join(', ')}`);
        }
        
        console.log(`✅ Pareamento concluído!`);
        
        res.json({ 
            rodadaId, 
            numero, 
            mesasCriadas: mesas.length,
            totalJogadores: jogadores.length,
            mesas: mesasCriadas
        });
    } catch (error) {
        console.error('❌ Erro ao gerar pareamento:', error);
        res.status(500).json({ error: error.message });
    }
});

// Salvar resultado (admin)
app.post('/api/admin/resultado', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { mesaId, vencedorId, segundoId } = req.body;
        
        console.log(`📊 Salvando resultado - Mesa ${mesaId}`);
        
        // Buscar informações da mesa
        const [mesa] = await db.query(`
            SELECT m.*, r.campeonato_id, r.numero as rodada_numero, r.data_rodada
            FROM mesas m
            JOIN rodadas r ON m.rodada_id = r.id
            WHERE m.id = ?
        `, [mesaId]);
        
        if (mesa.length === 0) {
            return res.status(404).json({ error: 'Mesa não encontrada' });
        }
        
        const mesaInfo = mesa[0];
        
        // Buscar jogadores da mesa
        const [jogadores] = await db.query(`
            SELECT mj.*, i.deck_id, i.email
            FROM mesa_jogadores mj
            JOIN inscricoes i ON mj.inscricao_id = i.id
            WHERE mj.mesa_id = ?
            ORDER BY mj.posicao
        `, [mesaId]);
        
        // Atualizar mesa
        await db.query(
            'UPDATE mesas SET vencedor_id = ?, segundo_id = ?, finalizada = TRUE WHERE id = ?',
            [vencedorId, segundoId, mesaId]
        );
        
        // Atualizar pontos e pontos cumulativos do vencedor (3 pontos)
        await db.query(
            'UPDATE inscricoes SET pontos = pontos + 3, pontos_cumulativos = pontos_cumulativos + 3, vitorias = vitorias + 1 WHERE id = ?',
            [vencedorId]
        );
        console.log(`   ✓ Vencedor atualizado: +3 pontos`);
        
        // Atualizar pontos e pontos cumulativos do segundo (1 ponto)
        if (segundoId) {
            await db.query(
                'UPDATE inscricoes SET pontos = pontos + 1, pontos_cumulativos = pontos_cumulativos + 1, segundos_lugares = segundos_lugares + 1 WHERE id = ?',
                [segundoId]
            );
            console.log(`   ✓ Segundo lugar atualizado: +1 ponto`);
        }
        
        // Registrar histórico para cada jogador
        for (const jogador of jogadores) {
            const posicaoFinal = jogador.inscricao_id === vencedorId ? 1 : 
                                 jogador.inscricao_id === segundoId ? 2 : 
                                 jogadores.length === 4 ? (jogador.inscricao_id === jogadores[2].inscricao_id ? 3 : 4) : 3;
            const pontosGanhos = posicaoFinal === 1 ? 3 : posicaoFinal === 2 ? 1 : 0;
            
            // Pegar oponentes
            const oponentes = jogadores.filter(j => j.inscricao_id !== jogador.inscricao_id);
            
            await db.query(`
                INSERT INTO historico_partidas 
                (mesa_id, campeonato_id, jogador_id, deck_id, posicao_final, pontos_ganhos,
                 oponente1_id, oponente1_deck_id, oponente2_id, oponente2_deck_id, 
                 oponente3_id, oponente3_deck_id, data_partida)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                mesaId,
                mesaInfo.campeonato_id,
                jogador.inscricao_id,
                jogador.deck_id,
                posicaoFinal,
                pontosGanhos,
                oponentes[0]?.inscricao_id || null,
                oponentes[0]?.deck_id || null,
                oponentes[1]?.inscricao_id || null,
                oponentes[1]?.deck_id || null,
                oponentes[2]?.inscricao_id || null,
                oponentes[2]?.deck_id || null,
                mesaInfo.data_rodada
            ]);
            
            console.log(`   ✓ Histórico registrado: ${jogador.inscricao_id} - ${posicaoFinal}º lugar (+${pontosGanhos} pontos)`);
        }
        
        console.log(`✅ Resultado salvo com sucesso!`);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Erro ao salvar resultado:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== METAGAME ==========
app.get('/api/metagame', async (req, res) => {
    console.log('📊 GET /api/metagame - Iniciando...');
    try {
        const query = `
            SELECT 
                MAX(p.nome) as deck,
                MAX(CASE 
                    WHEN i.cd_comandante = 2 AND p.comandante_secundario IS NOT NULL 
                    THEN p.comandante_secundario 
                    ELSE p.comandante_principal 
                END) as comandante,
                MAX(p.set_nome) as set_nome,
                COUNT(i.id) as uso,
                SUM(COALESCE(i.vitorias, 0)) as vitorias,
                ROUND((SUM(COALESCE(i.vitorias, 0)) * 100.0 / NULLIF(COUNT(i.id), 0)), 1) as win_rate
            FROM precons p
            LEFT JOIN inscricoes i ON p.id = i.deck_id AND i.ativo = TRUE
            GROUP BY p.id, i.cd_comandante
            HAVING COUNT(i.id) > 0
            ORDER BY COUNT(i.id) DESC, SUM(COALESCE(i.vitorias, 0)) DESC
        `;
        
        console.log('   Executando query de metagame...');
        const [stats] = await db.query(query);
        
        // Calcular uso_percentual no JavaScript
        const totalUso = stats.reduce((sum, s) => sum + parseInt(s.uso), 0);
        stats.forEach(stat => {
            stat.uso_percentual = totalUso > 0 
                ? parseFloat(((stat.uso * 100.0) / totalUso).toFixed(1))
                : 0;
        });
        
        console.log('✅ GET /api/metagame - Sucesso:', stats.length, 'registros');
        res.json(stats);
    } catch (error) {
        logSQLError('GET /api/metagame', error, 'SELECT MAX(p.nome)... GROUP BY p.id...');
        res.status(500).json({ error: error.message });
    }
});

// ========== ESTATÍSTICAS ==========

// Estatísticas gerais (públicas)
app.get('/api/estatisticas/geral', async (req, res) => {
    console.log('📊 GET /api/estatisticas/geral - Iniciando...');
    try {
        const { campeonato_id } = req.query;
        const campeonatoFilter = campeonato_id ? 'WHERE h.campeonato_id = ?' : '';
        const params = campeonato_id ? [campeonato_id] : [];
        
        console.log('   Campeonato ID:', campeonato_id || 'todos');
        
        // Números gerais do histórico
        console.log('   1/4 - Buscando estatísticas gerais...');
        const [statsGerais] = await db.query(`
            SELECT 
                COUNT(DISTINCT h.jogador_id) as total_jogadores,
                COUNT(DISTINCT h.deck_id) as total_decks,
                COUNT(DISTINCT h.mesa_id) as total_partidas,
                COUNT(DISTINCT r.id) as total_rodadas
            FROM historico_partidas h
            JOIN mesas m ON h.mesa_id = m.id
            JOIN rodadas r ON m.rodada_id = r.id
            ${campeonatoFilter}
        `, params);
        
        // Se não há histórico, buscar dados das inscrições e mesas
        let totalJogadores = parseInt(statsGerais[0].total_jogadores);
        let totalDecks = parseInt(statsGerais[0].total_decks);
        let totalPartidas = parseInt(statsGerais[0].total_partidas);
        let totalRodadas = parseInt(statsGerais[0].total_rodadas);
        
        if (totalPartidas === 0) {
            console.log('   ⚠️  Sem histórico de partidas, buscando dados das inscrições...');
            
            // Buscar dados das inscrições
            let queryInscricoes = `
                SELECT 
                    COUNT(DISTINCT i.id) as total_jogadores,
                    COUNT(DISTINCT i.deck_id) as total_decks
                FROM inscricoes i
                WHERE i.ativo = TRUE
            `;
            
            let paramsInscricoes = [];
            if (campeonato_id) {
                queryInscricoes = `
                    SELECT 
                        COUNT(DISTINCT i.id) as total_jogadores,
                        COUNT(DISTINCT i.deck_id) as total_decks
                    FROM inscricoes i
                    WHERE i.campeonato_id = ? AND i.ativo = TRUE
                `;
                paramsInscricoes = [campeonato_id];
            }
            
            const [statsInscricoes] = await db.query(queryInscricoes, paramsInscricoes);
            
            totalJogadores = parseInt(statsInscricoes[0].total_jogadores);
            totalDecks = parseInt(statsInscricoes[0].total_decks);
            
            // Buscar rodadas criadas
            const rodadasFilter = campeonato_id ? 'WHERE r.campeonato_id = ?' : '';
            const [statsRodadas] = await db.query(`
                SELECT COUNT(DISTINCT r.id) as total_rodadas
                FROM rodadas r
                ${rodadasFilter}
            `, params);
            
            totalRodadas = parseInt(statsRodadas[0].total_rodadas);
        }
        
        console.log('   ✓ Estatísticas gerais OK');
        
        // Metagame - Decks mais usados
        console.log('   2/4 - Buscando metagame...');
        
        // Verificar se tabela tem nova estrutura (comandante_1/comandante_2)
        const [columns] = await db.query("SHOW COLUMNS FROM inscricoes LIKE 'comandante_%'");
        const temNovaEstrutura = columns.length > 0;
        
        let metagame;
        
        // Se não há histórico, buscar das inscrições
        if (totalPartidas === 0) {
            console.log('   ⚠️  Sem histórico, buscando metagame das inscrições...');
            
            let queryMetagame = `
                SELECT 
                    p.nome as deck_nome,
                    p.comandante_principal as comandante,
                    p.set_nome,
                    COUNT(i.id) as vezes_usado,
                    0 as vitorias,
                    0 as winrate,
                    ROUND((COUNT(i.id) * 100.0 / (SELECT COUNT(*) FROM inscricoes i2 WHERE i2.ativo = TRUE)), 1) as porcentagem
                FROM inscricoes i
                JOIN precons p ON i.deck_id = p.id
                WHERE i.ativo = TRUE
                GROUP BY p.id
                ORDER BY COUNT(i.id) DESC
                LIMIT 20
            `;
            
            let paramsMetagame = [];
            if (campeonato_id) {
                queryMetagame = `
                    SELECT 
                        p.nome as deck_nome,
                        p.comandante_principal as comandante,
                        p.set_nome,
                        COUNT(i.id) as vezes_usado,
                        0 as vitorias,
                        0 as winrate,
                        ROUND((COUNT(i.id) * 100.0 / (SELECT COUNT(*) FROM inscricoes i2 WHERE i2.campeonato_id = ? AND i2.ativo = TRUE)), 1) as porcentagem
                    FROM inscricoes i
                    JOIN precons p ON i.deck_id = p.id
                    WHERE i.campeonato_id = ? AND i.ativo = TRUE
                    GROUP BY p.id
                    ORDER BY COUNT(i.id) DESC
                    LIMIT 20
                `;
                paramsMetagame = [campeonato_id, campeonato_id];
            }
            
            [metagame] = await db.query(queryMetagame, paramsMetagame);
        } else {
            // Buscar do histórico
            if (temNovaEstrutura) {
                // Nova estrutura com Partner
                [metagame] = await db.query(`
                    SELECT 
                        MAX(p.nome) as deck_nome,
                        CASE 
                            WHEN i.comandante_2 IS NOT NULL THEN CONCAT(i.comandante_1, ' + ', i.comandante_2)
                            ELSE i.comandante_1
                        END as comandante,
                        MAX(p.set_nome) as set_nome,
                        COUNT(h.id) as vezes_usado,
                        SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) as vitorias,
                        ROUND((SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(h.id), 0)), 1) as winrate
                    FROM historico_partidas h
                    JOIN precons p ON h.deck_id = p.id
                    JOIN inscricoes i ON h.jogador_id = i.id
                    ${campeonatoFilter}
                    GROUP BY p.id, i.comandante_1, i.comandante_2
                    ORDER BY COUNT(h.id) DESC, SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) DESC
                    LIMIT 20
                `, params);
            } else {
                // Estrutura antiga
                [metagame] = await db.query(`
                    SELECT 
                        MAX(p.nome) as deck_nome,
                        MAX(CASE 
                            WHEN i.cd_comandante = 2 AND p.comandante_secundario IS NOT NULL 
                            THEN p.comandante_secundario 
                            ELSE p.comandante_principal 
                        END) as comandante,
                        MAX(p.set_nome) as set_nome,
                        COUNT(h.id) as vezes_usado,
                        SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) as vitorias,
                        ROUND((SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(h.id), 0)), 1) as winrate
                    FROM historico_partidas h
                    JOIN precons p ON h.deck_id = p.id
                    JOIN inscricoes i ON h.jogador_id = i.id
                    ${campeonatoFilter}
                    GROUP BY p.id, i.cd_comandante
                    ORDER BY COUNT(h.id) DESC, SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) DESC
                    LIMIT 20
                `, params);
            }
            
            // Calcular porcentagem no JavaScript para evitar problemas com subquery
            const totalPartidasMeta = metagame.reduce((sum, d) => sum + parseInt(d.vezes_usado), 0);
            metagame.forEach(deck => {
                deck.porcentagem = totalPartidasMeta > 0 
                    ? parseFloat(((deck.vezes_usado * 100.0) / totalPartidasMeta).toFixed(1))
                    : 0;
            });
        }
        
        console.log('   ✓ Metagame OK -', metagame.length, 'decks');
        
        // Top decks por win rate (mínimo 3 partidas) - só se houver histórico
        console.log('   3/4 - Buscando top decks...');
        let topDecks = [];
        
        if (totalPartidas > 0) {
            if (temNovaEstrutura) {
                // Nova estrutura com Partner
                [topDecks] = await db.query(`
                    SELECT 
                        MAX(p.nome) as deck_nome,
                        CASE 
                            WHEN i.comandante_2 IS NOT NULL THEN CONCAT(i.comandante_1, ' + ', i.comandante_2)
                            ELSE i.comandante_1
                        END as comandante,
                        COUNT(h.id) as partidas,
                        SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) as vitorias,
                        ROUND((SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(h.id)), 1) as winrate,
                        ROUND(AVG(h.pontos_ganhos), 1) as pontos_medios
                    FROM historico_partidas h
                    JOIN precons p ON h.deck_id = p.id
                    JOIN inscricoes i ON h.jogador_id = i.id
                    ${campeonatoFilter}
                    GROUP BY p.id, i.comandante_1, i.comandante_2
                    HAVING COUNT(h.id) >= 3
                    ORDER BY ROUND((SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(h.id)), 1) DESC, SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) DESC
                    LIMIT 15
                `, params);
            } else {
                // Estrutura antiga
                [topDecks] = await db.query(`
                    SELECT 
                        MAX(p.nome) as deck_nome,
                        MAX(CASE 
                            WHEN i.cd_comandante = 2 AND p.comandante_secundario IS NOT NULL 
                            THEN p.comandante_secundario 
                            ELSE p.comandante_principal 
                        END) as comandante,
                        COUNT(h.id) as partidas,
                        SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) as vitorias,
                        ROUND((SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(h.id)), 1) as winrate,
                        ROUND(AVG(h.pontos_ganhos), 1) as pontos_medios
                    FROM historico_partidas h
                    JOIN precons p ON h.deck_id = p.id
                    JOIN inscricoes i ON h.jogador_id = i.id
                    ${campeonatoFilter}
                    GROUP BY p.id, i.cd_comandante
                    HAVING COUNT(h.id) >= 3
                    ORDER BY ROUND((SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(h.id)), 1) DESC, SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) DESC
                    LIMIT 15
                `, params);
            }
        }
        console.log('   ✓ Top decks OK -', topDecks.length, 'decks');
        
        // Matchups mais comuns - só se houver histórico
        console.log('   4/4 - Buscando matchups...');
        let matchupsComuns = [];
        
        if (totalPartidas > 0) {
            [matchupsComuns] = await db.query(`
                SELECT 
                    MAX(p1.nome) as deck1,
                    MAX(p2.nome) as deck2,
                    COUNT(*) as total,
                    SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) as deck1_vitorias,
                    SUM(CASE WHEN h.posicao_final != 1 THEN 1 ELSE 0 END) as deck2_vitorias
                FROM historico_partidas h
                JOIN precons p1 ON h.deck_id = p1.id
                JOIN precons p2 ON (
                    p2.id = h.oponente1_deck_id OR 
                    p2.id = h.oponente2_deck_id OR 
                    p2.id = h.oponente3_deck_id
                )
                ${campeonatoFilter}
                GROUP BY p1.id, p2.id
                HAVING COUNT(*) >= 2
                ORDER BY COUNT(*) DESC
                LIMIT 15
            `, params);
        }
        console.log('   ✓ Matchups OK -', matchupsComuns.length, 'matchups');
        
        console.log('✅ GET /api/estatisticas/geral - Sucesso completo!');
        res.json({
            totalJogadores,
            totalDecks,
            totalPartidas,
            totalRodadas,
            metagame,
            topDecks,
            matchupsComuns
        });
    } catch (error) {
        logSQLError('GET /api/estatisticas/geral', error);
        res.status(500).json({ error: error.message });
    }
});

// Estatísticas individuais (por email)
app.get('/api/estatisticas', async (req, res) => {
    try {
        const { email, campeonato_id } = req.query;
        
        if (!email) {
            return res.status(400).json({ error: 'Email é obrigatório' });
        }
        
        // Filtro de campeonato
        const campeonatoFilter = campeonato_id ? 'AND h.campeonato_id = ?' : '';
        const params = campeonato_id ? [email, campeonato_id] : [email];
        
        // Buscar inscrições do jogador
        const [inscricoes] = await db.query(`
            SELECT i.*, c.nome as campeonato_nome, c.edicao
            FROM inscricoes i
            JOIN campeonatos c ON i.campeonato_id = c.id
            WHERE i.email = ? ${campeonatoFilter}
        `, params);
        
        if (inscricoes.length === 0) {
            return res.json({
                totalPartidas: 0,
                totalVitorias: 0,
                winRate: 0,
                totalPontos: 0,
                meusDecks: [],
                performancePorDeck: [],
                matchupsContra: [],
                historico: []
            });
        }
        
        const inscricaoIds = inscricoes.map(i => i.id);
        const inscricaoIdsStr = inscricaoIds.join(',');
        
        // Estatísticas gerais
        const [statsGerais] = await db.query(`
            SELECT 
                COUNT(*) as total_partidas,
                SUM(CASE WHEN posicao_final = 1 THEN 1 ELSE 0 END) as total_vitorias,
                SUM(pontos_ganhos) as total_pontos
            FROM historico_partidas
            WHERE jogador_id IN (${inscricaoIdsStr})
        `);
        
        const stats = statsGerais[0];
        const winRate = stats.total_partidas > 0 
            ? ((stats.total_vitorias / stats.total_partidas) * 100).toFixed(1)
            : 0;
        
        // Decks utilizados
        const [meusDecks] = await db.query(`
            SELECT DISTINCT 
                p.id, 
                MAX(p.nome) as deck_nome, 
                MAX(p.comandante_principal) as comandante, 
                MAX(p.set_nome) as set_nome,
                COUNT(h.id) as vezes_usado
            FROM historico_partidas h
            JOIN precons p ON h.deck_id = p.id
            WHERE h.jogador_id IN (${inscricaoIdsStr})
            GROUP BY p.id
            ORDER BY COUNT(h.id) DESC
        `);
        
        // Performance por deck
        const [performancePorDeck] = await db.query(`
            SELECT 
                MAX(p.nome) as deck_nome,
                MAX(p.comandante_principal) as comandante,
                COUNT(h.id) as partidas,
                SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) as vitorias,
                SUM(CASE WHEN h.posicao_final = 2 THEN 1 ELSE 0 END) as segundos,
                SUM(h.pontos_ganhos) as pontos_totais,
                ROUND((SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(h.id)), 1) as winrate
            FROM historico_partidas h
            JOIN precons p ON h.deck_id = p.id
            WHERE h.jogador_id IN (${inscricaoIdsStr})
            GROUP BY p.id
            ORDER BY SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) DESC, COUNT(h.id) DESC
        `);
        
        // Matchups contra outros decks
        const [matchupsContra] = await db.query(`
            SELECT 
                MAX(p.nome) as deck_oponente,
                MAX(p.comandante_principal) as comandante,
                COUNT(*) as vezes,
                SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) as vitorias,
                COUNT(*) - SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) as derrotas,
                ROUND((SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 1) as winrate
            FROM historico_partidas h
            JOIN precons p ON (
                p.id = h.oponente1_deck_id OR 
                p.id = h.oponente2_deck_id OR 
                p.id = h.oponente3_deck_id
            )
            WHERE h.jogador_id IN (${inscricaoIdsStr})
            GROUP BY p.id
            ORDER BY COUNT(*) DESC
            LIMIT 20
        `);
        
        // Histórico de partidas
        const [historico] = await db.query(`
            SELECT 
                h.*,
                c.nome as campeonato_nome,
                c.edicao,
                r.numero as rodada_numero,
                p.nome as deck_nome,
                p.comandante_principal as comandante,
                i1.nome as oponente1_nome,
                p1.nome as oponente1_deck,
                i2.nome as oponente2_nome,
                p2.nome as oponente2_deck,
                i3.nome as oponente3_nome,
                p3.nome as oponente3_deck
            FROM historico_partidas h
            JOIN campeonatos c ON h.campeonato_id = c.id
            JOIN mesas m ON h.mesa_id = m.id
            JOIN rodadas r ON m.rodada_id = r.id
            JOIN precons p ON h.deck_id = p.id
            LEFT JOIN inscricoes i1 ON h.oponente1_id = i1.id
            LEFT JOIN precons p1 ON h.oponente1_deck_id = p1.id
            LEFT JOIN inscricoes i2 ON h.oponente2_id = i2.id
            LEFT JOIN precons p2 ON h.oponente2_deck_id = p2.id
            LEFT JOIN inscricoes i3 ON h.oponente3_id = i3.id
            LEFT JOIN precons p3 ON h.oponente3_deck_id = p3.id
            WHERE h.jogador_id IN (${inscricaoIdsStr})
            ORDER BY h.data_partida DESC
            LIMIT 50
        `);
        
        res.json({
            totalPartidas: parseInt(stats.total_partidas),
            totalVitorias: parseInt(stats.total_vitorias),
            winRate: parseFloat(winRate),
            totalPontos: parseInt(stats.total_pontos),
            meusDecks,
            performancePorDeck,
            matchupsContra,
            historico
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== LIMPEZA AUTOMÁTICA ==========
// Limpar códigos e sessões expiradas periodicamente

async function limparDadosExpirados() {
    try {
        console.log('🧹 Iniciando limpeza automática...');
        
        // Verificar se as tabelas existem primeiro
        const [tables] = await db.query("SHOW TABLES LIKE 'codigos_verificacao'");
        if (tables.length === 0) {
            console.log('⚠️  Tabela codigos_verificacao não existe, pulando limpeza');
            return;
        }
        
        // Limpar códigos expirados ou usados
        const [resultCodigos] = await db.query(
            'DELETE FROM codigos_verificacao WHERE expira_em < NOW() OR usado = TRUE'
        );
        
        // Limpar sessões expiradas
        const [resultSessoes] = await db.query(
            'DELETE FROM sessoes WHERE expira_em < NOW()'
        );
        
        if (resultCodigos.affectedRows > 0 || resultSessoes.affectedRows > 0) {
            console.log(`🧹 Limpeza automática: ${resultCodigos.affectedRows} códigos e ${resultSessoes.affectedRows} sessões removidos`);
        }
    } catch (error) {
        console.error('❌ Erro na limpeza automática:', error.message);
        console.error('   Stack:', error.stack);
    }
}

// Executar limpeza a cada 5 minutos
setInterval(limparDadosExpirados, 5 * 60 * 1000);

// Executar limpeza inicial ao iniciar o servidor (com delay para não bloquear)
setTimeout(limparDadosExpirados, 30000); // Aumentei para 30 segundos

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
    console.error('❌ Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada não tratada:', reason);
});

// Iniciar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Database: ${process.env.DB_NAME || 'não configurado'}`);
    console.log(`📧 Email: ${process.env.EMAIL_USER ? 'configurado' : 'não configurado'}`);
    console.log(`🧹 Limpeza automática ativada (a cada 5 minutos)`);
    console.log(`✅ Aplicação iniciada com sucesso!`);
});

server.on('error', (error) => {
    console.error('❌ Erro ao iniciar servidor:', error);
    if (error.code === 'EADDRINUSE') {
        console.error(`Porta ${PORT} já está em uso`);
    }
});
