require('dotenv').config();
const { Pool } = require('pg');

// 📡 Configuración de la base de datos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    ssl: { rejectUnauthorized: false }, // 🔒 Forzar conexión SSL
});


// 🎯 Manejo de errores en conexiones inactivas
pool.on('error', (err, client) => {
    console.error('❌ Error inesperado en idle client:', err.message, err.stack);
});

// 📌 Función para probar la conexión
const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Conexión exitosa a PostgreSQL');
        client.release(); // 🟢 Liberar conexión después de la prueba
    } catch (error) {
        console.error('❌ Error conectando a PostgreSQL:', error.message);
    }
};

testConnection(); // 🔧 Ejecuta la prueba al iniciar el servidor

module.exports = pool;
