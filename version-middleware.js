const fs = require('fs');
const path = require('path');

// Carregar versões dos arquivos
let versions = {};
try {
    versions = JSON.parse(fs.readFileSync('versions.json', 'utf8'));
} catch (error) {
    console.warn('⚠️  versions.json não encontrado. Execute: node auto-version.js');
}

// Middleware para injetar versões nos arquivos HTML
function versionMiddleware(req, res, next) {
    // Apenas para arquivos HTML
    if (!req.path.endsWith('.html') && req.path !== '/') {
        return next();
    }

    // Capturar o método send original
    const originalSend = res.send;
    
    res.send = function(data) {
        // Se for HTML, injetar versões
        if (typeof data === 'string' && data.includes('</html>')) {
            // Substituir referências a arquivos JS/CSS com versões
            Object.entries(versions).forEach(([file, hash]) => {
                // Remover versões antigas primeiro
                const fileWithoutExt = file.replace(/\.(js|css)$/, '');
                const ext = path.extname(file);
                
                // Regex para encontrar o arquivo com ou sem versão
                const regex = new RegExp(
                    `(src|href)=["']${file.replace('.', '\\.')}(\\?v=[^"']*)?["']`,
                    'g'
                );
                
                // Substituir com nova versão
                const attr = ext === '.css' ? 'href' : 'src';
                data = data.replace(regex, `${attr}="${file}?v=${hash}"`);
            });
        }
        
        // Chamar o send original
        originalSend.call(this, data);
    };
    
    next();
}

// Função para recarregar versões (útil em desenvolvimento)
function reloadVersions() {
    try {
        delete require.cache[require.resolve('./versions.json')];
        versions = JSON.parse(fs.readFileSync('versions.json', 'utf8'));
        console.log('✓ Versões recarregadas');
        return true;
    } catch (error) {
        console.error('✗ Erro ao recarregar versões:', error.message);
        return false;
    }
}

module.exports = { versionMiddleware, reloadVersions, versions };
