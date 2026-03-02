const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

// Formatar status para exibição
function formatarStatus(status) {
    const statusMap = {
        'inscricoes': 'Inscrições Abertas',
        'em_andamento': 'Em Andamento',
        'finalizado': 'Finalizado',
        'cancelado': 'Cancelado'
    };
    return statusMap[status] || status;
}

// Obter classe CSS do badge baseado no status
function getStatusBadgeClass(status) {
    const classMap = {
        'inscricoes': 'badge-info',
        'em_andamento': 'badge-success',
        'finalizado': 'badge-warning',
        'cancelado': 'badge-error'
    };
    return classMap[status] || 'badge-info';
}

// Verificar autenticação
async function checkAuth() {
    const token = localStorage.getItem('auth_token');
    const isAdmin = localStorage.getItem('is_admin') === 'true';
    
    if (!token || !isAdmin) {
        window.location.href = 'login.html';
        return false;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            localStorage.clear();
            window.location.href = 'login.html';
            return false;
        }
        
        const user = await response.json();
        document.getElementById('userEmail').textContent = user.email;
        return true;
    } catch (error) {
        localStorage.clear();
        window.location.href = 'login.html';
        return false;
    }
}

// Fazer requisição autenticada
async function authFetch(url, options = {}) {
    const token = localStorage.getItem('auth_token');
    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
}

// Logout
async function logout() {
    const token = localStorage.getItem('auth_token');
    await authFetch(`${API_URL}/auth/logout`, { method: 'POST' });
    localStorage.clear();
    window.location.href = 'login.html';
}

// Mostrar alerta
function showAlert(message, type = 'success') {
    const container = document.getElementById('alertContainer');
    container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

// Gerenciar tabs
document.querySelectorAll('.tab-admin-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        document.querySelectorAll('.tab-admin-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        document.querySelectorAll('.tab-admin-content').forEach(content => {
            content.classList.remove('active');
        });
        
        document.getElementById(`tab-${tabName}`).classList.add('active');
        
        // Carregar dados da tab
        if (tabName === 'pareamento') {
            carregarRodadas();
            carregarCampeonatoAtivo();
        } else if (tabName === 'resultados') {
            carregarRodadasParaResultado();
        } else if (tabName === 'campeonatos') {
            carregarCampeonatos();
        } else if (tabName === 'inscritos') {
            carregarInscritos();
        } else if (tabName === 'emails') {
            carregarEmails();
        }
    });
});

// ========== PAREAMENTO ==========

let campeonatoAtivoId = null;

// Carregar campeonato ativo
async function carregarCampeonatoAtivo() {
    try {
        const response = await fetch(`${API_URL}/tema`);
        const tema = await response.json();
        
        // Buscar o campeonato ativo completo
        const campResponse = await fetch(`${API_URL}/campeonatos`);
        const campeonatos = await campResponse.json();
        const campeonatoAtivo = campeonatos.find(c => c.status === 'inscricoes' || c.status === 'em_andamento');
        
        if (campeonatoAtivo) {
            campeonatoAtivoId = campeonatoAtivo.id;
            document.getElementById('campeonatoAtivo').innerHTML = `
                <strong>Campeonato:</strong> ${tema.nome}${tema.edicao ? ' - ' + tema.edicao : ''} 
                <span class="badge ${getStatusBadgeClass(campeonatoAtivo.status)}">${formatarStatus(campeonatoAtivo.status)}</span>
            `;
            
            // Verificar se há mesas pendentes
            await verificarMesasPendentes();
        } else {
            document.getElementById('campeonatoAtivo').innerHTML = `
                <span style="color: var(--danger);">⚠️ Nenhum campeonato ativo encontrado</span>
            `;
            document.getElementById('parearForm').querySelector('button[type="submit"]').disabled = true;
        }
    } catch (error) {
        console.error('Erro ao carregar campeonato ativo:', error);
        document.getElementById('campeonatoAtivo').textContent = 'Erro ao carregar campeonato';
    }
}

// Verificar se há mesas pendentes
async function verificarMesasPendentes() {
    try {
        const response = await authFetch(`${API_URL}/admin/mesas-pendentes`);
        const mesasPendentes = await response.json();
        
        const submitButton = document.getElementById('parearForm').querySelector('button[type="submit"]');
        const avisoDiv = document.getElementById('avisoMesasPendentes');
        
        if (mesasPendentes.length > 0) {
            submitButton.disabled = true;
            if (avisoDiv) {
                avisoDiv.style.display = 'block';
                avisoDiv.innerHTML = `
                    <div style="background: rgba(251, 191, 36, 0.1); border: 1px solid #d97706; color: #d97706; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                        ⚠️ Existem ${mesasPendentes.length} mesa(s) pendente(s). Finalize todos os resultados antes de gerar uma nova rodada.
                    </div>
                `;
            }
        } else {
            submitButton.disabled = false;
            if (avisoDiv) {
                avisoDiv.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Erro ao verificar mesas pendentes:', error);
    }
}

// Gerar pareamento
document.getElementById('parearForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!campeonatoAtivoId) {
        showAlert('Nenhum campeonato ativo encontrado', 'error');
        return;
    }
    
    const numero = document.getElementById('rodadaNumero').value;
    const dataRodada = document.getElementById('dataRodada').value;
    
    try {
        const response = await authFetch(`${API_URL}/admin/parear`, {
            method: 'POST',
            body: JSON.stringify({ campeonatoId: campeonatoAtivoId, numero, dataRodada })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert(`Pareamento gerado! ${result.mesasCriadas} mesas criadas com ${result.totalJogadores} jogadores.`, 'success');
            e.target.reset();
            carregarRodadas();
        } else {
            showAlert(result.error || 'Erro ao gerar pareamento', 'error');
        }
    } catch (error) {
        showAlert('Erro ao conectar com o servidor', 'error');
    }
});

// Carregar rodadas existentes
async function carregarRodadas() {
    try {
        const response = await authFetch(`${API_URL}/admin/rodadas`);
        const rodadas = await response.json();
        
        const container = document.getElementById('rodadasList');
        
        if (rodadas.length === 0) {
            container.innerHTML = '<p>Nenhuma rodada criada ainda.</p>';
            return;
        }
        
        container.innerHTML = rodadas.map(r => {
            let dataFormatada = 'Não definida';
            if (r.data_rodada) {
                try {
                    // Tentar diferentes formatos de data
                    let data;
                    if (typeof r.data_rodada === 'string') {
                        // Se já tem 'T', usar direto, senão adicionar
                        data = new Date(r.data_rodada.includes('T') ? r.data_rodada : r.data_rodada + 'T00:00:00');
                    } else {
                        data = new Date(r.data_rodada);
                    }
                    
                    if (!isNaN(data.getTime())) {
                        dataFormatada = data.toLocaleDateString('pt-BR');
                    }
                } catch (e) {
                    console.error('Erro ao formatar data:', e, r.data_rodada);
                }
            }
            
            return `
                <div class="card">
                    <div class="mesa-header">
                        <div>
                            <h4>Rodada ${r.numero} - ${r.campeonato_nome}</h4>
                            <p style="margin: 0.25rem 0; color: var(--gray-600); font-size: 0.875rem;">
                                Data: ${dataFormatada}
                            </p>
                        </div>
                        <span class="badge badge-info">
                            ${r.mesas_finalizadas}/${r.total_mesas} finalizadas
                        </span>
                    </div>
                    <button onclick="verMesasRodada(${r.id})" class="btn-primary" style="margin-top: 0.5rem;">
                        Ver Mesas
                    </button>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Erro ao carregar rodadas:', error);
    }
}

// Ver mesas de uma rodada
window.verMesasRodada = async function(rodadaId) {
    try {
        const response = await authFetch(`${API_URL}/admin/rodadas/${rodadaId}/mesas`);
        const mesas = await response.json();
        
        const container = document.getElementById('rodadasList');
        container.innerHTML = `
            <button onclick="carregarRodadas()" class="btn-primary" style="margin-bottom: 1rem;">
                ← Voltar para Rodadas
            </button>
            ${mesas.map(m => `
                <div class="mesa-card">
                    <div class="mesa-header">
                        <h4>Mesa ${m.numero_mesa}</h4>
                        <span class="badge ${m.finalizada ? 'badge-success' : 'badge-warning'}">
                            ${m.finalizada ? 'Finalizada' : 'Pendente'}
                        </span>
                    </div>
                    ${m.jogadores.map((j, idx) => `
                        <div class="jogador-item">
                            <div>
                                <strong>${j.nome}</strong>
                                <span style="color: var(--gray-600); font-size: 0.875rem;"> - ${j.deck_nome || 'Deck não definido'}</span>
                            </div>
                            ${m.finalizada ? `<span class="badge badge-info">${j.posicao_final || '?'}º lugar</span>` : ''}
                        </div>
                    `).join('')}
                    ${m.finalizada ? `
                        <p style="margin-top: 0.75rem; color: var(--gray-600); font-size: 0.875rem;">
                            <strong>Vencedor:</strong> ${m.vencedor_nome} | 
                            <strong>2º Lugar:</strong> ${m.segundo_nome || 'N/A'}
                        </p>
                    ` : ''}
                </div>
            `).join('')}
        `;
    } catch (error) {
        console.error('Erro ao carregar mesas:', error);
    }
};

// ========== RESULTADOS ==========

// Carregar rodadas para resultado
async function carregarRodadasParaResultado() {
    const response = await authFetch(`${API_URL}/admin/rodadas`);
    const rodadas = await response.json();
    const select = document.getElementById('rodadaResultado');
    
    select.innerHTML = '<option value="">Selecione uma rodada</option>' +
        rodadas.filter(r => r.status !== 'finalizada').map(r => 
            `<option value="${r.id}">Rodada ${r.numero} - ${r.campeonato_nome}</option>`
        ).join('');
    
    carregarMesasPendentes();
}

// Carregar mesas ao selecionar rodada
document.getElementById('rodadaResultado').addEventListener('change', async (e) => {
    const rodadaId = e.target.value;
    if (!rodadaId) return;
    
    const response = await authFetch(`${API_URL}/admin/rodadas/${rodadaId}/mesas`);
    const mesas = await response.json();
    const select = document.getElementById('mesaResultado');
    
    select.innerHTML = '<option value="">Selecione uma mesa</option>' +
        mesas.filter(m => !m.finalizada).map(m => 
            `<option value="${m.id}">Mesa ${m.numero_mesa}</option>`
        ).join('');
});

// Carregar jogadores ao selecionar mesa
document.getElementById('mesaResultado').addEventListener('change', async (e) => {
    const mesaId = e.target.value;
    if (!mesaId) {
        document.getElementById('jogadoresMesa').innerHTML = '';
        return;
    }
    
    const response = await authFetch(`${API_URL}/admin/mesas/${mesaId}`);
    const mesa = await response.json();
    
    const container = document.getElementById('jogadoresMesa');
    
    // Criar opções de jogadores para os selects
    const jogadoresOptions = mesa.jogadores.map(j => 
        `<option value="${j.inscricao_id}">${j.nome} - ${j.deck_nome || 'Deck não definido'}</option>`
    ).join('');
    
    container.innerHTML = `
        <div style="background: var(--gray-50); padding: 1.5rem; border-radius: 0.5rem; border: 2px solid var(--primary);">
            <h4 style="margin-bottom: 1rem; color: var(--primary);">Selecione as posições finais</h4>
            <p style="color: var(--gray-600); font-size: 0.875rem; margin-bottom: 1.5rem;">
                Escolha o 1º e 2º lugar da mesa (ambos obrigatórios)
            </p>
            
            <div style="display: grid; gap: 1rem;">
                <!-- 1º Lugar -->
                <div style="background: white; padding: 1rem; border-radius: 0.5rem; border: 2px solid #16a34a;">
                    <label style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
                        <span style="background: #16a34a; color: white; padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; min-width: 100px; text-align: center;">
                            🏆 1º Lugar
                        </span>
                        <select name="primeiro" required style="flex: 1; padding: 0.75rem; border: 1px solid var(--gray-300); border-radius: 0.5rem; font-size: 1rem;">
                            <option value="">Selecione o jogador</option>
                            ${jogadoresOptions}
                        </select>
                    </label>
                </div>
                
                <!-- 2º Lugar -->
                <div style="background: white; padding: 1rem; border-radius: 0.5rem; border: 2px solid #3b82f6;">
                    <label style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
                        <span style="background: #3b82f6; color: white; padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; min-width: 100px; text-align: center;">
                            🥈 2º Lugar
                        </span>
                        <select name="segundo" required style="flex: 1; padding: 0.75rem; border: 1px solid var(--gray-300); border-radius: 0.5rem; font-size: 1rem;">
                            <option value="">Selecione o jogador</option>
                            ${jogadoresOptions}
                        </select>
                    </label>
                </div>
            </div>
        </div>
    `;
});

// Salvar resultado
document.getElementById('resultadoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const mesaId = document.getElementById('mesaResultado').value;
    const primeiroId = document.querySelector('select[name="primeiro"]')?.value;
    const segundoId = document.querySelector('select[name="segundo"]')?.value;
    
    if (!primeiroId) {
        showAlert('Selecione o 1º lugar', 'error');
        return;
    }
    
    if (!segundoId) {
        showAlert('Selecione o 2º lugar', 'error');
        return;
    }
    
    if (primeiroId === segundoId) {
        showAlert('O 1º e 2º lugar devem ser jogadores diferentes', 'error');
        return;
    }
    
    try {
        const response = await authFetch(`${API_URL}/admin/resultado`, {
            method: 'POST',
            body: JSON.stringify({ 
                mesaId, 
                vencedorId: primeiroId, 
                segundoId: segundoId || null 
            })
        });
        
        if (response.ok) {
            showAlert('Resultado salvo com sucesso!', 'success');
            e.target.reset();
            document.getElementById('jogadoresMesa').innerHTML = '';
            carregarRodadasParaResultado();
        } else {
            const error = await response.json();
            showAlert(error.error || 'Erro ao salvar resultado', 'error');
        }
    } catch (error) {
        showAlert('Erro ao conectar com o servidor', 'error');
    }
});

// Carregar mesas pendentes
async function carregarMesasPendentes() {
    const response = await authFetch(`${API_URL}/admin/mesas-pendentes`);
    const mesas = await response.json();
    const container = document.getElementById('mesasPendentes');
    
    if (mesas.length === 0) {
        container.innerHTML = '<p>Nenhuma mesa pendente.</p>';
        return;
    }
    
    container.innerHTML = mesas.map(m => `
        <div class="mesa-card">
            <div class="mesa-header">
                <div>
                    <h4>Mesa ${m.numero_mesa} - Rodada ${m.rodada_numero}</h4>
                    <p style="margin: 0; color: var(--gray-600); font-size: 0.875rem;">${m.campeonato_nome}</p>
                </div>
            </div>
            ${m.jogadores.map(j => `
                <div class="jogador-item">
                    <strong>${j.nome}</strong>
                    <span style="color: var(--gray-600); font-size: 0.875rem;">${j.deck_nome}</span>
                </div>
            `).join('')}
        </div>
    `).join('');
}

// ========== CAMPEONATOS ==========

document.getElementById('campeonatoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    const response = await authFetch(`${API_URL}/campeonatos`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
    
    if (response.ok) {
        alert('Campeonato criado!');
        e.target.reset();
        carregarCampeonatos();
    }
});

async function carregarCampeonatos() {
    const response = await fetch(`${API_URL}/campeonatos`);
    const campeonatos = await response.json();
    const container = document.getElementById('campeonatosList');
    
    container.innerHTML = campeonatos.map(c => `
        <div class="card">
            <p><strong>${c.nome}</strong> - ${c.edicao}</p>
            <p>Início: ${new Date(c.data_inicio).toLocaleDateString('pt-BR')}</p>
            <p>Status: <span class="badge ${getStatusBadgeClass(c.status)}">${formatarStatus(c.status)}</span></p>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem;">
                <button onclick="mudarStatus(${c.id}, 'inscricoes')" class="btn-primary" style="flex: 1;">Abrir Inscrições</button>
                <button onclick="mudarStatus(${c.id}, 'em_andamento')" class="btn-primary" style="flex: 1;">Iniciar</button>
                <button onclick="mudarStatus(${c.id}, 'finalizado')" class="btn-primary" style="flex: 1;">Finalizar</button>
            </div>
        </div>
    `).join('');
}

window.mudarStatus = async function(id, status) {
    const response = await authFetch(`${API_URL}/campeonatos/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
    });
    
    if (response.ok) {
        alert('Status atualizado!');
        carregarCampeonatos();
    }
};

// ========== INSCRITOS ==========

async function carregarInscritos() {
    const response = await fetch(`${API_URL}/inscricoes`);
    const inscricoes = await response.json();
    const container = document.getElementById('inscritosList');
    
    container.innerHTML = inscricoes.map(i => `
        <div class="card">
            <p><strong>ID: ${i.id} - ${i.nome}</strong></p>
            <p>Email: ${i.email}</p>
            <p>Deck: ${i.deck_nome}</p>
            <p>Pontos: ${i.pontos} | Vitórias: ${i.vitorias}</p>
        </div>
    `).join('');
}

// ========== PRECONS ==========

document.getElementById('preconForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    const response = await authFetch(`${API_URL}/precons`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
    
    if (response.ok) {
        alert('Precon cadastrado!');
        e.target.reset();
    }
});

// ========== EMAILS ==========

// Carregar emails permitidos
async function carregarEmails() {
    try {
        const response = await fetch(`${API_URL}/emails-permitidos`);
        const emails = await response.json();
        
        const container = document.getElementById('emailsList');
        
        if (emails.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--gray-600); padding: 2rem;">Nenhum email cadastrado ainda.</p>';
            return;
        }
        
        container.innerHTML = emails.map(e => `
            <div class="card" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; margin-bottom: 0.5rem;">
                <div>
                    ${e.nome ? `<div style="font-weight: 600; margin-bottom: 0.25rem;">${e.nome}</div>` : ''}
                    <div style="font-family: monospace; font-size: 0.95rem; color: ${e.nome ? 'var(--gray-600)' : 'inherit'};">${e.email}</div>
                </div>
                <button onclick="removerEmail('${e.email}')" class="btn-secondary" style="border-color: var(--danger); color: var(--danger); padding: 0.5rem 1rem;">
                    Remover
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar emails:', error);
    }
}

// Remover email
window.removerEmail = async function(email) {
    if (!confirm(`Tem certeza que deseja remover o email ${email}?`)) {
        return;
    }
    
    try {
        const response = await authFetch(`${API_URL}/emails-permitidos/${encodeURIComponent(email)}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showAlert('Email removido com sucesso!', 'success');
            carregarEmails();
        } else {
            showAlert('Erro ao remover email', 'error');
        }
    } catch (error) {
        showAlert('Erro ao conectar com o servidor', 'error');
    }
};

document.getElementById('emailForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    const response = await authFetch(`${API_URL}/emails-permitidos`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
    
    if (response.ok) {
        showAlert('Email adicionado com sucesso!', 'success');
        e.target.reset();
        carregarEmails();
    } else {
        showAlert('Erro ao adicionar email', 'error');
    }
});

// Inicializar
checkAuth().then(authenticated => {
    if (authenticated) {
        carregarCampeonatoAtivo();
        carregarRodadas();
    }
});
