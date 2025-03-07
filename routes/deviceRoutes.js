const express = require('express');
const router = express.Router();
const pool = require('../db');
const { logger } = require('../logger');

// 📌 Ruta para recibir e insertar un token FCM
router.post('/token', async (req, res) => {
    try {
        console.log('1. Inicio del endpoint');
        
        const deviceId = req.headers['device-id'] || req.body.device_id;
        const fcm_token = req.body.fcm_token;
        const id_ruta = req.body.id_ruta;
        
        console.log('2. Datos extraídos:', { deviceId, tokenPresente: Boolean(fcm_token), id_ruta });
        
        if (!id_ruta || !fcm_token || !deviceId) {
            console.log('3. Faltan datos requeridos');
            return res.status(400).json({
                success: false,
                error: 'Faltan datos requeridos'
            });
        }
        
        console.log('4. Verificando dispositivo autorizado');
        let isAuthorized = false;
        try {
            const deviceAuthorized = await pool.query(
                'SELECT * FROM dispositivos_autorizados WHERE guid = $1 AND ruta = $2',
                [deviceId, id_ruta]
            );
            isAuthorized = deviceAuthorized.rows.length > 0;
            console.log('5. Autorización verificada:', isAuthorized);
        } catch (err) {
            console.error('Error en verificación de autorización:', err.message);
            // Continuamos con isAuthorized = false
        }
        
        console.log('6. Verificando token existente');
        let tokenChanged = true;
        try {
            const existingToken = await pool.query(
                'SELECT token FROM firebase_tokens WHERE id_ruta = $1',
                [id_ruta]
            );
            if (existingToken.rows.length > 0 && existingToken.rows[0].token === fcm_token) {
                tokenChanged = false;
            }
            console.log('7. Token cambiado:', tokenChanged);
        } catch (err) {
            console.error('Error en verificación de token existente:', err.message);
            // Continuamos con tokenChanged = true
        }
        
        console.log('8. Actualizando token');
        try {
            await pool.query(
                `INSERT INTO firebase_tokens (id_ruta, dispositivo_guid, token, ultima_actualizacion)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                ON CONFLICT (id_ruta)
                DO UPDATE SET 
                    dispositivo_guid = EXCLUDED.dispositivo_guid, 
                    token = EXCLUDED.token,
                    ultima_actualizacion = CURRENT_TIMESTAMP`,
                [id_ruta, deviceId, fcm_token]
            );
            console.log('9. Token actualizado correctamente');
        } catch (err) {
            console.error('Error en actualización de token:', err.message);
            throw err; // Lanzamos el error para que lo maneje el catch principal
        }
        
        console.log('10. Endpoint completado correctamente');
        res.status(200).json({ 
            success: true,
            authorized: isAuthorized,
            message: tokenChanged ? 'Token registrado exitosamente' : 'Token recibido (sin cambios)'
        });
    } catch (err) {
        console.error('Error general en el endpoint:', err.message);
        res.status(500).json({
            success: false,
            error: 'Error interno al procesar el token',
            details: err.message
        });
    }
});

// 📌 Ruta de pruebas
router.get('/', (req, res) => {
    res.status(200).send(' Atlas sabe donde estás!');
});


module.exports = router;