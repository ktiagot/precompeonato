// Carregar e aplicar tema do campeonato ativo
(function() {
    const TEMA_API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api' 
        : '/api';

    async function carregarTema() {
        try {
            const response = await fetch(`${TEMA_API_URL}/tema`);
            const tema = await response.json();
            
            // Aplicar cores CSS
            document.documentElement.style.setProperty('--primary', tema.cor_primaria);
            document.documentElement.style.setProperty('--secondary', tema.cor_secundaria);
            document.documentElement.style.setProperty('--accent', tema.cor_destaque);
            
            // Atualizar título se houver
            const titleElement = document.querySelector('header h1');
            if (titleElement && tema.nome) {
                titleElement.textContent = `${tema.nome}${tema.edicao ? ' - ' + tema.edicao : ''}`;
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
                }
            }
        } catch (error) {
            console.error('Erro ao carregar tema:', error);
            // Usar tema padrão em caso de erro
        }
    }

    // Carregar tema quando a página carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', carregarTema);
    } else {
        carregarTema();
    }
})();
