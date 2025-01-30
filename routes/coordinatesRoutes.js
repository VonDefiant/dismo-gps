const express = require('express');
const router = express.Router();
const pool = require('../db');
const logger = require('../logger');
const { 
    coordinateValidations,
    reconstructionValidations 
} = require('../middleware/validation');
const { rateLimiterAPI } = require('../security/rateLimiters');
const { validationResult } = require('express-validator');

// Middleware de seguridad
router.use((req, res, next) => {
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'Strict-Transport-Security': 'max-age=31536000'
    });
    next();
});

// Ruta POST para insertar coordenadas (corregida)
router.post('/', 
    rateLimiterAPI,
    ...coordinateValidations,
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { latitude, longitude, timestamp, isSuspicious, id_ruta, battery } = req.body;
        
        try {
            const result = await pool.query(
                'INSERT INTO coordinates (latitude, longitude, timestamp, vpn_validation, id_ruta, battery) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                [latitude, longitude, timestamp, isSuspicious, id_ruta, battery]
            );
            
            logger.info(`Coordenada insertada para ruta ${id_ruta}`);
            res.status(201).json(result.rows[0]);
            
        } catch (err) {
            logger.error('Error en POST /coordinates:', err.stack);
            res.status(500).json({ 
                error: 'Error interno del servidor',
                code: `COORD-${Date.now()}` 
            });
        }
});

// Resto de rutas (manteniendo tu lógica original pero optimizadas)
router.get('/latest-coordinates', rateLimiterAPI, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT ON (id_ruta) *
            FROM coordinates
            ORDER BY id_ruta, timestamp DESC
        `);
        res.json(result.rows);
    } catch (err) {
        logger.error('Error en GET /latest-coordinates:', err.stack);
        res.status(500).json({ error: 'Error al obtener coordenadas' });
    }
});

router.get('/getUniqueRutas', rateLimiterAPI, async (req, res) => {
    try {
        const result = await pool.query("SELECT DISTINCT id_ruta FROM coordinates");
        res.json(result.rows.map(row => row.id_ruta));
    } catch (err) {
        logger.error('Error en GET /getUniqueRutas:', err.stack);
        res.status(500).json({ error: 'Error al obtener rutas' });
    }
});

router.get('/reconstruirRecorrido', 
    rateLimiterAPI,
    ...reconstructionValidations,
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { id_ruta, fecha } = req.query;
        
        try {
            const result = await pool.query(`
                SELECT * 
                FROM coordinates 
                WHERE id_ruta = $1 AND DATE(timestamp) = $2
                ORDER BY timestamp`,
                [id_ruta, fecha]
            );
            res.json(result.rows);
        } catch (err) {
            logger.error(`Error en GET /reconstruirRecorrido: ${err.stack}`);
            res.status(500).json({ error: 'Error al reconstruir recorrido' });
        }
});

module.exports = router;