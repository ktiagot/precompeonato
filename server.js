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

app.use(cors());
app.use(express.json());
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

// ========== AUTENTICAÇÃO ==========

// Solicitar código de verificação
app.post('/api/auth/solicitar-codigo', async (req, res) => {
    try {
        if (!transporter) {
            return res.status(503).json({ error: 'Sistema de email não configurado. Contate o administrador.' });
        }
        
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email é obrigatório' });
        }
        
        // Verificar se o email está autorizado (emails_permitidos ou admins)
        const [emailPermitido] = await db.query(
            'SELECT * FROM emails_permitidos WHERE email = ? AND ativo = TRUE',
            [email]
        );
        
        const [admin] = await db.query(
            'SELECT * FROM admins WHERE email = ? AND ativo = TRUE',
            [email]
        );
        
        if (emailPermitido.length === 0 && admin.length === 0) {
            return res.status(403).json({ error: 'Email não autorizado' });
        }
        
        // Gerar código de 6 dígitos
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Salvar código no banco (expira em 15 minutos)
        const expiraEm = new Date(Date.now() + 15 * 60 * 1000);
        await db.query(
            'INSERT INTO codigos_verificacao (email, codigo, expira_em) VALUES (?, ?, ?)',
            [email, codigo, expiraEm]
        );
        
        // Enviar email
        const isAdmin = admin.length > 0;
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
app.post('/api/auth/verificar-codigo', async (req, res) => {
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
app.get('/api/auth/me', authMiddleware, async (req, res) => {
    res.json({
        email: req.user.email,
        isAdmin: req.user.isAdmin
    });
});

// Logout
app.post('/api/auth/logout', authMiddleware, async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        await db.query('DELETE FROM sessoes WHERE token = ?', [token]);
        res.json({ message: 'Logout realizado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao fazer logout' });
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
            SELECT cor_primaria, cor_secundaria, cor_destaque, logo_url, nome, edicao
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
            query += ' AND (nome LIKE ? OR comandante LIKE ? OR set_nome LIKE ?)';
            const searchTerm = `%${busca}%`;
            params = [searchTerm, searchTerm, searchTerm];
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

// ========== EMAILS PERMITIDOS ==========
app.get('/api/emails-permitidos', async (req, res) => {
    try {
        const [emails] = await db.query('SELECT email FROM emails_permitidos WHERE ativo = TRUE');
        res.json(emails.map(e => e.email));
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

// ========== INSCRIÇÕES ==========
app.get('/api/inscricoes', async (req, res) => {
    try {
        const [inscricoes] = await db.query(`
            SELECT i.*, p.nome as deck_nome_completo, p.comandante, p.set_nome
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

app.post('/api/inscricoes', async (req, res) => {
    try {
        const { nome, email, deckId, deckNome, campeonatoId } = req.body;
        
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
        
        // Inserir inscrição
        const [result] = await db.query(
            'INSERT INTO inscricoes (campeonato_id, nome, email, deck_id, deck_nome) VALUES (?, ?, ?, ?, ?)',
            [campId, nome, email.toLowerCase(), deckId, deckNome]
        );
        
        res.json({ 
            id: result.insertId, 
            campeonatoId: campId,
            nome, 
            email: email.toLowerCase(), 
            deckId, 
            deckNome 
        });
    } catch (error) {
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
            const [mesas] = await db.query(`
                SELECT m.*, 
                       v.nome as vencedor_nome,
                       s.nome as segundo_nome
                FROM mesas m
                LEFT JOIN inscricoes v ON m.vencedor_id = v.id
                LEFT JOIN inscricoes s ON m.segundo_id = s.id
                WHERE m.rodada_id = ?
                ORDER BY m.numero_mesa
            `, [rodada.id]);
            
            for (let mesa of mesas) {
                const [jogadores] = await db.query(`
                    SELECT i.id, i.nome, i.deck_nome, p.comandante
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
                    p.comandante,
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
                i.deck_nome,
                p.comandante
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
        
        // Criar rodada
        const [rodadaResult] = await db.query(
            'INSERT INTO rodadas (campeonato_id, numero, data_rodada) VALUES (?, ?, ?)',
            [campeonatoId, numero, dataRodada || new Date()]
        );
        const rodadaId = rodadaResult.insertId;
        
        // Buscar jogadores ativos do campeonato ordenados por pontos
        const [jogadores] = await db.query(`
            SELECT * FROM inscricoes 
            WHERE campeonato_id = ? AND ativo = TRUE 
            ORDER BY pontos DESC, vitorias DESC, RAND()
        `, [campeonatoId]);
        
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
            numero, 
            mesasCriadas: mesas.length,
            totalJogadores: jogadores.length 
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
                MAX(p.comandante) as comandante,
                MAX(p.set_nome) as set_nome,
                COUNT(i.id) as uso,
                SUM(COALESCE(i.vitorias, 0)) as vitorias,
                ROUND((COUNT(i.id) * 100.0 / (SELECT COUNT(*) FROM inscricoes WHERE ativo = TRUE)), 1) as uso_percentual,
                ROUND((SUM(COALESCE(i.vitorias, 0)) * 100.0 / NULLIF(COUNT(i.id), 0)), 1) as win_rate
            FROM precons p
            LEFT JOIN inscricoes i ON p.id = i.deck_id AND i.ativo = TRUE
            GROUP BY p.id
            HAVING uso > 0
            ORDER BY uso DESC, vitorias DESC
        `;
        
        console.log('   Executando query de metagame...');
        const [stats] = await db.query(query);
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
        
        // Números gerais
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
        console.log('   ✓ Estatísticas gerais OK');
        
        // Metagame - Decks mais usados
        console.log('   2/4 - Buscando metagame...');
        const campeonatoFilterSubquery = campeonato_id ? 'WHERE campeonato_id = ?' : '';
        const [metagame] = await db.query(`
            SELECT 
                MAX(p.nome) as deck_nome,
                MAX(p.comandante) as comandante,
                MAX(p.set_nome) as set_nome,
                COUNT(h.id) as vezes_usado,
                SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) as vitorias,
                ROUND((SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(h.id)), 1) as winrate,
                ROUND((COUNT(h.id) * 100.0 / (SELECT COUNT(*) FROM historico_partidas ${campeonatoFilterSubquery})), 1) as porcentagem
            FROM historico_partidas h
            JOIN precons p ON h.deck_id = p.id
            ${campeonatoFilter}
            GROUP BY p.id
            ORDER BY vezes_usado DESC
            LIMIT 20
        `, campeonato_id ? [campeonato_id, ...params] : params);
        console.log('   ✓ Metagame OK -', metagame.length, 'decks');
        
        // Top decks por win rate (mínimo 3 partidas)
        console.log('   3/4 - Buscando top decks...');
        const [topDecks] = await db.query(`
            SELECT 
                MAX(p.nome) as deck_nome,
                MAX(p.comandante) as comandante,
                COUNT(h.id) as partidas,
                SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) as vitorias,
                ROUND((SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(h.id)), 1) as winrate,
                ROUND(AVG(h.pontos_ganhos), 1) as pontos_medios
            FROM historico_partidas h
            JOIN precons p ON h.deck_id = p.id
            ${campeonatoFilter}
            GROUP BY p.id
            HAVING COUNT(h.id) >= 3
            ORDER BY winrate DESC, vitorias DESC
            LIMIT 15
        `, params);
        console.log('   ✓ Top decks OK -', topDecks.length, 'decks');
        
        // Matchups mais comuns
        console.log('   4/4 - Buscando matchups...');
        const [matchupsComuns] = await db.query(`
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
            ORDER BY total DESC
            LIMIT 15
        `, params);
        console.log('   ✓ Matchups OK -', matchupsComuns.length, 'matchups');
        
        console.log('✅ GET /api/estatisticas/geral - Sucesso completo!');
        res.json({
            totalJogadores: parseInt(statsGerais[0].total_jogadores),
            totalDecks: parseInt(statsGerais[0].total_decks),
            totalPartidas: parseInt(statsGerais[0].total_partidas),
            totalRodadas: parseInt(statsGerais[0].total_rodadas),
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
                MAX(p.comandante) as comandante, 
                MAX(p.set_nome) as set_nome,
                COUNT(h.id) as vezes_usado
            FROM historico_partidas h
            JOIN precons p ON h.deck_id = p.id
            WHERE h.jogador_id IN (${inscricaoIdsStr})
            GROUP BY p.id
            ORDER BY vezes_usado DESC
        `);
        
        // Performance por deck
        const [performancePorDeck] = await db.query(`
            SELECT 
                MAX(p.nome) as deck_nome,
                MAX(p.comandante) as comandante,
                COUNT(h.id) as partidas,
                SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) as vitorias,
                SUM(CASE WHEN h.posicao_final = 2 THEN 1 ELSE 0 END) as segundos,
                SUM(h.pontos_ganhos) as pontos_totais,
                ROUND((SUM(CASE WHEN h.posicao_final = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(h.id)), 1) as winrate
            FROM historico_partidas h
            JOIN precons p ON h.deck_id = p.id
            WHERE h.jogador_id IN (${inscricaoIdsStr})
            GROUP BY p.id
            ORDER BY vitorias DESC, partidas DESC
        `);
        
        // Matchups contra outros decks
        const [matchupsContra] = await db.query(`
            SELECT 
                MAX(p.nome) as deck_oponente,
                MAX(p.comandante) as comandante,
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
            ORDER BY vezes DESC
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
                p.comandante,
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
