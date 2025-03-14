const express = require('express');
const router = express.Router();
const pool = require('../db');

// 📌 Ruta para insertar coordenadas y procesar tokens FCM
router.post('/', async (req, res) => {
    const { latitude, longitude, timestamp, isSuspicious, id_ruta, battery, token, reportData } = req.body;
    const deviceId = req.headers['device-id']; // 📌 Extraemos el GUID desde el header
    const ip = req.ip;

    console.log(`🔍 GUID recibido: ${deviceId} | Ruta: ${id_ruta} | Token: ${token || 'No enviado'}`);
    
    // Agregar log para datos del reporte
    if (reportData && Array.isArray(reportData)) {
        console.log(`📊 Datos de ventas recibidos: ${reportData.length} registros`);
    }

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

        // 📌 Registrar intento en `logs_acceso`
        await pool.query(
            'INSERT INTO logs_acceso (guid, ruta, estado, ip, fecha) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
            [deviceId, id_ruta, autorizado, ip]
        );

        if (autorizado === 'denegado') {
            console.log(`⚠️ Dispositivo NO autorizado: ${deviceId} | Ruta: ${id_ruta}`);
        } else {
            // 📌 Insertar coordenadas si el dispositivo está autorizado
            if (latitude !== undefined && longitude !== undefined && timestamp !== undefined) {
                await pool.query(
                    'INSERT INTO coordinates (latitude, longitude, timestamp, vpn_validation, id_ruta, battery) VALUES ($1, $2, $3, $4, $5, $6)',
                    [latitude, longitude, timestamp, isSuspicious || false, id_ruta, battery || 0]
                );
                console.log(`✅ Coordenadas registradas | GUID: ${deviceId} | Ruta: ${id_ruta}`);
            }
            
            // 📊 Procesar e insertar datos de ventas si existen
            if (reportData && Array.isArray(reportData) && reportData.length > 0) {
                try {
                    console.log(`🔄 Procesando ${reportData.length} registros de ventas para ruta: ${id_ruta}`);
                    
                    // Función auxiliar para limpiar el valor de venta
                    const limpiarVenta = (ventaStr) => {
                        // Si no hay valor, devolver 0
                        if (!ventaStr) return '0';
                        
                        // Convertir a string si no lo es
                        const str = String(ventaStr);
                        
                        // Eliminar cualquier carácter que no sea número, punto o coma
                        return str.replace(/[^0-9.,]/g, '')
                            // Reemplazar comas por puntos para formato decimal
                            .replace(',', '.');
                    };
                    
                    // Obtener la misma zona horaria que coordinates
                    // Usar directamente el timestamp recibido (si existe) o el timestamp actual
                    const coordTimestamp = timestamp || new Date().toISOString();
                    
                    // Procesar cada registro individualmente para verificar/actualizar
                    for (const item of reportData) {
                        // Extraer solo la fecha (YYYY-MM-DD) del timestamp
                        const fechaActual = coordTimestamp.split('T')[0];
                        
                        // Limpiar y preparar datos
                        const codigoFamilia = item.COD_FAM || 'SIN_CODIGO';
                        const descripcion = item.DESCRIPCION || 'Sin descripción';
                        const venta = limpiarVenta(item.VENTA); // Limpiar el valor de venta
                        const coberturas = parseFloat(item.NUMERO_CLIENTES || 0);
                        
                        // Verificar si ya existe un registro para esta ruta, código y fecha (solo año/mes/día)
                        const checkExisting = await pool.query(
                            `SELECT id FROM ventaxfamilia 
                             WHERE ruta = $1 AND cod_fam = $2 AND DATE(fecha) = $3::date`,
                            [id_ruta, codigoFamilia, fechaActual]
                        );
                        
                        if (checkExisting.rows.length > 0) {
                            // Actualizar el registro existente
                            const updateId = checkExisting.rows[0].id;
                            await pool.query(
                                `UPDATE ventaxfamilia 
                                 SET venta = $1, coberturas = $2, descripcion = $3, fecha = $4::timestamp
                                 WHERE id = $5`,
                                [
                                    venta,                   // Valor de venta limpio
                                    coberturas,              // Total de clientes
                                    descripcion,             // Descripción
                                    coordTimestamp,          // Usar exactamente el mismo timestamp de coordinates
                                    updateId
                                ]
                            );
                            console.log(`🔄 Actualizado registro: Ruta ${id_ruta}, Código ${codigoFamilia}, Venta ${venta}, Coberturas ${coberturas}`);
                        } else {
                            // Insertar nuevo registro
                            await pool.query(
                                `INSERT INTO ventaxfamilia (ruta, cod_fam, descripcion, venta, coberturas, fecha)
                                 VALUES ($1, $2, $3, $4, $5, $6::timestamp)`,
                                [
                                    id_ruta,
                                    codigoFamilia,
                                    descripcion,
                                    venta,
                                    coberturas,
                                    coordTimestamp           // Usar exactamente el mismo timestamp de coordinates
                                ]
                            );
                            console.log(`➕ Insertado registro: Ruta ${id_ruta}, Código ${codigoFamilia}, Venta ${venta}, Coberturas ${coberturas}`);
                        }
                    }
                    
                    console.log(`✅ Procesamiento de ventas completado: ${reportData.length} registros`);
                } catch (salesErr) {
                    console.error('❌ Error al procesar datos de ventas:', salesErr);
                    console.error('Detalle:', salesErr.detail || salesErr.message);
                }
            }
        }

        // 📌 Guardar o actualizar el token FCM incluso si el dispositivo no está autorizado
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

// 📌 Ruta para obtener los últimos tokens registrados
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