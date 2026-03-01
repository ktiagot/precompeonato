// Carregar e aplicar tema do campeonato ativo
(async function() {
    const TEMA_API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api' 
        : '/api';

    // Aplicar tema imediatamente de forma síncrona
    try {
        console.log('🎨 Carregando tema do campeonato...');
        const response = await fetch(`${TEMA_API_URL}/tema`);
        
        if (!response.ok) {
            console.error('❌ Erro ao buscar tema:', response.status);
            return;
        }
        
        const tema = await response.json();
        console.log('✅ Tema recebido:', tema);
        
        // Aplicar cores CSS
        if (tema.cor_primaria) {
            document.documentElement.style.setProperty('--primary', tema.cor_primaria);
            document.documentElement.style.setProperty('--primary-dark', ajustarCor(tema.cor_primaria, -20));
            console.log('  - Cor primária aplicada:', tema.cor_primaria);
        }
        if (tema.cor_secundaria) {
            document.documentElement.style.setProperty('--secondary', tema.cor_secundaria);
            console.log('  - Cor secundária aplicada:', tema.cor_secundaria);
        }
        if (tema.cor_destaque) {
            document.documentElement.style.setProperty('--accent', tema.cor_destaque);
            console.log('  - Cor destaque aplicada:', tema.cor_destaque);
        }
        
        // Atualizar título se houver
        const titleElement = document.querySelector('header h1');
        if (titleElement && tema.nome) {
            titleElement.textContent = `${tema.nome}${tema.edicao ? ' - ' + tema.edicao : ''}`;
            console.log('  - Título atualizado:', titleElement.textContent);
        }
        
        // Adicionar logo se houver
        if (tema.logo_url) {
            const header = document.querySelector('header .container');
            if (header) {
                const logo = document.createElement('img');
                logo.src = tema.logo_url;
                logo.alt = 'Logo';
                logo.style.height = '60px';
                logo.style.marginRight = '1rem';
                header.prepend(logo);
                console.log('  - Logo adicionada:', tema.logo_url);
            }
        }
        
        console.log('✅ Tema aplicado com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao carregar tema:', error);
    }
    
    // Função auxiliar para ajustar cor (escurecer/clarear)
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
})();
