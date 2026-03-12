#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Iniciando processo de deploy...\n');

// 1. Gerar versões automáticas
console.log('📦 Gerando versões dos arquivos...');
try {
    execSync('node auto-version.js', { stdio: 'inherit' });
} catch (error) {
    console.error('❌ Erro ao gerar versões');
    process.exit(1);
}

// 2. Atualizar versão no cache-notice.js
console.log('\n🔄 Atualizando cache-notice.js...');
try {
    const versions = JSON.parse(fs.readFileSync('versions.json', 'utf8'));
    const timestamp = Date.now().toString(36);
    
    let cacheNotice = fs.readFileSync('cache-notice.js', 'utf8');
    cacheNotice = cacheNotice.replace(
        /const CURRENT_VERSION = '[^']+'/,
        `const CURRENT_VERSION = '${timestamp}'`
    );
    fs.writeFileSync('cache-notice.js', cacheNotice);
    console.log(`✓ Versão atualizada para: ${timestamp}`);
} catch (error) {
    console.error('⚠️  Aviso: Não foi possível atualizar cache-notice.js');
}

// 3. Informações finais
console.log('\n✅ Deploy preparado com sucesso!');
console.log('\n📋 Próximos passos:');
console.log('   1. Commit das mudanças: git add . && git commit -m "Deploy vX.X.X"');
console.log('   2. Push para repositório: git push');
console.log('   3. Reiniciar servidor: pm2 restart precompeonato');
console.log('\n💡 Dica: As versões são geradas automaticamente baseadas no conteúdo dos arquivos');
