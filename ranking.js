const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

let rankingCompleto = [];
let rankingFiltrado = [];

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
        
        aplicarFiltros();
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

// Aplicar filtros (busca + campeonato)
function aplicarFiltros() {
    const busca = document.getElementById('buscaJogador').value.toLowerCase().trim();
    
    if (!busca) {
        rankingFiltrado = [...rankingCompleto];
    } else {
        rankingFiltrado = rankingCompleto.filter(jogador => {
            const nome = (jogador.nome || '').toLowerCase();
            const email = (jogador.email || '').toLowerCase();
            
            return nome.includes(busca) || email.includes(busca);
        });
    }
    
    exibirRanking();
}

// Exibir ranking
function exibirRanking() {
    const tbody = document.getElementById('rankingBody');
    const podio = document.getElementById('podio');
    const emptyState = document.getElementById('emptyState');
    const busca = document.getElementById('buscaJogador').value.trim();
    
    if (rankingFiltrado.length === 0) {
        tbody.innerHTML = '';
        podio.innerHTML = '';
        emptyState.style.display = 'block';
        
        if (busca) {
            emptyState.innerHTML = `
                <h3>Nenhum jogador encontrado</h3>
                <p>Nenhum resultado para "${busca}"</p>
            `;
        } else {
            emptyState.innerHTML = `
                <h3>Nenhum jogador encontrado</h3>
                <p>Seja o primeiro a participar de um campeonato!</p>
            `;
        }
        return;
    }
    
    emptyState.style.display = 'none';
    
    // Exibir pódio (top 3) apenas se não houver busca
    if (!busca) {
        const top3 = rankingFiltrado.slice(0, 3);
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
        podio.style.display = 'grid';
    } else {
        podio.innerHTML = '';
        podio.style.display = 'none';
    }
    
    // Exibir tabela completa
    tbody.innerHTML = rankingFiltrado.map((jogador, index) => {
        const posicao = index + 1;
        let posicaoClass = '';
        let posicaoIcon = '';
        
        if (posicao === 1 && !busca) {
            posicaoClass = 'top1';
            posicaoIcon = '🥇 ';
        } else if (posicao === 2 && !busca) {
            posicaoClass = 'top2';
            posicaoIcon = '🥈 ';
        } else if (posicao === 3 && !busca) {
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

// Event listeners
document.getElementById('filtroCampeonato').addEventListener('change', carregarRanking);

// Busca com debounce para não fazer muitas requisições
let buscaTimeout;
document.getElementById('buscaJogador').addEventListener('input', () => {
    clearTimeout(buscaTimeout);
    buscaTimeout = setTimeout(() => {
        aplicarFiltros();
    }, 300);
});

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    carregarCampeonatos();
    carregarRanking();
});
