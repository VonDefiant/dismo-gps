const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/coordinates', async (req, res) => {
    const { latitude, longitude, deviceId, timestamp } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO coordinates (latitude, longitude, device_id, timestamp) VALUES ($1, $2, $3, $4) RETURNING *',
            [latitude, longitude, deviceId, timestamp]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al guardar las coordenadas');
    }
});

module.exports = router;
