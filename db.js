// Variáveis de ambiente já carregadas pelo server.js
const mysql = require('mysql2/promise');

console.log('🔌 Configurando conexão com banco de dados...');
console.log('  - Host:', process.env.DB_HOST);
console.log('  - User:', process.env.DB_USER);
console.log('  - Database:', process.env.DB_NAME);
console.log('  - Port:', process.env.DB_PORT);

const pool = mysql.createPool({
    host: process.env.DB_HOST === 'localhost' ? '127.0.0.1' : process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    socketPath: undefined // Força TCP/IP ao invés de socket Unix
});

console.log('⚠️  Pool de conexões criado (conexão será testada sob demanda)');

module.exports = pool;
