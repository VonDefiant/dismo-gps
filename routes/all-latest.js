// Ruta para obtener todas las últimas coordenadas con todos los detalles
router.get('/all-latest', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, latitude, longitude, id_ruta, timestamp, vpn_validation, battery
            FROM coordinates
            WHERE (id_ruta, timestamp) IN (
                SELECT id_ruta, MAX(timestamp)
                FROM coordinates
                GROUP BY id_ruta
            )
            ORDER BY id_ruta ASC;  // Orden ascendente por id_ruta
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener todas las últimas coordenadas:', err);
        res.status(500).send('Error al obtener todas las coordenadas');
    }
});
