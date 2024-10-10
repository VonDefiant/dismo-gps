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

// Ruta GET para obtener los id_ruta únicos
router.get('/getUniqueRutas', async (req, res) => {
    try {
        const result = await pool.query("SELECT DISTINCT id_ruta FROM coordinates");
        const rutas = result.rows.map(row => row.id_ruta);
        res.json(rutas);
    } catch (err) {
        console.error('Error al obtener los id_ruta:', err);
        res.status(500).send('Error al obtener las rutas');
    }
});

// Ruta GET para reconstruir el recorrido según id_ruta y fecha
router.get('/reconstruirRecorrido', async (req, res) => {
    const { id_ruta, fecha } = req.query;

    console.log(`Consulta recibida para id_ruta: ${id_ruta} y fecha: ${fecha}`); // Para depurar

    try {
        // Convertir timestamp a la zona horaria local para comparar solo la fecha
        const result = await pool.query(`
            SELECT latitude, longitude, timestamp, vpn_validation, id_ruta 
            FROM coordinates 
            WHERE id_ruta = $1 AND DATE(timestamp AT TIME ZONE 'UTC') = $2::date
        `, [id_ruta, fecha]);

        console.log(`Resultado de la consulta: ${JSON.stringify(result.rows)}`); // Para ver el resultado

        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener las coordenadas:', err);
        res.status(500).send('Error al obtener las coordenadas');
    }
});



// Ruta GET para pruebas
router.get('/', (req, res) => {
    res.status(200).send('Atlas sabe donde estas!');
});

module.exports = router;
