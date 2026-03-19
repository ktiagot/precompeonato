// ========================================
// Helper para integração com API APOIA.se
// ========================================
// Valida se um email é de um apoiador ativo

const APOIA_API_URL = 'https://api.apoia.se/backers/charges';
const APOIA_API_KEY = process.env.APOIA_API_KEY;
const APOIA_API_SECRET = process.env.APOIA_API_SECRET;

// Cache de validações para evitar chamadas excessivas à API
// Chave: email, Valor: { valido: boolean, timestamp: number, dados: object }
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos

/**
 * Verifica se um email é de um apoiador ativo na APOIA.se
 * @param {string} email - Email do usuário
 * @returns {Promise<{valido: boolean, dados?: object, erro?: string}>}
 */
async function verificarApoiador(email) {
    if (!email) {
        return { valido: false, erro: 'Email não fornecido' };
    }

    email = email.toLowerCase().trim();

    // Verificar cache
    const cached = cache.get(email);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        console.log(`🔄 APOIA.se cache hit: ${email} -> ${cached.valido ? '✅' : '❌'}`);
        return { valido: cached.valido, dados: cached.dados };
    }

    // Verificar se as credenciais estão configuradas
    if (!APOIA_API_KEY || !APOIA_API_SECRET) {
        console.warn('⚠️  APOIA.se: Credenciais não configuradas. Usando fallback para emails_permitidos.');
        return { valido: false, erro: 'API APOIA.se não configurada', fallback: true };
    }

    try {
        console.log(`🔍 APOIA.se: Verificando apoiador ${email}...`);

        const response = await fetch(`${APOIA_API_URL}/${encodeURIComponent(email)}`, {
            method: 'GET',
            headers: {
                'Accept': '*/*',
                'Content-Type': 'application/json',
                'x-api-key': APOIA_API_KEY,
                'Authorization': `Bearer ${APOIA_API_SECRET}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                console.log(`❌ APOIA.se: ${email} não encontrado`);
                cache.set(email, { valido: false, timestamp: Date.now(), dados: null });
                return { valido: false, erro: 'Email não encontrado como apoiador' };
            }
            throw new Error(`API retornou status ${response.status}`);
        }

        const dados = await response.json();
        
        // Verificar se tem cobranças ativas/pagas
        const temApoioAtivo = verificarApoioAtivo(dados);
        
        console.log(`${temApoioAtivo ? '✅' : '❌'} APOIA.se: ${email} -> ${temApoioAtivo ? 'Apoiador ativo' : 'Sem apoio ativo'}`);
        
        // Salvar no cache
        cache.set(email, { valido: temApoioAtivo, timestamp: Date.now(), dados });
        
        return { valido: temApoioAtivo, dados };
    } catch (error) {
        console.error(`❌ APOIA.se: Erro ao verificar ${email}:`, error.message);
        return { valido: false, erro: `Erro na API: ${error.message}`, fallback: true };
    }
}

/**
 * Analisa a resposta da API para determinar se o apoio está ativo
 * @param {object} dados - Resposta da API APOIA.se
 * @returns {boolean}
 */
function verificarApoioAtivo(dados) {
    // Formato da API: { isPaidThisMonth: boolean, isBacker: boolean }
    // isBacker = é apoiador (ativo ou não)
    // isPaidThisMonth = pagou este mês (apoio ativo)
    
    if (dados && typeof dados.isBacker === 'boolean') {
        // Considerar válido se é apoiador (isBacker = true)
        // isPaidThisMonth indica se pagou este mês
        return dados.isBacker === true;
    }

    return false;
}

/**
 * Limpa o cache de um email específico ou todo o cache
 * @param {string} [email] - Email para limpar. Se não fornecido, limpa tudo.
 */
function limparCache(email) {
    if (email) {
        cache.delete(email.toLowerCase().trim());
    } else {
        cache.clear();
    }
}

module.exports = { verificarApoiador, limparCache };
