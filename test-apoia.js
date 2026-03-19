// Teste da integração com API APOIA.se
require('dotenv').config();
const { verificarApoiador } = require('./apoia-helper');

async function testar(email) {
    console.log(`\n🔍 Testando email: ${email}`);
    
    const resultado = await verificarApoiador(email);
    
    console.log(`\n📋 Resultado:`);
    console.log(`   Válido: ${resultado.valido ? '✅ SIM' : '❌ NÃO'}`);
    if (resultado.dados) {
        console.log(`   isBacker: ${resultado.dados.isBacker}`);
        console.log(`   isPaidThisMonth: ${resultado.dados.isPaidThisMonth}`);
    }
    if (resultado.erro) {
        console.log(`   Erro: ${resultado.erro}`);
    }
}

const emailTeste = process.argv[2] || 'teste@outlook.com';
testar(emailTeste);
