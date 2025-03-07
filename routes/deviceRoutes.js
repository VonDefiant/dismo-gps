const express = require('express');
const router = express.Router();
const pool = require('../db');
const { logger } = require('../logger');

// 📌 Ruta para recibir e insertar un token FCM
router.post('/token', async (req, res) => {
    const { 
        fcm_token, 
        id_ruta,
        app_version,
        device_model,
        device_manufacturer,
        device_name,
        platform
    } = req.body;
    
    // Extraemos el GUID del dispositivo desde el header o del body
    const deviceId = req.headers['device-id'] || req.body.device_id;
    
    // Validación básica
    if (!id_ruta || !fcm_token) {
        logger.warn(`⚠️ Petición de token incompleta. Falta id_ruta o fcm_token`);
        return res.status(400).json({ 
            success: false, 
            error: 'Se requieren id_ruta y fcm_token en el cuerpo de la petición' 
        });
    }
    
    if (!deviceId) {
        logger.warn(`⚠️ Petición de token sin Device-ID`);
        return res.status(400).json({ 
            success: false, 
            error: 'Se requiere Device-ID en el header o device_id en el cuerpo' 
        });
    }

    logger.info(`🔄 Procesando token FCM | Ruta: ${id_ruta} | GUID: ${deviceId}`);
    logger.info(`📱 Dispositivo: ${device_manufacturer || 'N/A'} ${device_model || 'N/A'} (${platform || 'N/A'})`);
    logger.debug(`🔐 Token: ${fcm_token.substring(0, 15)}...`);

    try {
        // 1. Verificar si el dispositivo está autorizado
        const deviceAuthorized = await pool.query(
            'SELECT * FROM dispositivos_autorizados WHERE guid = $1 AND ruta = $2',
            [deviceId, id_ruta]
        );

        let isAuthorized = deviceAuthorized.rows.length > 0;
        
        // 2. Verificar si el token ha cambiado
        const existingToken = await pool.query(
            'SELECT token FROM firebase_tokens WHERE id_ruta = $1',
            [id_ruta]
        );

        let tokenChanged = true;
        if (existingToken.rows.length > 0 && existingToken.rows[0].token === fcm_token) {
            tokenChanged = false;
            logger.info(`ℹ️ El token para la ruta ${id_ruta} no ha cambiado`);
        }

        // 3. Registrar el intento en logs_acceso
        await pool.query(
            'INSERT INTO logs_acceso (guid, ruta, estado, ip, fecha) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
            [deviceId, id_ruta, isAuthorized ? 'token_autorizado' : 'token_no_autorizado', req.ip]
        );

        if (!isAuthorized) {
            logger.warn(`⚠️ Dispositivo no autorizado intentando registrar token | GUID: ${deviceId} | Ruta: ${id_ruta}`);
            
            // 4. Almacenar información del dispositivo no autorizado para revisión
            await pool.query(
                `INSERT INTO dispositivos_pendientes 
                (guid, ruta, info_dispositivo, fecha_solicitud, estado) VALUES 
                ($1, $2, $3, CURRENT_TIMESTAMP, 'pendiente')
                ON CONFLICT (guid, ruta) 
                DO UPDATE SET 
                    info_dispositivo = EXCLUDED.info_dispositivo,
                    fecha_solicitud = CURRENT_TIMESTAMP`,
                [
                    deviceId, 
                    id_ruta, 
                    JSON.stringify({
                        app_version,
                        device_model,
                        device_manufacturer,
                        device_name,
                        platform,
                        ip: req.ip
                    })
                ]
            ).catch(err => {
                // Si la tabla no existe, continuamos sin error fatal
                logger.error(`Error al registrar dispositivo pendiente: ${err.message}`);
            });
        }

        // 5. Actualizar el token FCM (tanto para dispositivos autorizados como no autorizados)
        if (tokenChanged) {
            await pool.query(
                `INSERT INTO firebase_tokens (id_ruta, dispositivo_guid, token, ultima_actualizacion)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                ON CONFLICT (id_ruta)
                DO UPDATE SET 
                    dispositivo_guid = EXCLUDED.dispositivo_guid, 
                    token = EXCLUDED.token,
                    ultima_actualizacion = CURRENT_TIMESTAMP
                RETURNING *`,
                [id_ruta, deviceId, fcm_token]
            );
            
            logger.info(`✅ Token FCM actualizado para la ruta: ${id_ruta}`);
        }
        
        // 6. Responder al cliente
        res.status(200).json({ 
            success: true,
            authorized: isAuthorized,
            message: tokenChanged 
                ? 'Token registrado exitosamente' 
                : 'Token recibido (sin cambios)',
            status: isAuthorized 
                ? 'authorized' 
                : 'pending_authorization'
        });
    } catch (err) {
        logger.error(`❌ Error al registrar token FCM: ${err.message}`, { error: err });
        res.status(500).json({ 
            success: false, 
            error: 'Error interno al procesar el token'
        });
    }
});

// 📌 Ruta de prueba
router.get('/', (req, res) => {
    res.status(200).send(' Atlas sabe donde estás!');
});


module.exports = router;