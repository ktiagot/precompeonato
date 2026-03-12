// Sistema de notificação de atualização
(function() {
    const CURRENT_VERSION = 'mmnotpjn';
    const VERSION_KEY = 'site_version';
    
    // Verificar versão armazenada
    const storedVersion = localStorage.getItem(VERSION_KEY);
    
    if (storedVersion !== CURRENT_VERSION) {
        // Nova versão detectada - mostrar aviso
        showUpdateNotice();
        // Atualizar versão armazenada
        localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    }
    
    function showUpdateNotice() {
        // Criar banner de atualização
        const banner = document.createElement('div');
        banner.id = 'update-notice';
        banner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem;
            text-align: center;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;
        
        banner.innerHTML = `
            <div style="max-width: 800px; margin: 0 auto;">
                <strong style="font-size: 1.1rem;">🎉 Site Atualizado!</strong>
                <p style="margin: 0.5rem 0; font-size: 0.95rem;">
                    Nova versão disponível. Para ver todas as atualizações, pressione <strong>Ctrl + F5</strong> (Windows) ou <strong>Cmd + Shift + R</strong> (Mac)
                </p>
                <button onclick="document.getElementById('update-notice').remove()" 
                        style="background: white; color: #667eea; border: none; padding: 0.5rem 1.5rem; 
                               border-radius: 0.25rem; cursor: pointer; font-weight: 600; margin-top: 0.5rem;">
                    Entendi
                </button>
            </div>
        `;
        
        // Adicionar ao body quando carregar
        if (document.body) {
            document.body.insertBefore(banner, document.body.firstChild);
            // Ajustar padding do body para não cobrir conteúdo
            document.body.style.paddingTop = '120px';
        } else {
            window.addEventListener('DOMContentLoaded', () => {
                document.body.insertBefore(banner, document.body.firstChild);
                document.body.style.paddingTop = '120px';
            });
        }
        
        // Remover automaticamente após 15 segundos
        setTimeout(() => {
            const notice = document.getElementById('update-notice');
            if (notice) {
                notice.style.transition = 'opacity 0.5s';
                notice.style.opacity = '0';
                setTimeout(() => {
                    notice.remove();
                    document.body.style.paddingTop = '';
                }, 500);
            }
        }, 15000);
    }
})();
