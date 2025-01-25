const express = require('express');
const router = express.Router();
const pool = require('../db');

// Ruta para insertar múltiples registros en ventaxfamilia
router.post('/bulk', async (req, res) => {
    const sales = req.body; // Recibimos un arreglo de registros

    // Validación básica
    if (!Array.isArray(sales) || sales.length === 0) {
        return res.status(400).json({ error: 'El cuerpo de la solicitud debe ser un arreglo con al menos un registro.' });
    }

    try {
        const query = `
            INSERT INTO ventaxfamilia (ruta, cod_fam, descripcion, venta, coberturas, fecha)
            VALUES 
            ${sales.map((_, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`).join(', ')}
            RETURNING *;
        `;

        const values = sales.flatMap(sale => [
            sale.ruta,
            sale.cod_fam,
            sale.descripcion,
            sale.venta,
            sale.coberturas || null,
            sale.fecha
        ]);

        // Ejecutamos el query
        const result = await pool.query(query, values);

        res.status(201).json({
            message: 'Registros insertados exitosamente.',
            data: result.rows,
        });
    } catch (err) {
        console.error('Error al insertar registros:', err.message);
        res.status(500).json({ error: 'Error al insertar los registros en la base de datos.' });
    }
});

// Ruta GET para pruebas
router.get('/', (req, res) => {
    res.status(200).send('Atlas sabe donde estas!');
});
module.exports = router;
