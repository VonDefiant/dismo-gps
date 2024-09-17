const { Pool } = require('pg');

const pool = new Pool({
    host: "c3nv2ev86aje4j.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com",
    port: "5432",
    user: "u5ovn3ujvtt1fm",
    password: "pe1d39b827668ebb484323eaa93a3be4f1ad7fa6e0c86d6e07bd6d569f0d4f471",
    database: "dfq91ujpj6kjv7",
    ssl: {
        rejectUnauthorized: false,
    },
});

pool.on('error', (err, client) => {
    console.error('Error inesperado en idle client', err.message, err.stack);
});

module.exports = pool;
