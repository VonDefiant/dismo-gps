const express = require('express');
const router = express.Router();
const pool = require('../db');

// 📌 Ruta para insertar coordenadas y procesar tokens FCM
router.post('/', async (req, res) => {
    const { latitude, longitude, timestamp, isSuspicious, id_ruta, battery, token } = req.body;
    const deviceId = req.headers['device-id']; // 📌 Extraemos el GUID desde el header
    const ip = req.ip;

    console.log(`🔍 GUID recibido: ${deviceId} | Ruta: ${id_ruta} | Token: ${token || 'No enviado'}`);

    if (!deviceId) {
        return res.status(400).json({ error: 'Device-ID requerido en el header' });
    }

    try {
        // 🔍 Verificar si el GUID está autorizado en la base de datos
        const checkDevice = await pool.query(
            'SELECT * FROM dispositivos_autorizados WHERE guid = $1 AND ruta = $2',
            [deviceId, id_ruta]
        );

        const autorizado = checkDevice.rows.length > 0 ? 'permitido' : 'denegado';

        // 📌 Registrar intento en `logs_acceso` con la fecha actual
        await pool.query(
            'INSERT INTO logs_acceso (guid, ruta, estado, ip, fecha) VALUES ($1, $2, $3, $4, $5)',
            [deviceId, id_ruta, autorizado, ip]
        );

        if (autorizado === 'denegado') {
            console.log(`🚫 Dispositivo NO autorizado: ${deviceId} | Ruta: ${id_ruta}`);
            return res.status(403).json({ error: 'Dispositivo no autorizado' });
        }

        // 📌 Insertar coordenadas en la base de datos (si se reciben)
        if (latitude && longitude) {
            await pool.query(
                'INSERT INTO coordinates (latitude, longitude, timestamp, vpn_validation, id_ruta, battery) VALUES ($1, $2, $3, $4, $5, $6)',
                [latitude, longitude, timestamp, isSuspicious, id_ruta, battery]
            );
            console.log(`✅ Coordenadas registradas | GUID: ${deviceId} | Ruta: ${id_ruta}`);
        }

        // 📌 Procesar token FCM
        if (token) {
            await pool.query(
                `INSERT INTO firebase_tokens (id_ruta, dispositivo_guid, token)
                VALUES ($1, $2, $3)
                ON CONFLICT (id_ruta)
                DO UPDATE SET dispositivo_guid = EXCLUDED.dispositivo_guid, token = EXCLUDED.token`,
                [id_ruta, deviceId, token]
            );
            console.log(`🔄 Token actualizado para la ruta: ${id_ruta} | Nuevo GUID: ${deviceId}`);
        }

        res.status(201).json({ message: 'Datos procesados correctamente' });
    } catch (err) {
        console.error('❌ Error en el procesamiento:', err);
        res.status(500).send('Error en el servidor');
    }
});

// 📌 Ruta para obtener todos los tokens registrados
router.get('/tokens', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM firebase_tokens');
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Error al obtener los tokens:', err);
        res.status(500).send('Error al obtener los tokens');
    }
});

// 📌 Ruta para obtener las últimas coordenadas
router.get('/latest-coordinates', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, latitude, longitude, id_ruta, timestamp, vpn_validation, battery 
            FROM coordinates
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
            SELECT id, latitude, longitude, id_ruta, timestamp, vpn_validation, battery 
            FROM coordinates
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
