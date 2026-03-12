const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Gerar hash baseado no conteúdo do arquivo
function getFileHash(filePath) {
    try {
        const content = fs.readFileSync(filePath);
        return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
    } catch (error) {
        return Date.now().toString(36);
    }
}

// Mapa de versões dos arquivos
const versions = {};

// Arquivos para monitorar
const filesToVersion = [
    'app.js',
    'admin.js',
    'login.js',
    'ranking.js',
    'estatisticas.js',
    'perfil.js',
    'mesas-casuais.js',
    'pareamento.js',
    'scryfall-helper.js',
    'tema.js',
    'styles.css'
];

// Gerar versões
filesToVersion.forEach(file => {
    versions[file] = getFileHash(file);
});

// Salvar versões em arquivo JSON
fs.writeFileSync('versions.json', JSON.stringify(versions, null, 2));

console.log('✓ Versões geradas:');
Object.entries(versions).forEach(([file, hash]) => {
    console.log(`  ${file}: ${hash}`);
});

module.exports = versions;
