// Script de teste para verificar se as tabelas de mesas casuais existem
require('dotenv').config();
const db = require('./db');

async function testarTabelas() {
    try {
        console.log('🔍 Verificando tabelas de mesas casuais...\n');
        
        // Verificar tabela mesas_casuais
        console.log('1. Verificando tabela mesas_casuais...');
        const [mesas] = await db.query('SHOW TABLES LIKE "mesas_casuais"');
        if (mesas.length > 0) {
            console.log('   ✅ Tabela mesas_casuais existe');
            
            // Mostrar estrutura
            const [colunas] = await db.query('DESCRIBE mesas_casuais');
            console.log('   Colunas:', colunas.map(c => c.Field).join(', '));
        } else {
            console.log('   ❌ Tabela mesas_casuais NÃO existe');
            console.log('   Execute: mysql -u u394631272_management -p u394631272_precompeonato < data/adicionar-mesas-casuais.sql');
        }
        
        // Verificar tabela mesa_casual_jogadores
        console.log('\n2. Verificando tabela mesa_casual_jogadores...');
        const [jogadores] = await db.query('SHOW TABLES LIKE "mesa_casual_jogadores"');
        if (jogadores.length > 0) {
            console.log('   ✅ Tabela mesa_casual_jogadores existe');
            
            // Mostrar estrutura
            const [colunas] = await db.query('DESCRIBE mesa_casual_jogadores');
            console.log('   Colunas:', colunas.map(c => c.Field).join(', '));
        } else {
            console.log('   ❌ Tabela mesa_casual_jogadores NÃO existe');
        }
        
        // Verificar tabela perfis_usuarios
        console.log('\n3. Verificando tabela perfis_usuarios...');
        const [perfis] = await db.query('SHOW TABLES LIKE "perfis_usuarios"');
        if (perfis.length > 0) {
            console.log('   ✅ Tabela perfis_usuarios existe');
            
            // Mostrar estrutura
            const [colunas] = await db.query('DESCRIBE perfis_usuarios');
            console.log('   Colunas:', colunas.map(c => c.Field).join(', '));
        } else {
            console.log('   ❌ Tabela perfis_usuarios NÃO existe');
        }
        
        console.log('\n✅ Verificação concluída!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Erro ao verificar tabelas:', error.message);
        process.exit(1);
    }
}

testarTabelas();
