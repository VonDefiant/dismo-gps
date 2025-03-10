// firebaseRoutes.js
const express = require('express');
const router = express.Router();
const firebaseService = require('../firebaseService');
const { logger } = require('../logger');

/**
 * GET /api/sincronizacion/rutas
 * Obtiene todas las rutas con sus tokens FCM y la última sincronización
 */
router.get('/sincronizacion/rutas', async (req, res) => {
    try {
        const routes = await firebaseService.getRoutesWithTokens();
        res.json(routes);
    } catch (error) {
        logger.error(`Error al obtener rutas para sincronización: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            error: 'Error al obtener datos de sincronización' 
        });
    }
});

/**
 * POST /api/push/send
 * Envía una notificación push a un dispositivo específico
 */
router.post('/push/send', async (req, res) => {
    const { token, message } = req.body;
    
    if (!token || !message) {
        return res.status(400).json({ 
            success: false, 
            error: 'Token y mensaje son requeridos' 
        });
    }

    try {
        // Solo necesitamos pasar el data del mensaje
        const notificationData = {
            data: message.data || {}
        };

        const result = await firebaseService.sendPushNotification(token, notificationData);
        
        if (result.success) {
            res.json({ 
                success: true, 
                message: 'Notificación enviada correctamente',
                messageId: result.messageId
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: 'Error al enviar notificación', 
                details: result.error 
            });
        }
    } catch (error) {
        logger.error(`Error al enviar notificación push: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno al enviar notificación' 
        });
    }
});

/**
 * POST /api/push/sendMulticast
 * Envía notificaciones push a múltiples dispositivos
 */
router.post('/push/sendMulticast', async (req, res) => {
    const { tokens, message } = req.body;
    
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0 || !message) {
        return res.status(400).json({ 
            success: false, 
            error: 'Se requiere un array de tokens y un mensaje' 
        });
    }

    try {
        // Solo necesitamos pasar el data del mensaje
        const notificationData = {
            data: message.data || {}
        };
        
        const result = await firebaseService.sendMulticastPushNotification(tokens, notificationData);
        
        if (result.success) {
            res.json({ 
                success: true, 
                message: `Notificación enviada: ${result.successCount} exitosas, ${result.failureCount} fallidas`,
                successCount: result.successCount,
                failureCount: result.failureCount
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: 'Error al enviar notificaciones', 
                details: result.error 
            });
        }
    } catch (error) {
        logger.error(`Error al enviar notificaciones multicast: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno al enviar notificaciones' 
        });
    }
});

/**
 * POST /api/push/test
 * Prueba para enviar notificación en el formato exacto como Postman
 */
router.post('/push/test', async (req, res) => {
    const { token, data } = req.body;
    
    if (!token) {
        return res.status(400).json({ 
            success: false, 
            error: 'Token es requerido' 
        });
    }

    try {
        // Usar el método dedicado para enviar notificaciones estilo Postman
        const result = await firebaseService.sendPostmanStyleNotification(token, data);
        
        if (result.success) {
            res.json({ 
                success: true, 
                message: 'Notificación de prueba enviada correctamente',
                messageId: result.messageId
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: 'Error al enviar notificación de prueba', 
                details: result.error 
            });
        }
    } catch (error) {
        logger.error(`Error al enviar notificación de prueba: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno al enviar notificación de prueba',
            details: error.message
        });
    }
});

module.exports = router;