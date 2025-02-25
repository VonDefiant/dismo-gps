// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

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
