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
                    <small>${p.comandante} - ${p.set_nome || p.set || 'Set desconhecido'}</small>
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
let todasRodadas = [];
let mostrandoTodas = false;

async function carregarRodadas() {
    try {
        const response = await fetch(`${API_URL}/rodadas`);
        todasRodadas = await response.json();
        const container = document.getElementById('rodadasList');
        
        if (todasRodadas.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666;">Nenhuma rodada disponível ainda</p>';
            return;
        }
        
        renderizarRodadas();
    } catch (error) {
        console.error('Erro ao carregar rodadas:', error);
    }
}

function renderizarRodadas() {
    const container = document.getElementById('rodadasList');
    const rodadasParaMostrar = mostrandoTodas ? todasRodadas : [todasRodadas[0]];
    
    const rodadasHtml = rodadasParaMostrar.map(rodada => {
        let dataFormatada = 'Data não definida';
        if (rodada.data_rodada) {
            try {
                const data = new Date(rodada.data_rodada.includes('T') ? rodada.data_rodada : rodada.data_rodada + 'T00:00:00');
                if (!isNaN(data.getTime())) {
                    dataFormatada = data.toLocaleDateString('pt-BR');
                }
            } catch (e) {
                console.error('Erro ao formatar data:', e);
            }
        }
        
        // Criar grid de mesas em 2 colunas
        const mesasHtml = rodada.mesas && rodada.mesas.length > 0 
            ? `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 1rem; margin-top: 1rem;">
                ${rodada.mesas.map((mesa, idx) => `
                    <div class="mesa">
                        <h4>Mesa ${mesa.numero_mesa || idx + 1}</h4>
                        ${mesa.jogadores && mesa.jogadores.length > 0 ? mesa.jogadores.map(j => `
                            <div class="jogador">${j.nome} - ${j.deck_nome || 'Deck não definido'}</div>
                        `).join('') : '<p>Nenhum jogador</p>'}
                        ${mesa.vencedor_nome ? `<p><strong>Vencedor: ${mesa.vencedor_nome}</strong></p>` : ''}
                    </div>
                `).join('')}
            </div>`
            : '<p>Nenhuma mesa criada</p>';
        
        return `
            <div class="rodada-card">
                <h3>Rodada ${rodada.numero}</h3>
                <p>Data: ${dataFormatada}</p>
                ${mesasHtml}
            </div>
        `;
    }).join('');
    
    const botaoHtml = todasRodadas.length > 1 ? `
        <button onclick="toggleRodadas()" class="btn-primary" style="margin-top: 1rem; width: 100%;">
            ${mostrandoTodas ? 'Mostrar menos' : `Mostrar mais (${todasRodadas.length - 1} rodadas anteriores)`}
        </button>
    ` : '';
    
    container.innerHTML = rodadasHtml + botaoHtml;
}

function toggleRodadas() {
    mostrandoTodas = !mostrandoTodas;
    renderizarRodadas();
}

// Carregar metagame
async function carregarMetagame() {
    try {
        const response = await fetch(`${API_URL}/metagame`);
        const stats = await response.json();
        const container = document.getElementById('metagameStats');
        
        container.innerHTML = stats.map(stat => `
            <div class="deck-stat" style="display: flex; align-items: flex-start; gap: 1rem; padding: 1rem; background: var(--white); border: 1px solid var(--gray-300); border-radius: 0.5rem; margin-bottom: 1rem;">
                ${ScryfallHelper.getImageHTML(stat.comandante, stat.deck, '200px', '150px')}
                <div style="flex: 1; min-width: 0; overflow: hidden;">
                    <h3 style="margin: 0 0 0.5rem 0; word-wrap: break-word;">${stat.deck}</h3>
                    <p style="margin: 0 0 0.75rem 0; color: var(--gray-600); font-size: 0.875rem; word-wrap: break-word;">${stat.comandante}</p>
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.875rem;">
                        <span><strong>Uso:</strong> ${stat.uso_percentual}%</span>
                        <span><strong>Vitórias:</strong> ${stat.vitorias}</span>
                        <span><strong>Win Rate:</strong> ${stat.win_rate}%</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Carregar imagens dos comandantes
        ScryfallHelper.loadAllImages();
    } catch (error) {
        console.error('Erro ao carregar metagame:', error);
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    carregarRodadas();
    carregarMetagame();
});
