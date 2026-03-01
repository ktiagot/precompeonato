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
        
        // Atualizar título
        const titleElement = document.querySelector('header h1');
        if (titleElement && tema.nome) {
            titleElement.textContent = `${tema.nome}${tema.edicao ? ' - ' + tema.edicao : ''}`;
        }
        
        // Adicionar logo
        if (tema.logo_url && !document.querySelector('header img[alt="Logo"]')) {
            const header = document.querySelector('header .container');
            if (header) {
                const logo = document.createElement('img');
                logo.src = tema.logo_url;
                logo.alt = 'Logo';
                logo.style.height = '60px';
                logo.style.marginRight = '1rem';
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
