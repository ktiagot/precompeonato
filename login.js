const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

let currentEmail = '';

// Mostrar mensagem
function showMessage(message, type = 'success') {
    const container = document.getElementById('messageContainer');
    container.innerHTML = `<div class="message ${type}">${message}</div>`;
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

// Etapa 1: Solicitar código
document.getElementById('emailForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('emailInput').value;
    const btn = document.getElementById('sendCodeBtn');
    
    btn.disabled = true;
    btn.textContent = 'Enviando...';
    
    try {
        const response = await fetch(`${API_URL}/auth/solicitar-codigo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentEmail = email;
            document.getElementById('emailDisplay').textContent = email;
            document.getElementById('emailForm').style.display = 'none';
            document.getElementById('codeForm').classList.add('active');
            showMessage(data.message || 'Código enviado! Verifique seu email.', 'success');
        } else {
            showMessage(data.error || 'Erro ao enviar código', 'error');
            btn.disabled = false;
            btn.textContent = 'Enviar Código';
        }
    } catch (error) {
        showMessage('Erro ao conectar com o servidor', 'error');
        btn.disabled = false;
        btn.textContent = 'Enviar Código';
    }
});

// Etapa 2: Verificar código
document.getElementById('codeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const codigo = document.getElementById('codeInput').value;
    const btn = document.getElementById('verifyCodeBtn');
    
    if (codigo.length !== 6) {
        showMessage('O código deve ter 6 dígitos', 'error');
        return;
    }
    
    btn.disabled = true;
    btn.textContent = 'Verificando...';
    
    try {
        const response = await fetch(`${API_URL}/auth/verificar-codigo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentEmail, codigo })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Salvar token no localStorage
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('user_email', data.email);
            localStorage.setItem('is_admin', data.isAdmin);
            
            showMessage('Login realizado com sucesso! Redirecionando...', 'success');
            
            // Redirecionar baseado no tipo de usuário
            setTimeout(() => {
                if (data.isAdmin) {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'index.html';
                }
            }, 1500);
        } else {
            showMessage(data.error || 'Código inválido ou expirado', 'error');
            btn.disabled = false;
            btn.textContent = 'Verificar Código';
        }
    } catch (error) {
        showMessage('Erro ao conectar com o servidor', 'error');
        btn.disabled = false;
        btn.textContent = 'Verificar Código';
    }
});

// Botão voltar
document.getElementById('backBtn').addEventListener('click', () => {
    document.getElementById('codeForm').classList.remove('active');
    document.getElementById('emailForm').style.display = 'flex';
    document.getElementById('codeInput').value = '';
    document.getElementById('sendCodeBtn').disabled = false;
    document.getElementById('sendCodeBtn').textContent = 'Enviar Código';
    currentEmail = '';
});

// Auto-focus no input de código quando aparecer
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.target.classList.contains('active')) {
            document.getElementById('codeInput').focus();
        }
    });
});

observer.observe(document.getElementById('codeForm'), {
    attributes: true,
    attributeFilter: ['class']
});
