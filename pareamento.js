// Sistema de Pareamento Suíço Melhorado
// Regras:
// 1. Primeira rodada: sorteio aleatório evitando repetir precons na mesma mesa
// 2. Rodadas seguintes: sistema suíço por pontos
// 3. Evitar repetir oponentes já enfrentados
// 4. Pontuação: 3 pontos (1º), 1 ponto (2º), 0 pontos (3º e 4º)

/**
 * Gera pareamento para uma rodada
 * @param {Array} jogadores - Lista de jogadores ativos
 * @param {number} numeroRodada - Número da rodada atual
 * @param {Object} db - Conexão com banco de dados
 * @param {number} campeonatoId - ID do campeonato
 * @returns {Array} Array de mesas com 4 jogadores cada
 */
async function gerarPareamento(jogadores, numeroRodada, db, campeonatoId) {
    if (jogadores.length < 4) {
        throw new Error('Mínimo de 4 jogadores necessários');
    }
    
    // Primeira rodada: pareamento aleatório evitando repetir precons
    if (numeroRodada === 1) {
        return await pareamentoPrimeiraRodada(jogadores);
    }
    
    // Rodadas seguintes: sistema suíço
    return await pareamentoSuico(jogadores, db, campeonatoId);
}

/**
 * Pareamento da primeira rodada
 * Sorteia aleatoriamente mas tenta evitar repetir precons na mesma mesa
 */
async function pareamentoPrimeiraRodada(jogadores) {
    const jogadoresEmbaralhados = [...jogadores].sort(() => Math.random() - 0.5);
    const mesas = [];
    
    for (let i = 0; i < jogadoresEmbaralhados.length; i += 4) {
        const jogadoresMesa = jogadoresEmbaralhados.slice(i, i + 4);
        
        if (jogadoresMesa.length >= 2) {
            // Tentar redistribuir se houver muitos precons repetidos
            const decks = jogadoresMesa.map(j => j.deck_id);
            const decksUnicos = new Set(decks);
            
            // Se houver 3 ou 4 decks iguais, tentar trocar com próxima mesa
            if (decksUnicos.size === 1 && i + 4 < jogadoresEmbaralhados.length) {
                // Trocar último jogador desta mesa com primeiro da próxima
                const temp = jogadoresEmbaralhados[i + 3];
                jogadoresEmbaralhados[i + 3] = jogadoresEmbaralhados[i + 4];
                jogadoresEmbaralhados[i + 4] = temp;
                
                // Refazer a mesa
                jogadoresMesa[3] = jogadoresEmbaralhados[i + 3];
            }
            
            mesas.push(jogadoresMesa);
        }
    }
    
    return mesas;
}

/**
 * Pareamento sistema suíço
 * Agrupa por pontos e evita repetir oponentes
 */
async function pareamentoSuico(jogadores, db, campeonatoId) {
    // Ordenar por pontos (desc), pontos cumulativos (desc), vitórias (desc)
    const jogadoresOrdenados = [...jogadores].sort((a, b) => {
        if (b.pontos !== a.pontos) return b.pontos - a.pontos;
        if (b.pontos_cumulativos !== a.pontos_cumulativos) return b.pontos_cumulativos - a.pontos_cumulativos;
        return b.vitorias - a.vitorias;
    });
    
    // Buscar histórico de oponentes
    const historicoOponentes = await buscarHistoricoOponentes(db, campeonatoId);
    
    const mesas = [];
    const jogadoresUsados = new Set();
    
    // Agrupar jogadores por faixa de pontos
    const faixasPontos = agruparPorFaixaPontos(jogadoresOrdenados);
    
    // Para cada faixa de pontos, criar mesas
    for (const faixa of faixasPontos) {
        const jogadoresFaixa = faixa.jogadores.filter(j => !jogadoresUsados.has(j.id));
        
        while (jogadoresFaixa.length >= 4) {
            const mesa = montarMesaOtimizada(jogadoresFaixa, historicoOponentes, jogadoresUsados);
            if (mesa.length >= 2) {
                mesas.push(mesa);
                mesa.forEach(j => jogadoresUsados.add(j.id));
                // Remover jogadores usados da faixa
                jogadoresFaixa.splice(0, mesa.length);
            } else {
                break;
            }
        }
    }
    
    // Jogadores restantes (menos de 4 na faixa) - criar mesas mistas
    const jogadoresRestantes = jogadoresOrdenados.filter(j => !jogadoresUsados.has(j.id));
    
    for (let i = 0; i < jogadoresRestantes.length; i += 4) {
        const jogadoresMesa = jogadoresRestantes.slice(i, i + 4);
        if (jogadoresMesa.length >= 2) {
            mesas.push(jogadoresMesa);
        }
    }
    
    return mesas;
}

/**
 * Agrupa jogadores por faixa de pontos
 */
function agruparPorFaixaPontos(jogadores) {
    const faixas = new Map();
    
    for (const jogador of jogadores) {
        const pontos = jogador.pontos;
        if (!faixas.has(pontos)) {
            faixas.set(pontos, { pontos, jogadores: [] });
        }
        faixas.get(pontos).jogadores.push(jogador);
    }
    
    return Array.from(faixas.values()).sort((a, b) => b.pontos - a.pontos);
}

/**
 * Monta uma mesa otimizada evitando repetir oponentes
 */
function montarMesaOtimizada(jogadoresFaixa, historicoOponentes, jogadoresUsados) {
    if (jogadoresFaixa.length < 2) return [];
    
    const mesa = [];
    const candidatos = jogadoresFaixa.filter(j => !jogadoresUsados.has(j.id));
    
    if (candidatos.length === 0) return [];
    
    // Primeiro jogador da faixa
    mesa.push(candidatos[0]);
    
    // Selecionar próximos 3 jogadores evitando repetir oponentes
    for (let i = 1; i < candidatos.length && mesa.length < 4; i++) {
        const candidato = candidatos[i];
        
        // Verificar se já jogou com alguém da mesa
        const jaEnfrentou = mesa.some(jogadorMesa => 
            jaEnfrentaram(jogadorMesa.id, candidato.id, historicoOponentes)
        );
        
        // Se não enfrentou ninguém da mesa, adicionar
        if (!jaEnfrentou) {
            mesa.push(candidato);
        }
    }
    
    // Se não conseguiu 4 jogadores sem repetir, completar com quem menos enfrentou
    if (mesa.length < 4) {
        for (let i = 1; i < candidatos.length && mesa.length < 4; i++) {
            const candidato = candidatos[i];
            if (!mesa.includes(candidato)) {
                mesa.push(candidato);
            }
        }
    }
    
    return mesa;
}

/**
 * Busca histórico de oponentes já enfrentados
 */
async function buscarHistoricoOponentes(db, campeonatoId) {
    const [historico] = await db.query(`
        SELECT jogador1_id, jogador2_id, vezes_enfrentados
        FROM historico_oponentes
        WHERE campeonato_id = ?
    `, [campeonatoId]);
    
    const mapa = new Map();
    for (const h of historico) {
        const key1 = `${h.jogador1_id}-${h.jogador2_id}`;
        const key2 = `${h.jogador2_id}-${h.jogador1_id}`;
        mapa.set(key1, h.vezes_enfrentados);
        mapa.set(key2, h.vezes_enfrentados);
    }
    
    return mapa;
}

/**
 * Verifica se dois jogadores já se enfrentaram
 */
function jaEnfrentaram(jogador1Id, jogador2Id, historicoOponentes) {
    const key = `${jogador1Id}-${jogador2Id}`;
    return historicoOponentes.has(key);
}

/**
 * Atualiza histórico de oponentes após uma rodada
 */
async function atualizarHistoricoOponentes(db, campeonatoId, mesaId, jogadores, numeroRodada) {
    // Para cada par de jogadores na mesa
    for (let i = 0; i < jogadores.length; i++) {
        for (let j = i + 1; j < jogadores.length; j++) {
            const jogador1Id = Math.min(jogadores[i].id, jogadores[j].id);
            const jogador2Id = Math.max(jogadores[i].id, jogadores[j].id);
            
            await db.query(`
                INSERT INTO historico_oponentes 
                (campeonato_id, jogador1_id, jogador2_id, vezes_enfrentados, ultima_rodada)
                VALUES (?, ?, ?, 1, ?)
                ON DUPLICATE KEY UPDATE 
                    vezes_enfrentados = vezes_enfrentados + 1,
                    ultima_rodada = ?
            `, [campeonatoId, jogador1Id, jogador2Id, numeroRodada, numeroRodada]);
        }
    }
}

module.exports = {
    gerarPareamento,
    atualizarHistoricoOponentes
};
