// Script para testar configuração de email
// Uso: node test-email.js seu_email@gmail.com

require('dotenv').config();
const nodemailer = require('nodemailer');

const emailDestino = process.argv[2];

if (!emailDestino) {
    console.error('❌ Erro: Forneça um email de destino');
    console.log('Uso: node test-email.js seu_email@gmail.com');
    process.exit(1);
}

console.log('🔧 Testando configuração de email...\n');

// Verificar variáveis de ambiente
console.log('📋 Variáveis de ambiente:');
console.log('  EMAIL_HOST:', process.env.EMAIL_HOST || '❌ NÃO DEFINIDO');
console.log('  EMAIL_PORT:', process.env.EMAIL_PORT || '❌ NÃO DEFINIDO');
console.log('  EMAIL_USER:', process.env.EMAIL_USER || '❌ NÃO DEFINIDO');
console.log('  EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ DEFINIDO' : '❌ NÃO DEFINIDO');
console.log('  EMAIL_FROM:', process.env.EMAIL_FROM || '❌ NÃO DEFINIDO');
console.log('');

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('❌ Erro: EMAIL_USER e EMAIL_PASSWORD devem estar definidos no .env');
    console.log('\nConfigure o arquivo .env com:');
    console.log('EMAIL_HOST=smtp.gmail.com');
    console.log('EMAIL_PORT=587');
    console.log('EMAIL_USER=seu_email@gmail.com');
    console.log('EMAIL_PASSWORD=sua_senha_app_16_caracteres');
    console.log('EMAIL_FROM=Precompeonato <noreply@precompeonato.com.br>');
    process.exit(1);
}

// Criar transporte
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

console.log('📧 Enviando email de teste...');
console.log('  De:', process.env.EMAIL_FROM || process.env.EMAIL_USER);
console.log('  Para:', emailDestino);
console.log('');

// Enviar email de teste
transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: emailDestino,
    subject: 'Teste de Email - Precompeonato',
    html: `
        <h2>✅ Email Configurado com Sucesso!</h2>
        <p>Este é um email de teste do sistema Precompeonato.</p>
        <p>Se você recebeu este email, significa que a configuração está funcionando corretamente.</p>
        <hr>
        <p style="font-size: 12px; color: #666;">
            Enviado em: ${new Date().toLocaleString('pt-BR')}<br>
            Servidor: ${process.env.EMAIL_HOST}<br>
            Porta: ${process.env.EMAIL_PORT}
        </p>
    `
})
.then(info => {
    console.log('✅ Email enviado com sucesso!');
    console.log('  Message ID:', info.messageId);
    console.log('  Response:', info.response);
    console.log('');
    console.log('🎉 Configuração de email está funcionando!');
    console.log('Verifique a caixa de entrada (e spam) de:', emailDestino);
    process.exit(0);
})
.catch(error => {
    console.error('❌ Erro ao enviar email:');
    console.error('  Código:', error.code);
    console.error('  Mensagem:', error.message);
    console.error('');
    
    if (error.code === 'EAUTH') {
        console.log('💡 Dica: Erro de autenticação');
        console.log('  - Verifique se EMAIL_USER e EMAIL_PASSWORD estão corretos');
        console.log('  - Se usar Gmail, certifique-se de usar uma "Senha de App"');
        console.log('  - Ative a verificação em 2 etapas no Gmail');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
        console.log('💡 Dica: Erro de conexão');
        console.log('  - Verifique se a porta 587 está aberta');
        console.log('  - Verifique sua conexão com a internet');
        console.log('  - Tente usar porta 465 com secure: true');
    }
    
    process.exit(1);
});
