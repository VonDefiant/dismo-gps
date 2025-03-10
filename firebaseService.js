// firebaseService.js
const admin = require('firebase-admin');
const path = require('path');
const { logger } = require('./logger');
const pool = require('./db');

// Inicializa Firebase Admin con las credenciales
const serviceAccount = require('./dismogt-a30ec-firebase-adminsdk-fbsvc-429b7577e9.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

class FirebaseService {
    constructor() {
        this.messaging = admin.messaging();
    }

    /**
     * Obtener todas las rutas con sus tokens FCM y la última sincronización
     */
    async getRoutesWithTokens() {
        try {
            const query = `
                SELECT 
                    ft.id_ruta, 
                    ft.token,
                    (SELECT cr.timestamp 
                    FROM coordinates cr 
                    WHERE cr.id_ruta = ft.id_ruta 
                    ORDER BY cr.timestamp DESC 
                    LIMIT 1) AS last_timestamp
                FROM firebase_tokens ft
            `;
            
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            logger.error(`Error al obtener tokens FCM: ${error.message}`);
            throw error;
        }
    }

    /**
     * Enviar notificación push a un dispositivo específico
     * @param {string} token - Token FCM del dispositivo
     * @param {object} data - Datos a enviar en la notificación
     */
    async sendPushNotification(token, data) {
        try {
            if (!token) {
                throw new Error('Token FCM no proporcionado');
            }

            // Estructura exactamente como la que funciona en Postman
            // Sin notification, sin android, sin apns - solo token y data
            const message = {
                token: token,
                data: {
                    title: data.data?.title || "DISMOGT REPORTES",
                    body: data.data?.body || "Notificación de sincronización",
                    tipo: data.data?.tipo || "location_update",
                    action: data.data?.action || "SYNC_DATA",
                    ruta: data.data?.ruta || "",
                    timestamp: data.data?.timestamp || new Date().toISOString(),
                    // Copiar cualquier otro dato adicional que venga de data.data
                    ...(data.data || {})
                }
            };

            // Log para depuración
            logger.info(`Enviando mensaje con estructura: ${JSON.stringify(message)}`);
            
            const response = await this.messaging.send(message);
            
            logger.info(`Notificación enviada con éxito: ${response}`);
            return {
                success: true,
                messageId: response
            };
        } catch (error) {
            logger.error(`Error al enviar notificación push: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Enviar notificación push a múltiples dispositivos
     * @param {string[]} tokens - Lista de tokens FCM
     * @param {object} data - Datos a enviar en la notificación
     */
    async sendMulticastPushNotification(tokens, data) {
        try {
            if (!tokens || tokens.length === 0) {
                throw new Error('No se proporcionaron tokens FCM');
            }

            // Preparar el mensaje con formato exactamente como el de Postman
            // Sin notification, sin android, sin apns - solo tokens y data
            const message = {
                tokens: tokens,
                data: {
                    title: data.data?.title || "DISMOGT REPORTES",
                    body: data.data?.body || "Notificación de sincronización",
                    tipo: data.data?.tipo || "location_update",
                    action: data.data?.action || "SYNC_DATA",
                    ruta: data.data?.ruta || "",
                    timestamp: data.data?.timestamp || new Date().toISOString(),
                    // Copiar cualquier otro dato adicional que venga de data.data
                    ...(data.data || {})
                }
            };

            // Log para depuración
            logger.info(`Enviando mensaje multicast con estructura: ${JSON.stringify(message)}`);

            // Firebase tiene un límite de 500 tokens por solicitud, así que dividimos si es necesario
            const batchSize = 500;
            let successCount = 0;
            let failureCount = 0;
            
            for (let i = 0; i < tokens.length; i += batchSize) {
                const batch = tokens.slice(i, i + batchSize);
                const batchMessage = { ...message, tokens: batch };
                
                try {
                    const response = await this.messaging.sendMulticast(batchMessage);
                    successCount += response.successCount;
                    failureCount += response.failureCount;
                    
                    logger.info(`Lote ${Math.floor(i/batchSize) + 1}: ${response.successCount} exitosas, ${response.failureCount} fallidas`);
                } catch (batchError) {
                    failureCount += batch.length;
                    logger.error(`Error en lote ${Math.floor(i/batchSize) + 1}: ${batchError.message}`);
                }
            }
            
            logger.info(`Notificación multicast completada: ${successCount} exitosas, ${failureCount} fallidas`);
            return {
                success: true,
                successCount: successCount,
                failureCount: failureCount
            };
        } catch (error) {
            logger.error(`Error al enviar notificación multicast: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Método para enviar una notificación de prueba con el formato exacto de Postman
     * @param {string} token - Token FCM del dispositivo
     */
    async sendPostmanStyleNotification(token, data) {
        try {
            if (!token) {
                throw new Error('Token FCM no proporcionado');
            }

            // Estructura exactamente igual a la de Postman que funciona
            const message = {
                token: token,
                data: {
                    title: "Prueba en Segundo Plano",
                    body: "Esta notificación debe recibirse aunque la app esté cerrada.",
                    action: data?.action || "SYNC_DATA",
                    ruta: data?.ruta || "",
                    tipo: "location_update",
                    timestamp: new Date().toISOString(),
                    ...(data || {})
                }
            };

            logger.info(`Enviando notificación de prueba Postman-style a: ${token.substring(0, 10)}...`);
            
            const response = await this.messaging.send(message);
            
            logger.info(`Notificación de prueba enviada con éxito: ${response}`);
            return {
                success: true,
                messageId: response
            };
        } catch (error) {
            logger.error(`Error al enviar notificación de prueba: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new FirebaseService();