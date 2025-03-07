const express = require('express');
const router = express.Router();
const pool = require('../db');
const { logger } = require('../logger');

// 📌 Ruta para recibir e insertar un token FCM
router.post('/token', async (req, res) => {
    try {
        const deviceId = req.headers['device-id'] || req.body.device_id;
        const fcm_token = req.body.fcm_token;
        const id_ruta = req.body.id_ruta;
        
        console.log('Datos recibidos para token:', {
            deviceId,
            tokenLength: fcm_token ? fcm_token.length : 0,
            id_ruta
        });
        
        res.status(200).json({ 
            success: true,
            message: 'Endpoint funcionando',
            received: {
                deviceId,
                hasToken: Boolean(fcm_token),
                id_ruta
            }
        });
    } catch (err) {
        console.error('Error detallado:', err.message);
        res.status(500).json({
            success: false,
            error: 'Error interno simplificado',
            details: err.message
        });
    }
});

// 📌 Ruta de prueba
router.get('/', (req, res) => {
    res.status(200).send(' Atlas sabe donde estás!');
});


module.exports = router;