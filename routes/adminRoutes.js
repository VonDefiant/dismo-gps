// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Añadir esto a adminRoutes.js

// ✅ Obtener dispositivos pendientes de autorización
router.get('/dispositivos-pendientes', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id, guid, ruta, info_dispositivo, 
                TO_CHAR(fecha_solicitud, 'YYYY-MM-DD HH24:MI:SS') AS fecha_solicitud, 
                estado, notas 
            FROM dispositivos_pendientes 
            ORDER BY fecha_solicitud DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error("❌ Error al obtener dispositivos pendientes:", error);
        res.status(500).json({ error: 'Error al obtener dispositivos pendientes' });
    }
});

// ✅ Aprobar un dispositivo pendiente
router.post('/aprobar-dispositivo/:id', async (req, res) => {
    const { id } = req.params;
    const { notas } = req.body;
    
    try {
        // Iniciar transacción
        await pool.query('BEGIN');
        
        // Obtener datos del dispositivo pendiente
        const pendingDevice = await pool.query(
            'SELECT guid, ruta FROM dispositivos_pendientes WHERE id = $1', 
            [id]
        );
        
        if (pendingDevice.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ error: 'Dispositivo pendiente no encontrado' });
        }
        
        const { guid, ruta } = pendingDevice.rows[0];
        
        // Verificar si ya existe en dispositivos_autorizados
        const existingDevice = await pool.query(
            'SELECT * FROM dispositivos_autorizados WHERE guid = $1 AND ruta = $2',
            [guid, ruta]
        );
        
        if (existingDevice.rows.length === 0) {
            // Insertar en dispositivos_autorizados
            await pool.query(
                'INSERT INTO dispositivos_autorizados (guid, ruta, fecha_registro) VALUES ($1, $2, NOW())',
                [guid, ruta]
            );
        }
        
        // Actualizar estado en dispositivos_pendientes
        await pool.query(
            'UPDATE dispositivos_pendientes SET estado = $1, notas = $2 WHERE id = $3',
            ['aprobado', notas, id]
        );
        
        // Registrar en logs_acceso
        await pool.query(
            'INSERT INTO logs_acceso (guid, ruta, estado, ip, fecha) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
            [guid, ruta, 'dispositivo_aprobado', req.ip]
        );
        
        // Confirmar transacción
        await pool.query('COMMIT');
        
        res.json({ 
            success: true, 
            message: 'Dispositivo aprobado correctamente' 
        });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error("❌ Error al aprobar dispositivo:", error);
        res.status(500).json({ error: 'Error al aprobar dispositivo' });
    }
});

// ❌ Rechazar un dispositivo pendiente
router.post('/rechazar-dispositivo/:id', async (req, res) => {
    const { id } = req.params;
    const { notas } = req.body;
    
    try {
        // Obtener datos del dispositivo pendiente
        const pendingDevice = await pool.query(
            'SELECT guid, ruta FROM dispositivos_pendientes WHERE id = $1', 
            [id]
        );
        
        if (pendingDevice.rows.length === 0) {
            return res.status(404).json({ error: 'Dispositivo pendiente no encontrado' });
        }
        
        const { guid, ruta } = pendingDevice.rows[0];
        
        // Actualizar estado en dispositivos_pendientes
        await pool.query(
            'UPDATE dispositivos_pendientes SET estado = $1, notas = $2 WHERE id = $3',
            ['rechazado', notas, id]
        );
        
        // Registrar en logs_acceso
        await pool.query(
            'INSERT INTO logs_acceso (guid, ruta, estado, ip, fecha) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
            [guid, ruta, 'dispositivo_rechazado', req.ip]
        );
        
        res.json({ 
            success: true, 
            message: 'Dispositivo rechazado correctamente' 
        });
    } catch (error) {
        console.error("❌ Error al rechazar dispositivo:", error);
        res.status(500).json({ error: 'Error al rechazar dispositivo' });
    }
});


// ✅ Obtener dispositivos autorizados
router.get('/dispositivos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM dispositivos_autorizados ORDER BY ruta ASC'); // 📌 Ordenado por ruta
        res.json(result.rows);
    } catch (error) {
        console.error("❌ Error al obtener dispositivos:", error);
        res.status(500).json({ error: 'Error al obtener dispositivos' });
    }
});

// ✅ Agregar nuevo dispositivo
router.post('/dispositivos', async (req, res) => {
    const { ruta, imei } = req.body;

    if (!ruta || !imei) {
        return res.status(400).json({ error: "Faltan datos: ruta o imei" });
    }

    try {
        console.log("🔍 Verificando si el IMEI ya existe:", imei);

        // 📌 Verificar si el IMEI ya está en la base de datos
        const existe = await pool.query('SELECT * FROM dispositivos_autorizados WHERE guid = $1', [imei]);

        if (existe.rows.length > 0) {
            console.warn("⚠️ IMEI duplicado detectado:", imei);
            return res.status(400).json({ error: "⚠️ El IMEI ya está registrado en la base de datos." });
        }

        console.log("✅ IMEI no duplicado. Procediendo con la inserción.");

        const result = await pool.query(
            'INSERT INTO dispositivos_autorizados (ruta, guid, fecha_registro) VALUES ($1, $2, NOW()) RETURNING *',
            [ruta, imei]
        );

        res.status(201).json({ message: "✅ Dispositivo añadido correctamente", data: result.rows[0] });
    } catch (error) {
        console.error("❌ Error en la inserción de dispositivo:", error.message);
        res.status(500).json({ error: "Error en el servidor al registrar dispositivo", details: error.message });
    }
});



// ✅ Obtener logs de acceso
router.get('/logs', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT guid, ruta, estado, ip, 
                   TO_CHAR(fecha, 'YYYY-MM-DD HH24:MI:SS') AS fecha 
            FROM logs_acceso 
            ORDER BY fecha DESC 
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (error) {
        console.error("❌ Error al obtener logs de acceso:", error);
        res.status(500).json({ error: 'Error al obtener logs de acceso' });
    }
});



router.put('/dispositivos/:guid', async (req, res) => {
    const { guid } = req.params;
    const { ruta, nuevoGuid } = req.body; // `nuevoGuid` es el nuevo valor del GUID

    if (!ruta || !nuevoGuid) {
        return res.status(400).json({ error: "Faltan datos: ruta o nuevo GUID" });
    }

    try {
        console.log(`🔄 Actualizando dispositivo: ${guid} → ${nuevoGuid}, Ruta: ${ruta}`);

        // Actualizar en la base de datos
        const result = await pool.query(
            'UPDATE dispositivos_autorizados SET ruta = $1, guid = $2 WHERE guid = $3 RETURNING *',
            [ruta, nuevoGuid, guid]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Dispositivo no encontrado" });
        }

        res.json({ message: "✅ Dispositivo actualizado correctamente", data: result.rows[0] });
    } catch (error) {
        console.error("❌ Error en la actualización de dispositivo:", error.message);
        res.status(500).json({ error: "Error en el servidor al actualizar dispositivo", details: error.message });
    }
});

module.exports = router;
