const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Servidor funcionando!');
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        port: PORT,
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor teste rodando na porta ${PORT}`);
});
