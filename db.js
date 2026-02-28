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

// Wrapper para logar todas as queries
const originalQuery = pool.query.bind(pool);
pool.query = async function(...args) {
    const sql = args[0];
    const params = args[1];
    
    console.log('📊 SQL Query:', sql.substring(0, 100) + (sql.length > 100 ? '...' : ''));
    if (params) console.log('   Params:', params);
    
    try {
        const result = await originalQuery(...args);
        console.log('   ✅ Success - Rows:', result[0]?.length || 'N/A');
        return result;
    } catch (error) {
        console.error('   ❌ SQL Error:');
        console.error('      Message:', error.message);
        console.error('      Code:', error.code);
        console.error('      SQL State:', error.sqlState);
        throw error;
    }
};

console.log('⚠️  Pool de conexões criado (conexão será testada sob demanda)');

module.exports = pool;
