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
                    <small>${p.comandante_principal} - ${p.set_nome || p.set || 'Set desconhecido'}</small>
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

async function selecionarDeck(id, nome, info) {
    try {
        // Buscar detalhes completos do precon
        const response = await fetch(`${API_URL}/precons`);
        const precons = await response.json();
        const precon = precons.find(p => p.id == id);
        
        if (!precon) {
            console.error('Precon não encontrado');
            return;
        }
        
        document.getElementById('deckId').value = id;
        document.getElementById('deckNome').value = nome;
        deckBusca.value = nome;
        deckSugestoes.style.display = 'none';
        
        // Verificar se tem comandante secundário
        const temSecundario = precon.comandante_secundario && precon.comandante_secundario.trim() !== '';
        
        let infoHtml = `
            <strong>${precon.nome}</strong><br>
            <small>${precon.set_nome || 'Set desconhecido'}</small>
        `;
        
        if (temSecundario) {
            infoHtml += `
                <div style="margin-top: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Escolha o comandante:</label>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: white; border: 2px solid var(--gray-300); border-radius: 0.5rem; cursor: pointer;">
                            <input type="radio" name="cdComandante" value="1" checked>
                            <span><strong>${precon.comandante_principal}</strong></span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: white; border: 2px solid var(--gray-300); border-radius: 0.5rem; cursor: pointer;">
                            <input type="radio" name="cdComandante" value="2">
                            <span><strong>${precon.comandante_secundario}</strong></span>
                        </label>
                    </div>
                </div>
            `;
        } else {
            infoHtml += `<br><small><strong>Comandante:</strong> ${precon.comandante_principal}</small>`;
        }
        
        document.getElementById('deckInfo').innerHTML = infoHtml;
        document.getElementById('deckSelecionado').style.display = 'block';
        
        deckSelecionadoAtual = { id, nome, temSecundario };
    } catch (error) {
        console.error('Erro ao selecionar deck:', error);
    }
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
    
    // Adicionar escolha do comandante (1 ou 2)
    const cdComandante = document.querySelector('input[name="cdComandante"]:checked')?.value || '1';
    data.cdComandante = parseInt(cdComandante);
    
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

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    carregarRodadas();
});
