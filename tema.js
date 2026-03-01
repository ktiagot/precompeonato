// Carregar e aplicar tema do campeonato ativo
// Usa cache localStorage para evitar flash de cores
(function() {
    const TEMA_API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api' 
        : '/api';
    
    const CACHE_KEY = 'precompeonato_tema';
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

    // Função para aplicar tema
    function aplicarTema(tema) {
        if (tema.cor_primaria) {
            document.documentElement.style.setProperty('--primary', tema.cor_primaria);
            document.documentElement.style.setProperty('--primary-dark', ajustarCor(tema.cor_primaria, -20));
        }
        if (tema.cor_secundaria) {
            document.documentElement.style.setProperty('--secondary', tema.cor_secundaria);
        }
        if (tema.cor_destaque) {
            document.documentElement.style.setProperty('--accent', tema.cor_destaque);
        }
        if (tema.cor_header) {
            document.documentElement.style.setProperty('--header-bg', tema.cor_header);
            // Ajustar cor do texto do header baseado no brilho da cor de fundo
            const brightness = getBrightness(tema.cor_header);
            const textColor = brightness > 128 ? '#1e293b' : '#ffffff';
            document.documentElement.style.setProperty('--header-text', textColor);
        }
        
        // Atualizar título e tornar clicável
        const titleElement = document.querySelector('header h1');
        if (titleElement) {
            if (tema.nome) {
                titleElement.textContent = `${tema.nome}${tema.edicao ? ' - ' + tema.edicao : ''}`;
            }
            // Tornar o H1 clicável para voltar à home
            titleElement.style.cursor = 'pointer';
            titleElement.onclick = () => window.location.href = 'index.html';
        }
        
        // Adicionar logo (prioriza logo_url da API, senão usa local)
        const logoUrl = tema.logo_url || 'assets/logo.png';
        if (!document.querySelector('header img[alt="Logo"]')) {
            const header = document.querySelector('header .container');
            if (header) {
                const logo = document.createElement('img');
                logo.src = logoUrl;
                logo.alt = 'Logo';
                logo.style.height = '60px';
                logo.style.marginRight = '1rem';
                logo.style.cursor = 'pointer';
                logo.onclick = () => window.location.href = 'index.html';
                header.prepend(logo);
            }
        }
    }
    
    // Função auxiliar para ajustar cor
    function ajustarCor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255))
            .toString(16).slice(1);
    }
    
    // Função para calcular brilho de uma cor (0-255)
    function getBrightness(hex) {
        const rgb = parseInt(hex.replace('#', ''), 16);
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >> 8) & 0xff;
        const b = (rgb >> 0) & 0xff;
        return (r * 299 + g * 587 + b * 114) / 1000;
    }
    
    // Tentar aplicar tema do cache imediatamente
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { tema, timestamp } = JSON.parse(cached);
            const agora = Date.now();
            
            // Se o cache ainda é válido, aplicar imediatamente
            if (agora - timestamp < CACHE_DURATION) {
                aplicarTema(tema);
                console.log('🎨 Tema aplicado do cache');
            }
        }
    } catch (e) {
        console.error('Erro ao ler cache do tema:', e);
    }
    
    // Buscar tema atualizado da API (em background)
    fetch(`${TEMA_API_URL}/tema`)
        .then(response => {
            if (!response.ok) throw new Error('Erro ao buscar tema');
            return response.json();
        })
        .then(tema => {
            // Salvar no cache
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                tema,
                timestamp: Date.now()
            }));
            
            // Aplicar tema
            aplicarTema(tema);
            console.log('✅ Tema atualizado da API');
        })
        .catch(error => {
            console.error('❌ Erro ao carregar tema:', error);
        });
})();
