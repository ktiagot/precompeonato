require('dotenv').config();
const mysql = require('mysql2/promise');

async function testQuery() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    console.log('Conectado ao MySQL');
    console.log('Testando query com MAX()...\n');

    try {
        const [result] = await connection.query(`
            SELECT 
                MAX(p.nome) as deck,
                MAX(p.comandante) as comandante,
                MAX(p.set_nome) as set_nome,
                COUNT(i.id) as uso
            FROM precons p
            LEFT JOIN inscricoes i ON p.id = i.deck_id AND i.ativo = TRUE
            GROUP BY p.id
            HAVING uso > 0
            ORDER BY uso DESC
            LIMIT 5
        `);
        
        console.log('✅ Query executada com sucesso!');
        console.log('Resultados:', result.length);
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ Erro na query:');
        console.error('Mensagem:', error.message);
        console.error('Código:', error.code);
        console.error('SQL State:', error.sqlState);
    }

    await connection.end();
}

testQuery();
