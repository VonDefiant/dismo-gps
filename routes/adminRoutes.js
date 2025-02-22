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
    const { ruta, imei } = req.body; // 📌 Asegurar que se recibe correctamente

    // 🔍 Validación de datos antes de insertar
    if (!ruta || !imei) {
        return res.status(400).json({ error: "Faltan datos: ruta o imei" });
    }

    try {
        const result = await pool.query(
            'INSERT INTO dispositivos_autorizados (ruta, guid, fecha_registro) VALUES ($1, $2, NOW()) RETURNING *',
            [ruta, imei]
        );

        res.status(201).json({ message: "✅ Dispositivo añadido correctamente", data: result.rows[0] });
    } catch (error) {
        console.error("❌ Error en la inserción de dispositivo:", error);
        res.status(500).json({ error: "Error en el servidor al registrar dispositivo", details: error.message });
    }
});

// ✅ Obtener logs de acceso
router.get('/logs', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM logs_acceso ORDER BY fecha DESC');
        res.json(result.rows);
    } catch (error) {
        console.error("❌ Error al obtener logs:", error);
        res.status(500).json({ error: 'Error al obtener logs' });
    }
});

module.exports = router;
