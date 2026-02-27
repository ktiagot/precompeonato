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
    queueLimit: 0,
    // Forçar IPv4
    family: 4
});

// Testar conexão
pool.getConnection()
    .then(connection => {
        console.log('✅ Conexão com banco de dados estabelecida!');
        connection.release();
    })
    .catch(error => {
        console.error('❌ Erro ao conectar no banco:', error.message);
        console.error('   Code:', error.code);
    });

module.exports = pool;
