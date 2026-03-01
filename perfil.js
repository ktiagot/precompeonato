const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

// Verificar autenticação
async function checkAuth() {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
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
        
        // Mostrar badge de admin se for admin
        if (user.is_admin) {
            document.getElementById('adminBadge').style.display = 'block';
            document.getElementById('adminArea').style.display = 'block';
        }
        
        return user;
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        localStorage.clear();
        window.location.href = 'login.html';
        return false;
    }
}

// Logout
function logout() {
    const token = localStorage.getItem('auth_token');
    
    fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    }).finally(() => {
        localStorage.clear();
        window.location.href = 'login.html';
    });
}

// Carregar minhas mesas
async function carregarMinhasMesas(userEmail) {
    try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_URL}/minhas-mesas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar mesas');
        }
        
        const mesas = await response.json();
        const container = document.getElementById('minhasMesas');
        const nenhumaMesa = document.getElementById('nenhumaMesa');
        
        if (mesas.length === 0) {
            container.style.display = 'none';
            nenhumaMesa.style.display = 'block';
            return;
        }
        
        container.innerHTML = mesas.map(mesa => {
            const dataFormatada = mesa.data_rodada 
                ? new Date(mesa.data_rodada + 'T00:00:00').toLocaleDateString('pt-BR')
                : 'Data não definida';
            
            const statusClass = mesa.finalizada ? 'success' : 'warning';
            const statusText = mesa.finalizada ? 'Finalizada' : 'Pendente';
            
            return `
                <div class="card" style="margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                        <div>
                            <h4>Rodada ${mesa.rodada_numero} - Mesa ${mesa.numero_mesa}</h4>
                            <p style="color: var(--gray-600); font-size: 0.875rem; margin-top: 0.25rem;">
                                ${dataFormatada}
                            </p>
                        </div>
                        <span class="badge badge-${statusClass}">${statusText}</span>
                    </div>
                    
                    <div style="display: grid; gap: 0.75rem;">
                        ${mesa.jogadores.map(j => {
                            const isMe = j.email === userEmail;
                            const isVencedor = mesa.vencedor_id === j.inscricao_id;
                            
                            return `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: ${isMe ? 'var(--primary)' : 'var(--gray-100)'}; color: ${isMe ? 'white' : 'inherit'}; border-radius: 0.5rem;">
                                    <div>
                                        <strong>${j.nome}${isMe ? ' (Você)' : ''}</strong>
                                        <span style="opacity: 0.8; font-size: 0.875rem;"> - ${j.deck_nome || 'Deck não definido'}</span>
                                    </div>
                                    ${mesa.finalizada && j.posicao_final ? `
                                        <span style="font-weight: 600; ${isMe ? '' : 'color: var(--gray-600);'}">
                                            ${isVencedor ? '🏆 ' : ''}${j.posicao_final}º lugar
                                        </span>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    ${mesa.finalizada && mesa.vencedor_nome ? `
                        <div style="margin-top: 1rem; padding: 0.75rem; background: var(--success); color: white; border-radius: 0.5rem; text-align: center;">
                            <strong>🏆 Vencedor: ${mesa.vencedor_nome}</strong>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Erro ao carregar mesas:', error);
        document.getElementById('minhasMesas').innerHTML = `
            <div class="card" style="background: var(--danger); color: white;">
                <p>Erro ao carregar suas mesas. Tente novamente mais tarde.</p>
            </div>
        `;
    }
}

// Inicializar
checkAuth().then(user => {
    if (user) {
        carregarMinhasMesas(user.email);
    }
});
