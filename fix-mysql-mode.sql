-- Desabilitar ONLY_FULL_GROUP_BY no MySQL
-- Execute este arquivo no MySQL para corrigir os erros de GROUP BY

-- Ver o modo atual
SELECT @@sql_mode;

-- Desabilitar ONLY_FULL_GROUP_BY permanentemente
SET GLOBAL sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''));

-- Verificar se funcionou
SELECT @@sql_mode;

-- Para tornar permanente, adicione no arquivo /etc/mysql/mysql.conf.d/mysqld.cnf:
-- [mysqld]
-- sql_mode=STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION
