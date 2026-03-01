const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

let deckSelecionadoAtual = null;

// Verificar se inscrições estão abertas
async function verificarInscricoesAbertas() {
    try {
        const response = await fetch(`${API_URL}/campeonatos`);
        const campeonatos = await response.json();
        
        // Buscar campeonato com status 'inscricoes'
        const campeonatoAberto = campeonatos.find(c => c.status === 'inscricoes');
        
        if (!campeonatoAberto) {
            // Verificar se tem campeonato em andamento
            const campeonatoEmAndamento = campeonatos.find(c => c.status === 'em_andamento');
            
            if (campeonatoEmAndamento) {
                document.getElementById('inscricoesFechadas').style.display = 'block';
            } else {
                document.getElementById('semCampeonato').style.display = 'block';
            }
            document.getElementById('formContainer').style.display = 'none';
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Erro ao verificar inscrições:', error);
        return false;
    }
}

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
            
            deckSugestoes.innerHTML = precons.map(p => {
                const comandantes = p.comandante_secundario 
                    ? `${p.comandante_principal} / ${p.comandante_secundario}`
                    : p.comandante_principal;
                
                return `
                    <div class="deck-sugestao" data-id="${p.id}" data-nome="${p.nome}" style="padding: 0.5rem; cursor: pointer; border-bottom: 1px solid #eee;">
                        <strong>${p.nome}</strong><br>
                        <small><strong>Comandante(s):</strong> ${comandantes}</small><br>
                        <small style="color: var(--gray-500);">${p.set_nome || p.set || 'Set desconhecido'}</small>
                    </div>
                `;
            }).join('');
            
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
        // Buscar comandantes disponíveis para este precon
        const response = await fetch(`${API_URL}/precons/${id}/comandantes`);
        const data = await response.json();
        
        if (!data.comandantes || data.comandantes.length === 0) {
            alert('Erro: Nenhum comandante encontrado para este deck');
            return;
        }
        
        // Buscar detalhes do precon
        const preconResponse = await fetch(`${API_URL}/precons`);
        const precons = await preconResponse.json();
        const precon = precons.find(p => p.id == id);
        
        if (!precon) {
            console.error('Precon não encontrado');
            return;
        }
        
        document.getElementById('deckId').value = id;
        document.getElementById('deckNome').value = nome;
        deckBusca.value = nome;
        deckSugestoes.style.display = 'none';
        
        let infoHtml = `
            <strong>${precon.nome}</strong><br>
            <small style="color: var(--gray-600);">${precon.set_nome || 'Set desconhecido'} (${precon.ano || 'Ano desconhecido'})</small>
        `;
        
        if (data.tem_partner && data.comandantes.length > 2) {
            // Deck com Partner - usuário escolhe 2 comandantes
            infoHtml += `
                <div style="margin-top: 1rem; padding: 1rem; background: var(--white); border-radius: 0.5rem; border: 1px solid var(--gray-300);">
                    <label style="display: block; margin-bottom: 0.75rem; font-weight: 600; color: var(--dark);">
                        🤝 Este deck tem Partner! Escolha 2 comandantes:
                    </label>
                    <div id="partnerSelection" style="display: flex; flex-direction: column; gap: 0.5rem;">
                        ${data.comandantes.map((cmd, idx) => `
                            <label class="partner-option" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--gray-50); border: 2px solid var(--gray-300); border-radius: 0.5rem; cursor: pointer; transition: all 0.2s;">
                                <input type="checkbox" name="partnerComandante" value="${cmd.comandante}" data-ordem="${cmd.ordem}" style="width: 18px; height: 18px; cursor: pointer;">
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: var(--dark);">${cmd.comandante}</div>
                                </div>
                            </label>
                        `).join('')}
                    </div>
                    <small style="display: block; margin-top: 0.5rem; color: var(--gray-600);">
                        ⚠️ Você deve selecionar exatamente 2 comandantes
                    </small>
                </div>
            `;
            
            setTimeout(() => {
                const checkboxes = document.querySelectorAll('input[name="partnerComandante"]');
                checkboxes.forEach(checkbox => {
                    checkbox.addEventListener('change', () => {
                        const checked = document.querySelectorAll('input[name="partnerComandante"]:checked');
                        if (checked.length > 2) {
                            checkbox.checked = false;
                            alert('Você pode selecionar no máximo 2 comandantes');
                        }
                        
                        // Atualizar visual
                        checkboxes.forEach(cb => {
                            const label = cb.closest('.partner-option');
                            if (cb.checked) {
                                label.style.borderColor = 'var(--accent)';
                                label.style.background = 'var(--white)';
                            } else {
                                label.style.borderColor = 'var(--gray-300)';
                                label.style.background = 'var(--gray-50)';
                            }
                        });
                    });
                });
            }, 0);
            
        } else if (data.comandantes.length > 1) {
            // Deck com múltiplos comandantes mas sem partner (escolhe 1)
            infoHtml += `
                <div style="margin-top: 1rem; padding: 1rem; background: var(--white); border-radius: 0.5rem; border: 1px solid var(--gray-300);">
                    <label style="display: block; margin-bottom: 0.75rem; font-weight: 600; color: var(--dark);">
                        ⚔️ Este deck tem múltiplos comandantes. Escolha qual você vai usar:
                    </label>
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        ${data.comandantes.map((cmd, idx) => `
                            <label class="commander-option" style="display: flex; align-items: center; gap: 0.75rem; padding: 1rem; background: var(--gray-50); border: 2px solid var(--gray-300); border-radius: 0.5rem; cursor: pointer; transition: all 0.2s;">
                                <input type="radio" name="cdComandante" value="${cmd.comandante}" ${idx === 0 ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
                                <div>
                                    <div style="font-weight: 600; color: var(--dark);">${cmd.comandante}</div>
                                    <div style="font-size: 0.75rem; color: var(--gray-600);">${idx === 0 ? 'Comandante Principal' : 'Comandante Alternativo'}</div>
                                </div>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
            
            setTimeout(() => {
                document.querySelectorAll('.commander-option').forEach(option => {
                    option.addEventListener('mouseenter', () => {
                        option.style.borderColor = 'var(--accent)';
                        option.style.background = 'var(--white)';
                    });
                    option.addEventListener('mouseleave', () => {
                        const radio = option.querySelector('input[type="radio"]');
                        if (!radio.checked) {
                            option.style.borderColor = 'var(--gray-300)';
                            option.style.background = 'var(--gray-50)';
                        }
                    });
                    option.addEventListener('click', () => {
                        document.querySelectorAll('.commander-option').forEach(opt => {
                            opt.style.borderColor = 'var(--gray-300)';
                            opt.style.background = 'var(--gray-50)';
                        });
                        option.style.borderColor = 'var(--accent)';
                        option.style.background = 'var(--white)';
                    });
                });
                
                const firstOption = document.querySelector('.commander-option');
                if (firstOption) {
                    firstOption.style.borderColor = 'var(--accent)';
                    firstOption.style.background = 'var(--white)';
                }
            }, 0);
        } else {
            // Deck com apenas 1 comandante
            infoHtml += `
                <div style="margin-top: 0.75rem; padding: 0.75rem; background: var(--gray-50); border-radius: 0.5rem; border-left: 3px solid var(--accent);">
                    <strong style="color: var(--dark);">Comandante:</strong> 
                    <span style="color: var(--gray-700);">${data.comandantes[0].comandante}</span>
                    <input type="hidden" name="cdComandante" value="${data.comandantes[0].comandante}">
                </div>
            `;
        }
        
        document.getElementById('deckInfo').innerHTML = infoHtml;
        document.getElementById('deckSelecionado').style.display = 'block';
        
        deckSelecionadoAtual = { 
            id, 
            nome, 
            temPartner: data.tem_partner,
            comandantes: data.comandantes
        };
    } catch (error) {
        console.error('Erro ao selecionar deck:', error);
        alert('Erro ao carregar informações do deck');
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
    
    // Verificar se é partner e validar seleção
    if (deckSelecionadoAtual?.temPartner) {
        const checked = document.querySelectorAll('input[name="partnerComandante"]:checked');
        if (checked.length !== 2) {
            alert('Você deve selecionar exatamente 2 comandantes para este deck Partner');
            return;
        }
        data.comandante_1 = checked[0].value;
        data.comandante_2 = checked[1].value;
    } else {
        // Deck normal ou com escolha única
        const comandanteSelecionado = document.querySelector('input[name="cdComandante"]:checked')?.value 
            || document.querySelector('input[name="cdComandante"]')?.value;
        
        if (!comandanteSelecionado) {
            alert('Por favor, selecione um comandante');
            return;
        }
        
        data.comandante_1 = comandanteSelecionado;
        data.comandante_2 = null;
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

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se estamos na página de inscrição
    if (document.getElementById('inscricaoForm')) {
        verificarInscricoesAbertas();
    }
    
    carregarRodadas();
});
