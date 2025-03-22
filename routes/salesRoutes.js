const express = require('express');
const router = express.Router();
const pool = require('../db');

// 🔹 Ruta para insertar múltiples registros en ventaxfamilia
router.post('/', async (req, res) => {
    const sales = req.body;

    // Validación básica
    if (!Array.isArray(sales) || sales.length === 0) {
        return res.status(400).json({ error: 'El cuerpo de la solicitud debe ser un arreglo con al menos un registro.' });
    }

    try {
        // Iniciar una transacción
        await pool.query('BEGIN');

        // Construcción de la consulta dinámica
        const query = `
            INSERT INTO ventaxfamilia (ruta, cod_fam, descripcion, venta, coberturas, fecha)
            VALUES ${sales.map((_, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`).join(', ')}
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

        const result = await pool.query(query, values);
        await pool.query('COMMIT'); // Confirmar la transacción

        res.status(201).json({
            message: 'Registros insertados exitosamente.',
            data: result.rows,
        });
    } catch (err) {
        await pool.query('ROLLBACK'); // Deshacer la transacción en caso de error
        console.error('Error al insertar registros:', err.message);
        res.status(500).json({ error: 'Error al insertar los registros en la base de datos.' });
    }
});

// 🔹 Ruta para consultar ventas por ruta y fecha
router.get('/query', async (req, res) => {
    const { ruta, fecha } = req.query;

    if (!ruta || !fecha) {
        return res.status(400).json({ error: 'Faltan parámetros: ruta o fecha.' });
    }

    try {
        const query = `
        SELECT DISTINCT ON (cod_fam) 
        cod_fam, 
        descripcion, 
        CONCAT('Q ', venta::text) AS venta, 
        TRUNC(coberturas)::int AS coberturas, 
        fecha
            FROM ventaxfamilia
            WHERE ruta = $1 AND DATE(fecha) = $2
            ORDER BY cod_fam ASC, fecha DESC;
        `;

        const values = [ruta, fecha];
        const result = await pool.query(query, values);

        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error al consultar registros:', err.message);
        res.status(500).json({ error: 'Error al consultar registros en la base de datos.' });
    }
});

// Ruta para obtener total de clientes por ruta y fecha
router.get('/total_clientes', async (req, res) => {
    const { ruta, fecha } = req.query;

    if (!ruta || !fecha) {
        return res.status(400).json({ error: 'Faltan parámetros: ruta o fecha.' });
    }

    try {
        const query = `
            SELECT ruta, total, fecha
            FROM total_clientes
            WHERE ruta = $1 AND DATE(fecha) = $2
            ORDER BY fecha DESC
            LIMIT 1;
        `;

        const values = [ruta, fecha];
        const result = await pool.query(query, values);

        res.status(200).json(result.rows[0] || { total: 0 });
    } catch (err) {
        console.error('Error al consultar total de clientes:', err.message);
        res.status(500).json({ error: 'Error al consultar datos en la base de datos.' });
    }
});

// Ruta GET para obtener los id_ruta únicos
router.get('/getUniqueRutasvta', async (req, res) => {
    try {
        const result = await pool.query("SELECT DISTINCT ruta FROM ventaxfamilia");
        const rutas = result.rows.map(row => row.ruta);
        res.json(rutas);
    } catch (err) {
        console.error('Error al obtener los id_ruta:', err);
        res.status(500).send('Error al obtener las rutas');
    }
});

// 🔹 Ruta GET de prueba
router.get('/', (req, res) => {
    res.status(200).send('Atlas sabe dónde estás!');
});
// 🔴 Exportar router después de definir todas las rutas
module.exports = router;
