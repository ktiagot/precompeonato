const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

let token = localStorage.getItem('auth_token');
let userEmail = localStorage.getItem('user_email');
let todasMesas = [];
let filtroAtual = 'todas';

// Verificar autenticação (não redireciona, apenas verifica)
async function verificarAuth(mostrarAlerta = true) {
    // Recarregar token do localStorage (pode ter mudado)
    token = localStorage.getItem('auth_token');
    userEmail = localStorage.getItem('user_email');
    
    if (!token) {
        if (mostrarAlerta) {
            alert('Você precisa fazer login para realizar esta ação');
        }
        return false;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_email');
            token = null;
            userEmail = null;
            if (mostrarAlerta) {
                alert('Sessão expirada. Faça login novamente.');
            }
            return false;
        }
        
        const data = await response.json();
        userEmail = data.email;
        localStorage.setItem('user_email', data.email);
        return true;
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        return false;
    }
}

// Carregar mesas
async function carregarMesas() {
    try {
        const response = await fetch(`${API_URL}/mesas-casuais`);
        todasMesas = await response.json();
        
        aplicarFiltro();
    } catch (error) {
        console.error('Erro ao carregar mesas:', error);
        document.getElementById('mesasList').innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--danger);">
                Erro ao carregar mesas. Tente novamente.
            </div>
        `;
    }
}

// Aplicar filtro
function filtrarMesas(filtro) {
    filtroAtual = filtro;
    aplicarFiltro();
}

function aplicarFiltro() {
    let mesasFiltradas = [...todasMesas];
    
    if (filtroAtual === 'abertas') {
        mesasFiltradas = mesasFiltradas.filter(m => m.status === 'aberta');
    } else if (filtroAtual === 'minhas') {
        mesasFiltradas = mesasFiltradas.filter(m => 
            m.criador_email === userEmail || 
            m.jogadores.some(j => j.jogador_email === userEmail)
        );
    }
    
    exibirMesas(mesasFiltradas);
}

// Exibir mesas
function exibirMesas(mesas) {
    const container = document.getElementById('mesasList');
    const emptyState = document.getElementById('emptyState');
    
    if (mesas.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    container.innerHTML = mesas.map(mesa => {
        const dataHora = new Date(mesa.data_hora);
        const dataFormatada = dataHora.toLocaleDateString('pt-BR');
        const horaFormatada = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        const ehCriador = mesa.criador_email === userEmail;
        const estaParticipando = mesa.jogadores.some(j => j.jogador_email === userEmail);
        const mesaCheia = mesa.jogadores_atuais >= mesa.max_jogadores;
        
        let statusBadge = '';
        let statusColor = '';
        
        switch(mesa.status) {
            case 'aberta':
                statusBadge = 'Aberta';
                statusColor = '#16a34a';
                break;
            case 'cheia':
                statusBadge = 'Cheia';
                statusColor = '#f59e0b';
                break;
            case 'em_andamento':
                statusBadge = 'Em Andamento';
                statusColor = '#3b82f6';
                break;
            case 'finalizada':
                statusBadge = 'Finalizada';
                statusColor = '#6b7280';
                break;
            case 'cancelada':
                statusBadge = 'Cancelada';
                statusColor = '#dc2626';
                break;
        }
        
        return `
            <div style="background: var(--white); border: 2px solid var(--gray-300); border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
                    <div style="flex: 1;">
                        <h3 style="margin: 0 0 0.5rem 0; color: var(--dark);">${mesa.titulo}</h3>
                        <p style="margin: 0; color: var(--gray-600); font-size: 0.875rem;">
                            Criado por: ${mesa.criador_email}
                        </p>
                    </div>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <span style="padding: 0.25rem 0.75rem; background: ${statusColor}; color: white; border-radius: 0.25rem; font-size: 0.875rem; font-weight: 600;">
                            ${statusBadge}
                        </span>
                        <span style="padding: 0.25rem 0.75rem; background: var(--gray-100); color: var(--gray-700); border-radius: 0.25rem; font-size: 0.875rem; font-weight: 600;">
                            ${mesa.jogadores_atuais}/${mesa.max_jogadores} jogadores
                        </span>
                    </div>
                </div>
                
                ${mesa.descricao ? `<p style="margin: 0 0 1rem 0; color: var(--gray-700);">${mesa.descricao}</p>` : ''}
                
                <div style="display: flex; gap: 1.5rem; margin-bottom: 1rem; flex-wrap: wrap; font-size: 0.875rem; color: var(--gray-600);">
                    <div>📅 ${dataFormatada}</div>
                    <div>🕐 ${horaFormatada}</div>
                </div>
                
                ${mesa.link_jogo ? `
                    <div style="margin-bottom: 1rem;">
                        <a href="${mesa.link_jogo}" target="_blank" class="btn-secondary" style="display: inline-block; text-decoration: none;">
                            🎮 Entrar no Jogo
                        </a>
                    </div>
                ` : ''}
                
                <!-- Jogadores -->
                <div style="margin-bottom: 1rem;">
                    <strong style="display: block; margin-bottom: 0.5rem; color: var(--dark);">Jogadores:</strong>
                    <div style="display: grid; gap: 0.5rem;">
                        ${mesa.jogadores.map(j => `
                            <div style="padding: 0.5rem; background: var(--gray-50); border-radius: 0.5rem; font-size: 0.875rem;">
                                <strong>${j.jogador_email}</strong>
                                ${j.deck_nome ? ` - ${j.deck_nome}` : ''}
                                ${j.comandante_1 ? ` (${j.comandante_2 ? j.comandante_1 + ' + ' + j.comandante_2 : j.comandante_1})` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Ações -->
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    ${ehCriador ? `
                        ${!mesa.link_jogo && mesa.status !== 'cancelada' ? `
                            <button onclick="adicionarLinkJogo(${mesa.id})" class="btn-secondary">
                                Adicionar Link do Jogo
                            </button>
                        ` : ''}
                        ${mesa.status === 'aberta' || mesa.status === 'cheia' ? `
                            <button onclick="cancelarMesa(${mesa.id})" style="padding: 0.625rem 1.25rem; background: var(--danger); color: white; border: none; border-radius: 0.5rem; font-weight: 500; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                                Cancelar Mesa
                            </button>
                        ` : ''}
                    ` : ''}
                    
                    ${!ehCriador && !estaParticipando && mesa.status === 'aberta' && !mesaCheia ? `
                        <button onclick="entrarNaMesa(${mesa.id})" class="btn-primary">
                            Entrar na Mesa
                        </button>
                    ` : ''}
                    
                    ${!ehCriador && estaParticipando && (mesa.status === 'aberta' || mesa.status === 'cheia') ? `
                        <button onclick="sairDaMesa(${mesa.id})" class="btn-secondary">
                            Sair da Mesa
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Abrir modal criar mesa
document.getElementById('btnCriarMesa').addEventListener('click', async () => {
    const autenticado = await verificarAuth(true);
    if (!autenticado) {
        // Redirecionar para login
        if (confirm('Você precisa fazer login para criar uma mesa. Ir para a página de login?')) {
            window.location.href = 'login.html';
        }
        return;
    }
    
    document.getElementById('modalCriarMesa').style.display = 'flex';
    
    // Definir data/hora mínima como agora
    const agora = new Date();
    agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
    document.querySelector('input[name="data_hora"]').min = agora.toISOString().slice(0, 16);
});

// Fechar modal
function fecharModal() {
    document.getElementById('modalCriarMesa').style.display = 'none';
    document.getElementById('formCriarMesa').reset();
    document.getElementById('deckIdCasual').value = '';
}

// Busca de deck
let timeoutBusca;
document.getElementById('deckBuscaCasual').addEventListener('input', (e) => {
    clearTimeout(timeoutBusca);
    const busca = e.target.value.trim();
    
    if (busca.length < 2) {
        document.getElementById('deckSugestoesCasual').style.display = 'none';
        return;
    }
    
    timeoutBusca = setTimeout(async () => {
        try {
            const response = await fetch(`${API_URL}/precons?busca=${encodeURIComponent(busca)}`);
            const precons = await response.json();
            
            const sugestoes = document.getElementById('deckSugestoesCasual');
            
            if (precons.length === 0) {
                sugestoes.innerHTML = '<div style="padding: 0.5rem; color: var(--gray-600);">Nenhum deck encontrado</div>';
                sugestoes.style.display = 'block';
                return;
            }
            
            sugestoes.innerHTML = precons.slice(0, 5).map(p => `
                <div onclick="selecionarDeckCasual(${p.id}, '${p.nome.replace(/'/g, "\\'")}', '${p.comandante_principal.replace(/'/g, "\\'")}', ${p.comandante_secundario ? `'${p.comandante_secundario.replace(/'/g, "\\'")}'` : 'null'})" 
                     style="padding: 0.75rem; cursor: pointer; border-bottom: 1px solid var(--gray-200);"
                     onmouseover="this.style.background='var(--gray-50)'"
                     onmouseout="this.style.background='white'">
                    <strong>${p.nome}</strong><br>
                    <small style="color: var(--gray-600);">${p.comandante_principal}${p.comandante_secundario ? ' / ' + p.comandante_secundario : ''} - ${p.set_nome}</small>
                </div>
            `).join('');
            
            sugestoes.style.display = 'block';
        } catch (error) {
            console.error('Erro ao buscar precons:', error);
        }
    }, 300);
});

// Selecionar deck
async function selecionarDeckCasual(id, nome, comandante1, comandante2) {
    document.getElementById('deckIdCasual').value = id;
    document.getElementById('deckBuscaCasual').value = nome;
    document.getElementById('deckSugestoesCasual').style.display = 'none';
    
    // Se tiver comandantes múltiplos, mostrar seleção
    // Por enquanto, vamos usar o comandante principal por padrão
}

// Criar mesa
document.getElementById('formCriarMesa').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        titulo: formData.get('titulo'),
        descricao: formData.get('descricao'),
        data_hora: formData.get('data_hora'),
        max_jogadores: parseInt(formData.get('max_jogadores')),
        deck_precon_id: document.getElementById('deckIdCasual').value || null,
        comandante_1: null,
        comandante_2: null
    };
    
    try {
        const response = await fetch(`${API_URL}/mesas-casuais`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao criar mesa');
        }
        
        alert('Mesa criada com sucesso!');
        fecharModal();
        carregarMesas();
    } catch (error) {
        console.error('Erro ao criar mesa:', error);
        alert('Erro ao criar mesa: ' + error.message);
    }
});

// Entrar na mesa
async function entrarNaMesa(mesaId) {
    const autenticado = await verificarAuth(true);
    if (!autenticado) {
        if (confirm('Você precisa fazer login para entrar em uma mesa. Ir para a página de login?')) {
            window.location.href = 'login.html';
        }
        return;
    }
    
    // Por enquanto, entrar sem deck
    try {
        const response = await fetch(`${API_URL}/mesas-casuais/${mesaId}/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                deck_precon_id: null,
                comandante_1: null,
                comandante_2: null
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao entrar na mesa');
        }
        
        alert('Você entrou na mesa!');
        carregarMesas();
    } catch (error) {
        console.error('Erro ao entrar na mesa:', error);
        alert('Erro: ' + error.message);
    }
}

// Sair da mesa
async function sairDaMesa(mesaId) {
    if (!confirm('Tem certeza que deseja sair desta mesa?')) return;
    
    try {
        const response = await fetch(`${API_URL}/mesas-casuais/${mesaId}/leave`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao sair da mesa');
        }
        
        alert('Você saiu da mesa');
        carregarMesas();
    } catch (error) {
        console.error('Erro ao sair da mesa:', error);
        alert('Erro: ' + error.message);
    }
}

// Adicionar link do jogo
async function adicionarLinkJogo(mesaId) {
    const link = prompt('Cole o link do jogo (SpellTable, Discord, etc.):');
    if (!link) return;
    
    try {
        const response = await fetch(`${API_URL}/mesas-casuais/${mesaId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ link_jogo: link })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao adicionar link');
        }
        
        alert('Link adicionado com sucesso!');
        carregarMesas();
    } catch (error) {
        console.error('Erro ao adicionar link:', error);
        alert('Erro: ' + error.message);
    }
}

// Cancelar mesa
async function cancelarMesa(mesaId) {
    if (!confirm('Tem certeza que deseja cancelar esta mesa?')) return;
    
    try {
        const response = await fetch(`${API_URL}/mesas-casuais/${mesaId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao cancelar mesa');
        }
        
        alert('Mesa cancelada');
        carregarMesas();
    } catch (error) {
        console.error('Erro ao cancelar mesa:', error);
        alert('Erro: ' + error.message);
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar auth silenciosamente (sem alertas)
    const autenticado = await verificarAuth(false);
    
    // Carregar mesas independente de estar logado ou não
    carregarMesas();
    
    // Atualizar a cada 30 segundos
    setInterval(carregarMesas, 30000);
    
    // Atualizar botão de criar mesa baseado no login
    const btnCriar = document.getElementById('btnCriarMesa');
    if (autenticado && token) {
        btnCriar.innerHTML = 'Criar Nova Mesa';
        btnCriar.style.cursor = 'pointer';
    } else {
        btnCriar.innerHTML = '🔒 Fazer Login para Criar Mesa';
        btnCriar.style.cursor = 'pointer';
    }
});
