const express = require('express');
const router = express.Router();
const pool = require('../db');
const fs = require('fs');
const path = require('path');

// Función para guardar logs de ventas en archivo
function saveVentaLogs(id_ruta, reportData) {
    try {
        // Asegurar que existe la carpeta de logs
        const logDirectory = path.join(__dirname, 'logs');
        if (!fs.existsSync(logDirectory)) {
            fs.mkdirSync(logDirectory, { recursive: true });
        }
        
        // Crear nombre del archivo con timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = path.join(logDirectory, `logs_venta_${id_ruta}_${timestamp}.log`);
        
        // Contenido del log
        let logContent = `\n📊 DATOS DE VENTAS RECIBIDOS PARA RUTA: ${id_ruta} (${timestamp})\n`;
        logContent += `----------------------------------------------\n`;
        
        // Encabezados
        logContent += `COD_FAM | DESCRIPCION                    | VENTA       | COBERTURAS\n`;
        logContent += `--------+--------------------------------+-------------+-----------\n`;
        
        // Cada fila de datos
        reportData.forEach(item => {
            const cod = (item.COD_FAM || 'N/A').padEnd(6);
            const desc = (item.DESCRIPCION || 'Sin descripción').substring(0, 30).padEnd(30);
            const venta = (item.VENTA || 'Q 0').padEnd(11);
            const coberturas = (item.NUMERO_CLIENTES || '0').toString().padEnd(5);
            
            logContent += `${cod} | ${desc} | ${venta} | ${coberturas}\n`;
        });
        
        logContent += `--------+--------------------------------+-------------+-----------\n`;
        
        // Total de clientes al final
        if (reportData[0] && reportData[0].TotalClientes) {
            logContent += `TOTAL CLIENTES: ${reportData[0].TotalClientes}\n`;
        }
        
        logContent += `----------------------------------------------\n`;
        
        // Escribir al archivo
        fs.writeFileSync(filename, logContent);
        console.log(`✅ Log de ventas guardado en: ${filename}`);
        
        return filename;
    } catch (error) {
        console.error(`❌ Error al guardar log de ventas: ${error.message}`);
        return null;
    }
}

// 📌 Ruta para insertar coordenadas y procesar tokens FCM
router.post('/', async (req, res) => {
    const { 
        latitude, 
        longitude, 
        timestamp, 
        isSuspicious, 
        id_ruta, 
        battery, 
        token, 
        reportData,
        suspiciousReason = '', 
        isMoving = false, 
        movementContext = '' 
    } = req.body;
    
    const deviceId = req.headers['device-id']; // 📌 Extraemos el GUID desde el header
    const ip = req.ip;

    console.log(`🔍 GUID recibido: ${deviceId} | Ruta: ${id_ruta} | Token: ${token || 'No enviado'}`);
    
    // Log adicional para monitorear datos de contexto de movimiento
    if (isMoving !== undefined) {
        console.log(`🚶 Estado de movimiento: ${isMoving ? 'En movimiento' : 'Detenido'} | Contexto: ${movementContext || 'N/A'}`);
    }
    
    // Agregar log para datos del reporte
    if (reportData && Array.isArray(reportData) && reportData.length > 0) {
        console.log(`\n📊 DATOS DE VENTAS RECIBIDOS PARA RUTA: ${id_ruta}`);
        console.log(`----------------------------------------------`);
        
        // Imprimir encabezados
        console.log(`COD_FAM | DESCRIPCION                    | VENTA       | COBERTURAS`);
        console.log(`--------+--------------------------------+-------------+-----------`);
        
        // Imprimir cada fila de datos
        reportData.forEach(item => {
            const cod = (item.COD_FAM || 'N/A').padEnd(6);
            const desc = (item.DESCRIPCION || 'Sin descripción').substring(0, 30).padEnd(30);
            const venta = (item.VENTA || 'Q 0').padEnd(11);
            const coberturas = (item.NUMERO_CLIENTES || '0').toString().padEnd(5);
            
            console.log(`${cod} | ${desc} | ${venta} | ${coberturas}`);
        });
        
        console.log(`--------+--------------------------------+-------------+-----------`);
        
        // Mostrar el total de clientes al final
        if (reportData[0] && reportData[0].TotalClientes) {
            console.log(`TOTAL CLIENTES: ${reportData[0].TotalClientes}`);
        }
        
        console.log(`----------------------------------------------\n`);
        
        // Guardar este reporte en un archivo de log
        saveVentaLogs(id_ruta, reportData);
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
            return res.status(403).json({ error: 'Dispositivo no autorizado para esta ruta' });
        } else {
            // 📌 Insertar coordenadas si el dispositivo está autorizado
            if (latitude !== undefined && longitude !== undefined && timestamp !== undefined) {
                await pool.query(
                    'INSERT INTO coordinates (latitude, longitude, timestamp, vpn_validation, id_ruta, battery, suspicious_reason, is_moving, movement_context) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                    [
                        latitude, 
                        longitude, 
                        timestamp, 
                        isSuspicious || false, 
                        id_ruta, 
                        battery || 0, 
                        suspiciousReason, 
                        isMoving,       
                        movementContext 
                    ]
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
                    
                    // Extraer el TotalClientes del primer registro (si existe)
                    let totalClientes = 0;
                    if (reportData.length > 0 && reportData[0].TotalClientes) {
                        totalClientes = parseInt(reportData[0].TotalClientes, 10) || 0;
                        console.log(`📊 Total de clientes reportados: ${totalClientes}`);
                    }
                    
                    // Guardar el total de clientes en una tabla separada
                    if (totalClientes > 0) {
                        try {
                            // Extraer solo la fecha (YYYY-MM-DD) del timestamp
                            const fechaActual = coordTimestamp.split('T')[0];
                            
                            // Verificar si ya existe un registro para esta ruta y fecha
                            const checkTotalClientes = await pool.query(
                                `SELECT id FROM total_clientes 
                                 WHERE ruta = $1 AND DATE(fecha) = $2::date`,
                                [id_ruta, fechaActual]
                            );
                            
                            if (checkTotalClientes.rows.length > 0) {
                                // Actualizar el registro existente
                                const updateId = checkTotalClientes.rows[0].id;
                                await pool.query(
                                    `UPDATE total_clientes 
                                     SET total = $1, fecha = $2::timestamp
                                     WHERE id = $3`,
                                    [totalClientes, coordTimestamp, updateId]
                                );
                                console.log(`🔄 Actualizado total de clientes: Ruta ${id_ruta}, Total ${totalClientes}`);
                            } else {
                                // Intentar insertar en tabla total_clientes si existe
                                await pool.query(
                                    `INSERT INTO total_clientes (ruta, total, fecha)
                                     VALUES ($1, $2, $3::timestamp)`,
                                    [id_ruta, totalClientes, coordTimestamp]
                                );
                                console.log(`➕ Registrado total de clientes: Ruta ${id_ruta}, Total ${totalClientes}`);
                            }
                        } catch (clientesErr) {
                            // Si la tabla no existe, simplemente lo registramos pero continuamos
                            console.warn(`⚠️ No se pudo guardar total de clientes: ${clientesErr.message}`);
                            console.log(`💡 Considera crear una tabla 'total_clientes' con columnas (id, ruta, total, fecha)`);
                        }
                    }
                    
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
                                    coberturas,              // Total de clientes por familia
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
        res.status(500).json({ 
            error: 'Error en el servidor',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined 
        });
    }
});

// 📌 Ruta para obtener los últimos tokens registrados
router.get('/tokens', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM firebase_tokens');
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Error al obtener los tokens:', err);
        res.status(500).json({ error: 'Error al obtener los tokens' });
    }
});

// 📌 Ruta para obtener las últimas coordenadas
router.get('/latest-coordinates', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, latitude, longitude, id_ruta, timestamp, vpn_validation, battery,
                   suspicious_reason, is_moving, movement_context 
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
        res.status(500).json({ error: 'Error al obtener las coordenadas' });
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
        res.status(500).json({ error: 'Error al obtener las rutas' });
    }
});

// 📌 Ruta para reconstruir el recorrido según `id_ruta` y fecha
router.get('/reconstruirRecorrido', async (req, res) => {
    const { id_ruta, fecha } = req.query;

    if (!id_ruta || !fecha) {
        return res.status(400).json({ error: 'Se requieren los parámetros id_ruta y fecha' });
    }

    console.log(`🔍 Consulta recibida para id_ruta: ${id_ruta} y fecha: ${fecha}`);

    try {
        const result = await pool.query(`
            SELECT latitude, longitude, timestamp, vpn_validation, id_ruta, battery,
                   suspicious_reason, is_moving, movement_context
            FROM coordinates    
            WHERE id_ruta = $1 AND DATE(timestamp) = $2::date
            ORDER BY timestamp ASC
        `, [id_ruta, fecha]);

        console.log(`📊 Resultado de la consulta: ${result.rows.length} registros encontrados`);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Error al obtener las coordenadas:', err);
        res.status(500).json({ error: 'Error al obtener las coordenadas' });
    }
});

// 📌 Ruta para obtener todas las últimas coordenadas para cada `id_ruta`
router.get('/all-latest', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, latitude, longitude, id_ruta, timestamp, vpn_validation, battery,
                   suspicious_reason, is_moving, movement_context 
            FROM coordinates
            WHERE (id_ruta, timestamp) IN (
                SELECT id_ruta, MAX(timestamp)
                FROM coordinates
                GROUP BY id_ruta
            )
            ORDER BY id_ruta ASC;
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Error al obtener las coordenadas:', err);
        res.status(500).json({ error: 'Error al obtener las coordenadas' });
    }
});

// 📌 Ruta de prueba
router.get('/', (req, res) => {
    res.status(200).send('✅ Atlas sabe donde estás!');
});

module.exports = router;