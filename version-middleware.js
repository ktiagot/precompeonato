const fs = require('fs');
const path = require('path');

// Carregar versões dos arquivos
let versions = {};
function loadVersions() {
    try {
        delete require.cache[require.resolve('./versions.json')];
        versions = JSON.parse(fs.readFileSync('versions.json', 'utf8'));
    } catch (error) {
        console.warn('⚠️  versions.json não encontrado. Execute: node auto-version.js');
    }
}
loadVersions();

// Middleware que intercepta HTMLs ANTES do express.static
// Lê o arquivo do disco, injeta versões, e envia direto
function versionMiddleware(req, res, next) {
    // Determinar qual arquivo HTML servir
    let filePath = null;
    
    if (req.path === '/') {
        filePath = path.join(__dirname, 'index.html');
    } else if (req.path.endsWith('.html')) {
        filePath = path.join(__dirname, req.path);
    }
    
    if (!filePath) {
        return next();
    }
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(filePath)) {
        return next();
    }
    
    try {
        let html = fs.readFileSync(filePath, 'utf8');
        
        // Injetar versões em todas as referências JS/CSS
        Object.entries(versions).forEach(([file, hash]) => {
            // Regex para encontrar o arquivo com ou sem versão existente
            const escapedFile = file.replace(/\./g, '\\.');
            const regex = new RegExp(
                `((?:src|href)=["'])${escapedFile}(\\?v=[^"']*)?(['"])`,
                'g'
            );
            html = html.replace(regex, `$1${file}?v=${hash}$3`);
        });
        
        // Headers anti-cache
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
        res.setHeader('ETag', Object.values(versions).join('').substring(0, 16));
        res.send(html);
    } catch (error) {
        console.error('Erro ao processar HTML:', error.message);
        next();
    }
}

// Recarregar versões
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
