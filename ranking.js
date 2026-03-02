const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

let rankingCompleto = [];

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

// Carregar ranking
async function carregarRanking() {
    try {
        const campeonatoId = document.getElementById('filtroCampeonato').value;
        let url = `${API_URL}/ranking`;
        
        if (campeonatoId) {
            url += `?campeonato_id=${campeonatoId}`;
        }
        
        const response = await fetch(url);
        rankingCompleto = await response.json();
        
        exibirRanking();
    } catch (error) {
        console.error('Erro ao carregar ranking:', error);
        document.getElementById('rankingBody').innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 3rem; color: var(--danger);">
                    Erro ao carregar ranking. Tente novamente.
                </td>
            </tr>
        `;
    }
}

// Exibir ranking
function exibirRanking() {
    const tbody = document.getElementById('rankingBody');
    const podio = document.getElementById('podio');
    const emptyState = document.getElementById('emptyState');
    
    if (rankingCompleto.length === 0) {
        tbody.innerHTML = '';
        podio.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    // Exibir pódio (top 3)
    const top3 = rankingCompleto.slice(0, 3);
    podio.innerHTML = top3.map((jogador, index) => {
        const posicao = index + 1;
        const medalha = posicao === 1 ? '🥇' : posicao === 2 ? '🥈' : '🥉';
        const corBorda = posicao === 1 ? '#FFD700' : posicao === 2 ? '#C0C0C0' : '#CD7F32';
        
        return `
            <div style="background: var(--white); border: 3px solid ${corBorda}; border-radius: 1rem; padding: 2rem; text-align: center; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                <div style="font-size: 3rem; margin-bottom: 0.5rem;">${medalha}</div>
                <div style="font-size: 1.5rem; font-weight: 700; color: ${corBorda}; margin-bottom: 0.5rem;">#${posicao}</div>
                <a href="perfil.html?email=${encodeURIComponent(jogador.email)}" style="font-size: 1.125rem; font-weight: 600; color: var(--dark); text-decoration: none; display: block; margin-bottom: 1rem;">
                    ${jogador.nome || jogador.email}
                </a>
                <div style="display: grid; gap: 0.5rem; font-size: 0.875rem; color: var(--gray-600);">
                    <div><strong style="color: var(--primary);">${jogador.pontos_totais || 0}</strong> pontos</div>
                    <div><strong>${jogador.vitorias_totais || 0}</strong> vitórias</div>
                    <div><strong>${jogador.winrate || 0}%</strong> win rate</div>
                    <div>${jogador.campeonatos_participados || 0} campeonatos</div>
                </div>
            </div>
        `;
    }).join('');
    
    // Exibir tabela completa
    tbody.innerHTML = rankingCompleto.map((jogador, index) => {
        const posicao = index + 1;
        let posicaoClass = '';
        let posicaoIcon = '';
        
        if (posicao === 1) {
            posicaoClass = 'top1';
            posicaoIcon = '🥇 ';
        } else if (posicao === 2) {
            posicaoClass = 'top2';
            posicaoIcon = '🥈 ';
        } else if (posicao === 3) {
            posicaoClass = 'top3';
            posicaoIcon = '🥉 ';
        }
        
        return `
            <tr>
                <td class="posicao ${posicaoClass}">${posicaoIcon}${posicao}</td>
                <td>
                    <a href="perfil.html?email=${encodeURIComponent(jogador.email)}" class="jogador-nome">
                        ${jogador.nome || jogador.email}
                    </a>
                </td>
                <td class="hide-mobile">
                    <span class="stat-badge">${jogador.campeonatos_participados || 0}</span>
                </td>
                <td>
                    <strong style="color: var(--primary); font-size: 1.125rem;">${jogador.pontos_totais || 0}</strong>
                </td>
                <td class="hide-mobile">
                    <span class="stat-badge">${jogador.vitorias_totais || 0}</span>
                </td>
                <td>
                    <span class="stat-badge" style="background: ${(jogador.winrate || 0) >= 50 ? 'rgba(34, 197, 94, 0.1)' : 'var(--gray-100)'}; color: ${(jogador.winrate || 0) >= 50 ? '#16a34a' : 'var(--gray-700)'};">
                        ${jogador.winrate || 0}%
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

// Event listener para filtro
document.getElementById('filtroCampeonato').addEventListener('change', carregarRanking);

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    carregarCampeonatos();
    carregarRanking();
});
