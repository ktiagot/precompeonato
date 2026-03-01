const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

// Gerenciar tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        // Atualizar botões
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Atualizar conteúdo
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none';
        });
        
        const activeTab = document.getElementById(`tab-${tabName}`);
        activeTab.classList.add('active');
        activeTab.style.display = 'block';
        
        // Carregar dados da tab ativa
        if (tabName === 'geral') {
            carregarEstatisticasGerais();
        }
    });
});

// Carregar campeonatos para filtros
async function carregarCampeonatos() {
    try {
        const response = await fetch(`${API_URL}/campeonatos`);
        const campeonatos = await response.json();
        
        // Filtro das estatísticas gerais
        const selectGeral = document.getElementById('filtroCampeonatoGeral');
        campeonatos.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = `${c.nome} - ${c.edicao}`;
            selectGeral.appendChild(option);
        });
        
        // Filtro das minhas estatísticas
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

// Carregar estatísticas gerais
async function carregarEstatisticasGerais() {
    const campeonatoId = document.getElementById('filtroCampeonatoGeral').value;
    
    try {
        let url = `${API_URL}/estatisticas/geral`;
        if (campeonatoId) {
            url += `?campeonato_id=${campeonatoId}`;
        }
        
        const response = await fetch(url);
        const stats = await response.json();
        
        exibirEstatisticasGerais(stats);
    } catch (error) {
        console.error('Erro ao carregar estatísticas gerais:', error);
    }
}

function exibirEstatisticasGerais(stats) {
    // Números gerais
    document.getElementById('totalPartidasGeral').textContent = stats.totalPartidas || 0;
    document.getElementById('totalJogadoresGeral').textContent = stats.totalJogadores || 0;
    document.getElementById('totalDecksGeral').textContent = stats.totalDecks || 0;
    document.getElementById('totalRodadasGeral').textContent = stats.totalRodadas || 0;
    
    // Metagame - Decks mais usados (2 colunas)
    const metagameHtml = (stats.metagame || []).map(d => `
        <div class="metagame-item" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--white); border: 1px solid var(--gray-300); border-radius: 0.5rem;">
            ${ScryfallHelper.getImageHTML(d.comandante, d.deck_nome, '64px')}
            <div style="flex: 1;">
                <h4 style="margin: 0 0 0.25rem 0;">${d.deck_nome}</h4>
                <p style="margin: 0 0 0.5rem 0; color: var(--gray-600); font-size: 0.875rem;"><strong>${d.comandante}</strong> - ${d.set_nome}</p>
                <div class="metagame-stats" style="display: flex; gap: 1rem; font-size: 0.875rem;">
                    <span><strong>Usado:</strong> ${d.vezes_usado}x (${d.porcentagem}%)</span>
                    <span><strong>Vitórias:</strong> ${d.vitorias}</span>
                    <span><strong>Win Rate:</strong> ${d.winrate}%</span>
                </div>
            </div>
        </div>
    `).join('');
    document.getElementById('metagameGeral').innerHTML = metagameHtml || '<p>Nenhum dado disponível</p>';
    
    // Top decks por win rate (2 colunas)
    const topDecksHtml = (stats.topDecks || []).map(d => `
        <div class="metagame-item" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--white); border: 1px solid var(--gray-300); border-radius: 0.5rem;">
            ${ScryfallHelper.getImageHTML(d.comandante, d.deck_nome, '64px')}
            <div style="flex: 1;">
                <h4 style="margin: 0 0 0.25rem 0;">${d.deck_nome}</h4>
                <p style="margin: 0 0 0.5rem 0; color: var(--gray-600); font-size: 0.875rem;"><strong>${d.comandante}</strong></p>
                <div class="metagame-stats" style="display: flex; gap: 1rem; font-size: 0.875rem;">
                    <span><strong>Partidas:</strong> ${d.partidas}</span>
                    <span><strong>Vitórias:</strong> ${d.vitorias}</span>
                    <span><strong>Win Rate:</strong> ${d.winrate}%</span>
                    <span><strong>Pontos Médios:</strong> ${d.pontos_medios}</span>
                </div>
            </div>
        </div>
    `).join('');
    document.getElementById('topDecks').innerHTML = topDecksHtml || '<p>Nenhum dado disponível</p>';
    
    // Matchups mais comuns
    const matchupsHtml = (stats.matchupsComuns || []).map(m => `
        <div class="matchup-item">
            <h4>${m.deck1} vs ${m.deck2}</h4>
            <div class="matchup-stats">
                <span><strong>Enfrentamentos:</strong> ${m.total}</span>
                <span><strong>${m.deck1} venceu:</strong> ${m.deck1_vitorias} vezes</span>
                <span><strong>${m.deck2} venceu:</strong> ${m.deck2_vitorias} vezes</span>
            </div>
        </div>
    `).join('');
    document.getElementById('matchupsComuns').innerHTML = matchupsHtml || '<p>Nenhum matchup registrado</p>';
    
    // Carregar imagens dos comandantes
    ScryfallHelper.loadAllImages();
}
        <div class="metagame-item">
            <h4>${d.deck_nome}</h4>
            <p style="margin: 0.25rem 0; color: var(--gray-600);"><strong>${d.comandante}</strong></p>
            <div class="metagame-stats">
                <span><strong>Partidas:</strong> ${d.partidas}</span>
                <span><strong>Vitórias:</strong> ${d.vitorias}</span>
                <span><strong>Win Rate:</strong> ${d.winrate}%</span>
                <span><strong>Pontos Médios:</strong> ${d.pontos_medios}</span>
            </div>
        </div>
    `).join('');
    document.getElementById('topDecks').innerHTML = topDecksHtml || '<p>Nenhum dado disponível</p>';
    
    // Matchups mais comuns
    const matchupsHtml = (stats.matchupsComuns || []).map(m => `
        <div class="matchup-item">
            <h4>${m.deck1} vs ${m.deck2}</h4>
            <div class="matchup-stats">
                <span><strong>Enfrentamentos:</strong> ${m.total}</span>
                <span><strong>${m.deck1} venceu:</strong> ${m.deck1_vitorias} vezes</span>
                <span><strong>${m.deck2} venceu:</strong> ${m.deck2_vitorias} vezes</span>
            </div>
        </div>
    `).join('');
    document.getElementById('matchupsComuns').innerHTML = matchupsHtml || '<p>Nenhum matchup registrado</p>';
}

// Listener para mudança de filtro nas estatísticas gerais
document.getElementById('filtroCampeonatoGeral').addEventListener('change', carregarEstatisticasGerais);

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
carregarEstatisticasGerais(); // Carregar estatísticas gerais ao iniciar
