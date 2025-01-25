const express = require('express');
const { Pool } = require('pg');

const router = express.Router();

// Configuración del cliente de PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // URL de conexión
    ssl: {
        rejectUnauthorized: false, // Cambiar según configuración local o producción
    },
});

// Ruta principal de inserción de ventas por familia
router.post('/', async (req, res) => {
    const { ruta, cod_fam, descripcion, venta, coberturas, fecha } = req.body;

    // Validación de datos
    if (!ruta || !cod_fam || !descripcion || !venta || !coberturas || !fecha) {
        return res.status(400).send({ error: 'Todos los campos son obligatorios.' });
    }

    try {
        // Query de inserción
        const query = `
            INSERT INTO ventaxfamilia (ruta, cod_fam, descripcion, venta, coberturas, fecha)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const values = [ruta, cod_fam, descripcion, venta, coberturas, fecha];

        // Ejecución del query
        const result = await pool.query(query, values);
        res.status(201).send({
            message: 'Datos insertados exitosamente.',
            data: result.rows[0],
        });
    } catch (err) {
        console.error('Error al insertar datos:', err);
        res.status(500).send({ error: 'Error interno del servidor.' });
    }
});

module.exports = router;
