require('dotenv').config();
const mysql = require('mysql2/promise');

console.log('🔌 Configurando conexão com banco de dados...');
console.log('  - Host:', process.env.DB_HOST);
console.log('  - User:', process.env.DB_USER);
console.log('  - Database:', process.env.DB_NAME);
console.log('  - Port:', process.env.DB_PORT);

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Não testar conexão na inicialização para não crashar
console.log('⚠️  Pool de conexões criado (conexão será testada sob demanda)');

module.exports = pool;
