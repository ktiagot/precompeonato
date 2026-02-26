require('dotenv').config();
const mysql = require('mysql2/promise');

async function setupDatabase() {
    try {
        // Conectar sem especificar database
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT
        });

        console.log('Conectado ao MySQL');

        // Criar database se não existir
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        console.log(`Database ${process.env.DB_NAME} criado/verificado`);

        await connection.query(`USE ${process.env.DB_NAME}`);

        // Tabela de campeonatos
        await connection.query(`
            CREATE TABLE IF NOT EXISTS campeonatos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                edicao VARCHAR(100),
                data_inicio DATE NOT NULL,
                data_fim DATE,
                status ENUM('inscricoes', 'em_andamento', 'finalizado') DEFAULT 'inscricoes',
                descricao TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Tabela campeonatos criada');

        // Tabela de precons
        await connection.query(`
            CREATE TABLE IF NOT EXISTS precons (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                set_nome VARCHAR(255) NOT NULL,
                comandante VARCHAR(255) NOT NULL,
                cores VARCHAR(50),
                ano INT,
                banido BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Tabela precons criada');

        // Tabela de emails permitidos
        await connection.query(`
            CREATE TABLE IF NOT EXISTS emails_permitidos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                ativo BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Tabela emails_permitidos criada');

        // Tabela de inscrições
        await connection.query(`
            CREATE TABLE IF NOT EXISTS inscricoes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                campeonato_id INT NOT NULL,
                nome VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                deck_id INT,
                deck_nome VARCHAR(255),
                pontos INT DEFAULT 0,
                vitorias INT DEFAULT 0,
                segundos_lugares INT DEFAULT 0,
                ativo BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (campeonato_id) REFERENCES campeonatos(id),
                FOREIGN KEY (deck_id) REFERENCES precons(id),
                UNIQUE KEY unique_email_campeonato (email, campeonato_id)
            )
        `);
        console.log('Tabela inscricoes criada');

        // Tabela de rodadas
        await connection.query(`
            CREATE TABLE IF NOT EXISTS rodadas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                campeonato_id INT NOT NULL,
                numero INT NOT NULL,
                data_rodada DATE NOT NULL,
                status ENUM('agendada', 'em_andamento', 'finalizada') DEFAULT 'agendada',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (campeonato_id) REFERENCES campeonatos(id) ON DELETE CASCADE
            )
        `);
        console.log('Tabela rodadas criada');

        // Tabela de mesas
        await connection.query(`
            CREATE TABLE IF NOT EXISTS mesas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                rodada_id INT NOT NULL,
                numero_mesa INT NOT NULL,
                vencedor_id INT,
                segundo_id INT,
                finalizada BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (rodada_id) REFERENCES rodadas(id) ON DELETE CASCADE,
                FOREIGN KEY (vencedor_id) REFERENCES inscricoes(id),
                FOREIGN KEY (segundo_id) REFERENCES inscricoes(id)
            )
        `);
        console.log('Tabela mesas criada');

        // Tabela de jogadores por mesa
        await connection.query(`
            CREATE TABLE IF NOT EXISTS mesa_jogadores (
                id INT AUTO_INCREMENT PRIMARY KEY,
                mesa_id INT NOT NULL,
                inscricao_id INT NOT NULL,
                posicao INT,
                eliminado BOOLEAN DEFAULT FALSE,
                posicao_final INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (mesa_id) REFERENCES mesas(id) ON DELETE CASCADE,
                FOREIGN KEY (inscricao_id) REFERENCES inscricoes(id)
            )
        `);
        console.log('Tabela mesa_jogadores criada');

        // Tabela de histórico de partidas (para estatísticas detalhadas)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS historico_partidas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                mesa_id INT NOT NULL,
                campeonato_id INT NOT NULL,
                jogador_id INT NOT NULL,
                deck_id INT NOT NULL,
                posicao_final INT NOT NULL,
                pontos_ganhos INT DEFAULT 0,
                oponente1_id INT,
                oponente1_deck_id INT,
                oponente2_id INT,
                oponente2_deck_id INT,
                oponente3_id INT,
                oponente3_deck_id INT,
                data_partida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (mesa_id) REFERENCES mesas(id) ON DELETE CASCADE,
                FOREIGN KEY (campeonato_id) REFERENCES campeonatos(id),
                FOREIGN KEY (jogador_id) REFERENCES inscricoes(id),
                FOREIGN KEY (deck_id) REFERENCES precons(id),
                FOREIGN KEY (oponente1_id) REFERENCES inscricoes(id),
                FOREIGN KEY (oponente1_deck_id) REFERENCES precons(id),
                FOREIGN KEY (oponente2_id) REFERENCES inscricoes(id),
                FOREIGN KEY (oponente2_deck_id) REFERENCES precons(id),
                FOREIGN KEY (oponente3_id) REFERENCES inscricoes(id),
                FOREIGN KEY (oponente3_deck_id) REFERENCES precons(id)
            )
        `);
        console.log('Tabela historico_partidas criada');

        // Inserir campeonato de exemplo
        await connection.query(`
            INSERT IGNORE INTO campeonatos (id, nome, edicao, data_inicio, status) VALUES
            (1, 'Precompeonato Cowabunga', 'Etapa #1 2026 - Citadel Edition', '2026-03-11', 'inscricoes')
        `);
        console.log('Campeonato de exemplo inserido');

        // Inserir alguns precons de exemplo
        await connection.query(`
            INSERT IGNORE INTO precons (nome, set_nome, comandante, cores, ano) VALUES
            ('Draconic Dissent', 'Commander 2021', 'Vrondiss, Rage of Ancients', 'RG', 2021),
            ('Elven Empire', 'Commander 2021', 'Lathril, Blade of the Elves', 'BG', 2021),
            ('Quantum Quandrix', 'Strixhaven', 'Adrix and Nev, Twincasters', 'GU', 2021)
        `);
        console.log('Precons de exemplo inseridos');

        // Inserir emails de exemplo
        await connection.query(`
            INSERT IGNORE INTO emails_permitidos (email) VALUES
            ('exemplo1@email.com'),
            ('exemplo2@email.com'),
            ('exemplo3@email.com')
        `);
        console.log('Emails de exemplo inseridos');

        await connection.end();
        console.log('\n✅ Database configurado com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao configurar database:', error);
        process.exit(1);
    }
}

setupDatabase();
