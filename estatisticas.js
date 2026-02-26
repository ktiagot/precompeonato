const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

// Carregar campeonatos para filtro
async function carregarCampeonatos() {
    try {
        const response = await fetch(`${API_URL}/campeonatos`);
        const campeonatos = await response.json();
        const select = document.getElementById('filtroCampeonato');
        
        campeonatos.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = `${c.nome} - ${c.edicao}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar campeonatos:', error);
    }
}

// Buscar estatísticas
document.getElementById('buscarJogadorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('emailJogador').value;
    const campeonatoId = document.getElementById('filtroCampeonato').value;
    
    try {
        let url = `${API_URL}/estatisticas?email=${encodeURIComponent(email)}`;
        if (campeonatoId) {
            url += `&campeonato_id=${campeonatoId}`;
        }
        
        const response = await fetch(url);
        const stats = await response.json();
        
        if (stats.totalPartidas === 0) {
            document.getElementById('statsContainer').style.display = 'none';
            document.getElementById('nenhumDado').style.display = 'block';
            return;
        }
        
        document.getElementById('nenhumDado').style.display = 'none';
        document.getElementById('statsContainer').style.display = 'block';
        
        exibirEstatisticas(stats);
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        alert('Erro ao buscar estatísticas');
    }
});

function exibirEstatisticas(stats) {
    // Resumo geral
    document.getElementById('totalPartidas').textContent = stats.totalPartidas;
    document.getElementById('totalVitorias').textContent = stats.totalVitorias;
    document.getElementById('winRate').textContent = stats.winRate + '%';
    document.getElementById('totalPontos').textContent = stats.totalPontos;
    
    // Meus decks
    const meusDecksHtml = stats.meusDecks.map(d => `
        <div class="deck-stat">
            <h4>${d.deck_nome}</h4>
            <p><strong>${d.comandante}</strong> - ${d.set_nome}</p>
            <p>Usado em ${d.vezes_usado} partida(s)</p>
        </div>
    `).join('');
    document.getElementById('meusDecks').innerHTML = meusDecksHtml;
    
    // Performance por deck
    const performanceHtml = stats.performancePorDeck.map(p => `
        <div class="performance-card">
            <h4>${p.deck_nome}</h4>
            <div class="performance-stats">
                <span>Partidas: ${p.partidas}</span>
                <span>Vitórias: ${p.vitorias}</span>
                <span>2º Lugar: ${p.segundos}</span>
                <span>Win Rate: ${p.winrate}%</span>
                <span>Pontos: ${p.pontos_totais}</span>
            </div>
        </div>
    `).join('');
    document.getElementById('performanceDeck').innerHTML = performanceHtml || '<p>Nenhum dado disponível</p>';
    
    // Matchups contra
    const matchupsHtml = stats.matchupsContra.map(m => `
        <div class="matchup-card">
            <h4>vs ${m.deck_oponente}</h4>
            <div class="matchup-stats">
                <span>Enfrentou: ${m.vezes} vez(es)</span>
                <span>Vitórias: ${m.vitorias}</span>
                <span>Derrotas: ${m.derrotas}</span>
                <span>Win Rate: ${m.winrate}%</span>
            </div>
        </div>
    `).join('');
    document.getElementById('matchupsContra').innerHTML = matchupsHtml || '<p>Nenhum matchup registrado</p>';
    
    // Histórico
    const historicoHtml = stats.historico.map(h => `
        <div class="partida-card ${h.posicao_final === 1 ? 'vitoria' : ''}">
            <div class="partida-header">
                <strong>${h.campeonato_nome}</strong> - Rodada ${h.rodada_numero}
                <span class="partida-data">${new Date(h.data_partida).toLocaleDateString('pt-BR')}</span>
            </div>
            <div class="partida-info">
                <p><strong>Seu deck:</strong> ${h.deck_nome} (${h.comandante})</p>
                <p><strong>Posição:</strong> ${h.posicao_final}º lugar (+${h.pontos_ganhos} pontos)</p>
                <p><strong>Oponentes:</strong></p>
                <ul>
                    ${h.oponente1_nome ? `<li>${h.oponente1_nome} - ${h.oponente1_deck}</li>` : ''}
                    ${h.oponente2_nome ? `<li>${h.oponente2_nome} - ${h.oponente2_deck}</li>` : ''}
                    ${h.oponente3_nome ? `<li>${h.oponente3_nome} - ${h.oponente3_deck}</li>` : ''}
                </ul>
            </div>
        </div>
    `).join('');
    document.getElementById('historicoPartidas').innerHTML = historicoHtml || '<p>Nenhuma partida registrada</p>';
}

// Inicializar
carregarCampeonatos();
