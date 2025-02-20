const express = require('express');
const router = express.Router();
const pool = require('../db');

// 📌 Ruta para insertar nuevas coordenadas con validación y logs
router.post('/', async (req, res) => {
    const { latitude, longitude, timestamp, isSuspicious, id_ruta, battery } = req.body;
    const deviceId = req.headers['device-id']; // 📌 Extraemos el GUID desde el header
    const ip = req.ip;

    console.log(`🔍 GUID recibido: ${deviceId}`);
    
    if (!deviceId) {
        return res.status(400).json({ error: 'Device-ID requerido en el header' });
    }

    try {
        // 🔍 Verificar si el GUID está autorizado en la base de datos (CORREGIDO)
        const checkDevice = await pool.query(
            'SELECT * FROM dispositivos_autorizados WHERE guid = $1 AND ruta = $2',
            [deviceId, id_ruta]
        );

        const autorizado = checkDevice.rows.length > 0 ? 'permitido' : 'denegado';

        // 📌 Registrar intento en `logs_acceso`
        await pool.query(
            'INSERT INTO logs_acceso (gui, ruta, estado, ip) VALUES ($1, $2, $3, $4)',
            [deviceId, id_ruta, autorizado, ip]
        );

        if (autorizado === 'denegado') {
            console.log(`🚫 Dispositivo no autorizado: ${deviceId} para la ruta ${id_ruta}`);
            return res.status(403).json({ error: 'Dispositivo no autorizado' });
        }

        // 📌 Insertar coordenadas en la base de datos
        const result = await pool.query(
            'INSERT INTO coordinates (latitude, longitude, timestamp, vpn_validation, id_ruta, battery) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [latitude, longitude, timestamp, isSuspicious, id_ruta, battery]
        );

        console.log(`✅ Coordenadas registradas correctamente para el GUID: ${deviceId}`);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('❌ Error al guardar las coordenadas:', err);
        res.status(500).send('Error al guardar las coordenadas');
    }
});

// 📌 Ruta para obtener las últimas coordenadas
router.get('/latest-coordinates', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, latitude, longitude, id_ruta, timestamp, vpn_validation, battery FROM coordinates
            WHERE (id_ruta, timestamp) IN (
                SELECT id_ruta, MAX(timestamp)
                FROM coordinates
                GROUP BY id_ruta
            );
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Error al obtener las coordenadas:', err);
        res.status(500).send('Error al obtener las coordenadas');
    }
});

// 📌 Ruta para obtener los id_ruta únicos
router.get('/getUniqueRutas', async (req, res) => {
    try {
        const result = await pool.query("SELECT DISTINCT id_ruta FROM coordinates");
        const rutas = result.rows.map(row => row.id_ruta);
        res.json(rutas);
    } catch (err) {
        console.error('❌ Error al obtener los id_ruta:', err);
        res.status(500).send('Error al obtener las rutas');
    }
});

// 📌 Ruta para reconstruir el recorrido según `id_ruta` y fecha
router.get('/reconstruirRecorrido', async (req, res) => {
    const { id_ruta, fecha } = req.query;

    console.log(`🔍 Consulta recibida para id_ruta: ${id_ruta} y fecha: ${fecha}`);

    try {
        const result = await pool.query(`
            SELECT latitude, longitude, timestamp, vpn_validation, id_ruta, battery
            FROM coordinates    
            WHERE id_ruta = $1 AND DATE(timestamp) = $2::date
        `, [id_ruta, fecha]);

        console.log(`📊 Resultado de la consulta: ${JSON.stringify(result.rows)}`);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Error al obtener las coordenadas:', err);
        res.status(500).send('Error al obtener las coordenadas');
    }
});

// 📌 Ruta para obtener todas las últimas coordenadas para cada `id_ruta`
router.get('/all-latest', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, latitude, longitude, id_ruta, timestamp, vpn_validation, battery FROM coordinates
            WHERE (id_ruta, timestamp) IN (
                SELECT id_ruta, MAX(timestamp)
                FROM coordinates
                GROUP BY id_ruta
            );
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Error al obtener las coordenadas:', err);
        res.status(500).send('Error al obtener las coordenadas');
    }
});

// 📌 Ruta de prueba
router.get('/', (req, res) => {
    res.status(200).send('✅ Atlas sabe donde estás!');
});

module.exports = router;
