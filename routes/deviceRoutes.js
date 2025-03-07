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
        const app_version = req.body.app_version;
        const device_model = req.body.device_model;
        const device_manufacturer = req.body.device_manufacturer;
        const device_name = req.body.device_name;
        const platform = req.body.platform;
        
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
        
        console.log('6. Verificando registro existente');
        
        // Verificar si existe un registro para esta combinación de id_ruta y dispositivo_guid
        const existingRecord = await pool.query(
            'SELECT token, dispositivo_guid FROM firebase_tokens WHERE id_ruta = $1',
            [id_ruta]
        );

        let tokenChanged = true;
        let guidChanged = false;

        if (existingRecord.rows.length > 0) {
            // Verificar si el token ha cambiado
            if (existingRecord.rows[0].token === fcm_token) {
                tokenChanged = false;
                console.log(`7. El token para la ruta ${id_ruta} no ha cambiado`);
            } else {
                console.log(`7. El token para la ruta ${id_ruta} ha cambiado`);
            }
            
            // Verificar si el GUID ha cambiado
            if (existingRecord.rows[0].dispositivo_guid !== deviceId) {
                guidChanged = true;
                console.log(`8. La ruta ${id_ruta} ahora está asociada a un nuevo dispositivo: ${deviceId} (anterior: ${existingRecord.rows[0].dispositivo_guid})`);
            } else {
                console.log(`8. El dispositivo para la ruta ${id_ruta} no ha cambiado`);
            }
        } else {
            console.log(`7. No existe registro previo para la ruta: ${id_ruta}`);
        }

        // Actualizar solo si ha cambiado el token o el GUID
        if (tokenChanged || guidChanged) {
            console.log('9. Se requiere actualización del registro');
            
            // Registrar el cambio en la tabla de historial (opcional)
            if (existingRecord.rows.length > 0) {
                try {
                    await pool.query(
                        `INSERT INTO token_history (id_ruta, dispositivo_guid_anterior, dispositivo_guid_nuevo, token_anterior, token_nuevo, fecha_cambio)
                        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
                        [
                            id_ruta, 
                            existingRecord.rows[0].dispositivo_guid, 
                            deviceId,
                            existingRecord.rows[0].token,
                            fcm_token
                        ]
                    );
                    console.log(`10. Historial de cambio de token registrado para ruta: ${id_ruta}`);
                } catch (histErr) {
                    // Si la tabla no existe, continuar sin error fatal
                    console.error(`Error al registrar historial de token: ${histErr.message}`);
                }
            }

            // Insertar o actualizar el token en la tabla firebase_tokens
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
            
            if (tokenChanged && !guidChanged) {
                console.log(`11. Token FCM actualizado para la ruta: ${id_ruta}`);
            } else if (guidChanged) {
                console.log(`11. Token FCM y dispositivo actualizados para la ruta: ${id_ruta}`);
            }
            
            // Registrar en logs_acceso
            await pool.query(
                `INSERT INTO logs_acceso (guid, ruta, estado, ip, fecha)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
                [deviceId, id_ruta, tokenChanged ? 'token_actualizado' : 'dispositivo_actualizado', req.ip]
            );
        } else {
            console.log('9. No se requiere actualización (token y dispositivo sin cambios)');
        }

        // Si el dispositivo no está autorizado, almacenar información para revisión
        if (!isAuthorized) {
            console.log(`12. Dispositivo no autorizado: ${deviceId}`);
            
            try {
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
                );
                console.log(`13. Información del dispositivo no autorizado almacenada`);
            } catch (err) {
                console.error(`Error al registrar dispositivo pendiente: ${err.message}`);
            }
        }
        
        console.log('14. Endpoint completado correctamente');
        res.status(200).json({ 
            success: true,
            authorized: isAuthorized,
            message: tokenChanged ? 'Token registrado exitosamente' : 'Token recibido (sin cambios)',
            status: isAuthorized ? 'authorized' : 'pending_authorization'
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

// 📌 Ruta para obtener tokens por ruta
router.get('/tokens/:ruta', async (req, res) => {
    try {
        const { ruta } = req.params;
        
        const result = await pool.query(
            'SELECT id_ruta, dispositivo_guid, token, ultima_actualizacion FROM firebase_tokens WHERE id_ruta = $1',
            [ruta]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró token para la ruta especificada'
            });
        }
        
        res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Error al obtener token:', err.message);
        res.status(500).json({
            success: false,
            error: 'Error interno al obtener el token'
        });
    }
});

// 📌 Ruta para listar todos los tokens
router.get('/tokens', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                t.id_ruta, 
                t.dispositivo_guid, 
                t.token, 
                TO_CHAR(t.ultima_actualizacion, 'YYYY-MM-DD HH24:MI:SS') as ultima_actualizacion,
                CASE 
                    WHEN EXISTS (SELECT 1 FROM dispositivos_autorizados d WHERE d.guid = t.dispositivo_guid AND d.ruta = t.id_ruta)
                    THEN true
                    ELSE false
                END as autorizado
            FROM 
                firebase_tokens t
            ORDER BY 
                t.ultima_actualizacion DESC
        `);
        
        res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (err) {
        console.error('Error al listar tokens:', err.message);
        res.status(500).json({
            success: false,
            error: 'Error interno al listar tokens'
        });
    }
});

// 📌 Ruta de prueba
router.get('/', (req, res) => {
    res.status(200).send(' Atlas sabe donde estás!');
});

module.exports = router;