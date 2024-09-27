const express = require('express');
const router = express.Router();
const pool = require('../db'); // Asegúrate de que el pool está configurado correctamente en db.js

// Ruta para insertar nuevas coordenadas
router.post('/', async (req, res) => {
    const { latitude, longitude, timestamp, isSuspicious, id_ruta } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO coordinates (latitude, longitude, timestamp, vpn_validation, id_ruta) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [latitude, longitude, timestamp, isSuspicious, id_ruta]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al guardar las coordenadas');
    }   
});


// Ruta para obtener las últimas coordenadas
router.get('/latest-coordinates', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, latitude, longitude, id_ruta, timestamp, vpn_validation FROM coordinates
            WHERE (id_ruta, timestamp) IN (
                SELECT id_ruta, MAX(timestamp)
                FROM coordinates
                GROUP BY id_ruta
            );
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener las coordenadas:', err);
        res.status(500).send('Error al obtener las coordenadas');
    }
});

// Ruta GET para pruebas
router.get('/', (req, res) => {
    res.status(200).send('GET request to the coordinates route is working!');
});

module.exports = router;
