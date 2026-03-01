const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

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
        } else if (tabName === 'resultados') {
            carregarRodadasParaResultado();
        } else if (tabName === 'campeonatos') {
            carregarCampeonatos();
        } else if (tabName === 'inscritos') {
            carregarInscritos();
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
                <span class="badge badge-success">${campeonatoAtivo.status}</span>
            `;
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
    if (!mesaId) return;
    
    const response = await authFetch(`${API_URL}/admin/mesas/${mesaId}`);
    const mesa = await response.json();
    
    const container = document.getElementById('jogadoresMesa');
    container.innerHTML = `
        <h4>Jogadores da Mesa</h4>
        ${mesa.jogadores.map((j, idx) => `
            <div class="jogador-item">
                <div>
                    <strong>${j.nome}</strong>
                    <span style="color: var(--gray-600); font-size: 0.875rem;"> - ${j.deck_nome}</span>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <label>
                        <input type="radio" name="vencedor" value="${j.inscricao_id}" required>
                        1º
                    </label>
                    <label>
                        <input type="radio" name="segundo" value="${j.inscricao_id}">
                        2º
                    </label>
                    <label>
                        <input type="radio" name="terceiro" value="${j.inscricao_id}">
                        3º
                    </label>
                    <label>
                        <input type="radio" name="quarto" value="${j.inscricao_id}">
                        4º
                    </label>
                </div>
            </div>
        `).join('')}
    `;
});

// Salvar resultado
document.getElementById('resultadoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const mesaId = document.getElementById('mesaResultado').value;
    const vencedorId = document.querySelector('input[name="vencedor"]:checked')?.value;
    const segundoId = document.querySelector('input[name="segundo"]:checked')?.value;
    
    if (!vencedorId) {
        showAlert('Selecione o vencedor', 'error');
        return;
    }
    
    try {
        const response = await authFetch(`${API_URL}/admin/resultado`, {
            method: 'POST',
            body: JSON.stringify({ mesaId, vencedorId, segundoId })
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
            <p>Status: <span class="badge badge-info">${c.status}</span></p>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem;">
                <button onclick="mudarStatus(${c.id}, 'inscricoes')" class="btn-primary" style="flex: 1;">Inscrições</button>
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

document.getElementById('emailForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    const response = await authFetch(`${API_URL}/emails-permitidos`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
    
    if (response.ok) {
        alert('Email adicionado!');
        e.target.reset();
    }
});

// Inicializar
checkAuth().then(authenticated => {
    if (authenticated) {
        carregarCampeonatoAtivo();
        carregarRodadas();
    }
});
