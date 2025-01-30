const express = require('express');
const router = express.Router();
const pool = require('./db');
const logger = require('./logger'); // Asegúrate de tener configurado Winston

// Ruta para obtener todas las últimas coordenadas con todos los detalles
router.get('/all-latest', async (req, res) => {
    try {
        const startTime = Date.now(); // Para medir el tiempo de ejecución
        
        // Query optimizada con DISTINCT ON para PostgreSQL
        const result = await pool.query(`
            SELECT DISTINCT ON (id_ruta)
                id, 
                latitude, 
                longitude, 
                id_ruta, 
                timestamp, 
                vpn_validation, 
                battery
            FROM coordinates
            ORDER BY id_ruta ASC, timestamp DESC
        `);

        // Log de auditoría
        logger.info('Coordenadas obtenidas', {
            action: 'get_all_latest_coordinates',
            duration: `${Date.now() - startTime}ms`,
            results: result.rowCount,
            user: req.session.userId // Asumiendo que tienes autenticación
        });

        // Manejo de resultados vacíos
        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'No se encontraron coordenadas recientes',
                suggestion: 'Verifique que existen registros en la base de datos'
            });
        }

        // Formateo de fechas ISO 8601
        const formattedResults = result.rows.map(coord => ({
            ...coord,
            timestamp: new Date(coord.timestamp).toISOString()
        }));

        res.json({
            success: true,
            count: formattedResults.length,
            data: formattedResults
        });

    } catch (err) {
        // Log detallado del error
        logger.error('Error crítico al obtener coordenadas', {
            error: err.message,
            stack: err.stack,
            endpoint: '/all-latest',
            timestamp: new Date().toISOString()
        });

        res.status(500).json({
            error: 'Error interno del servidor',
            reference: `Error-${Date.now()}` // ID único para seguimiento
        });
    }
});

module.exports = router;