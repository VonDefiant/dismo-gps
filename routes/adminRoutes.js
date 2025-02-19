// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener dispositivos autorizados
router.get('/dispositivos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM dispositivos_autorizados');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener dispositivos' });
    }
});

// Agregar nuevo dispositivo
router.post('/dispositivos', async (req, res) => {
    const { ruta, imei } = req.body;
    try {
        await pool.query(
            'INSERT INTO dispositivos_autorizados (ruta, imei) VALUES ($1, $2)',
            [ruta, imei]
        );
        res.status(201).json({ message: 'Dispositivo añadido' });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar dispositivo' });
    }
});

// Obtener logs de acceso
router.get('/logs', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM logs_acceso ORDER BY fecha DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener logs' });
    }
});

module.exports = router;