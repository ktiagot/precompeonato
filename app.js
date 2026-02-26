const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

let deckSelecionadoAtual = null;

// Busca de precons
const deckBusca = document.getElementById('deckBusca');
const deckSugestoes = document.getElementById('deckSugestoes');

if (deckBusca) {
    deckBusca.addEventListener('input', async (e) => {
        const busca = e.target.value;
        
        if (busca.length < 2) {
            deckSugestoes.style.display = 'none';
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/precons?busca=${encodeURIComponent(busca)}`);
            const precons = await response.json();
            
            if (precons.length === 0) {
                deckSugestoes.innerHTML = '<div style="padding: 0.5rem;">Nenhum deck encontrado</div>';
                deckSugestoes.style.display = 'block';
                return;
            }
            
            deckSugestoes.innerHTML = precons.map(p => `
                <div class="deck-sugestao" data-id="${p.id}" data-nome="${p.nome}" style="padding: 0.5rem; cursor: pointer; border-bottom: 1px solid #eee;">
                    <strong>${p.nome}</strong><br>
                    <small>${p.comandante} - ${p.set}</small>
                </div>
            `).join('');
            
            deckSugestoes.style.display = 'block';
            
            // Adicionar eventos de clique
            document.querySelectorAll('.deck-sugestao').forEach(el => {
                el.addEventListener('click', () => {
                    const id = el.dataset.id;
                    const nome = el.dataset.nome;
                    selecionarDeck(id, nome, el.innerHTML);
                });
            });
        } catch (error) {
            console.error('Erro ao buscar precons:', error);
        }
    });
    
    // Fechar sugestões ao clicar fora
    document.addEventListener('click', (e) => {
        if (!deckBusca.contains(e.target) && !deckSugestoes.contains(e.target)) {
            deckSugestoes.style.display = 'none';
        }
    });
}

function selecionarDeck(id, nome, info) {
    document.getElementById('deckId').value = id;
    document.getElementById('deckNome').value = nome;
    document.getElementById('deckInfo').innerHTML = info;
    document.getElementById('deckSelecionado').style.display = 'block';
    deckBusca.value = nome;
    deckSugestoes.style.display = 'none';
    deckSelecionadoAtual = { id, nome };
}

// Formulário de inscrição
document.getElementById('inscricaoForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    // Validar se deck foi selecionado
    if (!data.deckId || !data.deckNome) {
        alert('Por favor, selecione um deck precon da lista');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/inscricoes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Inscrição realizada com sucesso!');
            e.target.reset();
            document.getElementById('deckSelecionado').style.display = 'none';
            deckSelecionadoAtual = null;
        } else {
            alert(result.error || 'Erro ao realizar inscrição');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao realizar inscrição');
    }
});

// Carregar rodadas
async function carregarRodadas() {
    try {
        const response = await fetch(`${API_URL}/rodadas`);
        const rodadas = await response.json();
        const container = document.getElementById('rodadasList');
        
        if (rodadas.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666;">Nenhuma rodada disponível ainda</p>';
            return;
        }
        
        container.innerHTML = rodadas.map(rodada => `
            <div class="rodada-card">
                <h3>Rodada ${rodada.numero}</h3>
                <p>Data: ${new Date(rodada.data).toLocaleDateString('pt-BR')}</p>
                ${rodada.mesas.map((mesa, idx) => `
                    <div class="mesa">
                        <h4>Mesa ${idx + 1}</h4>
                        ${mesa.jogadores.map(j => `
                            <div class="jogador">${j.nome} - ${j.deckNome || j.deck}</div>
                        `).join('')}
                        ${mesa.vencedor ? `<p><strong>Vencedor: ${mesa.vencedor}</strong></p>` : ''}
                    </div>
                `).join('')}
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar rodadas:', error);
    }
}

// Carregar metagame
async function carregarMetagame() {
    try {
        const response = await fetch(`${API_URL}/metagame`);
        const stats = await response.json();
        const container = document.getElementById('metagameStats');
        
        container.innerHTML = stats.map(stat => `
            <div class="deck-stat">
                <h3>${stat.deck}</h3>
                <p>Uso: ${stat.uso}%</p>
                <p>Vitórias: ${stat.vitorias}</p>
                <p>Win Rate: ${stat.winRate}%</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar metagame:', error);
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    carregarRodadas();
    carregarMetagame();
});
