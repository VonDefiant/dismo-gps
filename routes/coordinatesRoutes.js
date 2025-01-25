const express = require('express');
const router = express.Router();
const pool = require('../db');

// Ruta para insertar nuevas coordenadas
router.post('/', async (req, res) => {
    const { latitude, longitude, timestamp, isSuspicious, id_ruta, battery } = req.body;
    if (!latitude || !longitude || !timestamp || !id_ruta || !battery) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO coordinates (latitude, longitude, timestamp, vpn_validation, id_ruta, battery) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [latitude, longitude, timestamp, isSuspicious, id_ruta, battery]
        );
        res.status(201).json({
            success: true,
            message: 'Coordenadas guardadas exitosamente',
            data: result.rows[0],
        });
    } catch (err) {
        console.error('Error al guardar las coordenadas:', err.message);
        res.status(500).json({ error: 'Error al guardar las coordenadas' });
    }
});

// Ruta para obtener las últimas coordenadas por id_ruta
router.get('/latest-coordinates', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, latitude, longitude, id_ruta, timestamp, vpn_validation, battery 
            FROM coordinates
            WHERE (id_ruta, timestamp) IN (
                SELECT id_ruta, MAX(timestamp)
                FROM coordinates
                GROUP BY id_ruta
            );
        `);
        res.json({
            success: true,
            message: 'Últimas coordenadas obtenidas exitosamente',
            data: result.rows,
        });
    } catch (err) {
        console.error('Error al obtener las últimas coordenadas:', err.message);
        res.status(500).json({ error: 'Error al obtener las coordenadas' });
    }
});

// Ruta para obtener los id_ruta únicos
router.get('/getUniqueRutas', async (req, res) => {
    try {
        const result = await pool.query('SELECT DISTINCT id_ruta FROM coordinates');
        res.json({
            success: true,
            message: 'Rutas únicas obtenidas exitosamente',
            data: result.rows.map(row => row.id_ruta),
        });
    } catch (err) {
        console.error('Error al obtener los id_ruta únicos:', err.message);
        res.status(500).json({ error: 'Error al obtener las rutas' });
    }
});

// Ruta para reconstruir el recorrido según id_ruta y fecha
router.get('/reconstruirRecorrido', async (req, res) => {
    const { id_ruta, fecha } = req.query;
    if (!id_ruta || !fecha) {
        return res.status(400).json({ error: 'id_ruta y fecha son obligatorios' });
    }

    try {
        const result = await pool.query(`
            SELECT latitude, longitude, timestamp, vpn_validation, id_ruta, battery
            FROM coordinates    
            WHERE id_ruta = $1 AND DATE(timestamp) = $2::date
        `, [id_ruta, fecha]);
        res.json({
            success: true,
            message: 'Recorrido reconstruido exitosamente',
            data: result.rows,
        });
    } catch (err) {
        console.error('Error al reconstruir el recorrido:', err.message);
        res.status(500).json({ error: 'Error al reconstruir el recorrido' });
    }
});

// Ruta para obtener todas las últimas coordenadas
router.get('/all-latest', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, latitude, longitude, id_ruta, timestamp, vpn_validation, battery 
            FROM coordinates
            WHERE (id_ruta, timestamp) IN (
                SELECT id_ruta, MAX(timestamp)
                FROM coordinates
                GROUP BY id_ruta
            );
        `);
        res.json({
            success: true,
            message: 'Últimas coordenadas obtenidas exitosamente',
            data: result.rows,
        });
    } catch (err) {
        console.error('Error al obtener las coordenadas:', err.message);
        res.status(500).json({ error: 'Error al obtener las coordenadas' });
    }
});

// Ruta de prueba
router.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Atlas sabe dónde estás!',
    });
});

module.exports = router;
