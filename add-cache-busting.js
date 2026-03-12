const fs = require('fs');
const path = require('path');

const VERSION = '1.0.3';

const htmlFiles = [
    'index.html',
    'inscricao.html',
    'rodadas.html',
    'mesas-casuais.html',
    'ranking.html',
    'estatisticas.html',
    'regras.html',
    'perfil.html',
    'admin.html',
    'login.html'
];

const metaTags = `    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">`;

htmlFiles.forEach(file => {
    try {
        let content = fs.readFileSync(file, 'utf8');
        
        // Adicionar meta tags se não existirem
        if (!content.includes('Cache-Control')) {
            content = content.replace(
                /<meta name="viewport"[^>]*>/,
                `$&\n${metaTags}`
            );
        }
        
        // Adicionar versão nos arquivos CSS
        content = content.replace(
            /href="([^"]+\.css)"/g,
            `href="$1?v=${VERSION}"`
        );
        
        // Adicionar versão nos arquivos JS
        content = content.replace(
            /src="([^"]+\.js)"/g,
            (match, p1) => {
                // Não adicionar versão se já tiver
                if (p1.includes('?v=')) return match;
                return `src="${p1}?v=${VERSION}"`;
            }
        );
        
        fs.writeFileSync(file, content, 'utf8');
        console.log(`✓ ${file} atualizado`);
    } catch (error) {
        console.error(`✗ Erro ao processar ${file}:`, error.message);
    }
});

console.log(`\n✓ Cache busting aplicado! Versão: ${VERSION}`);
console.log('\nPara atualizar a versão no futuro:');
console.log('1. Edite a constante VERSION neste arquivo');
console.log('2. Execute: node add-cache-busting.js');
