const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.json({
        allEnvVars: Object.keys(process.env).sort(),
        dbVars: {
            DB_HOST: process.env.DB_HOST || 'NOT SET',
            DB_USER: process.env.DB_USER || 'NOT SET',
            DB_NAME: process.env.DB_NAME || 'NOT SET',
            DB_PORT: process.env.DB_PORT || 'NOT SET',
            DB_PASSWORD: process.env.DB_PASSWORD ? '***SET***' : 'NOT SET',
            NODE_ENV: process.env.NODE_ENV || 'NOT SET',
            PORT: process.env.PORT || 'NOT SET'
        }
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Check env rodando na porta ${PORT}`);
});
