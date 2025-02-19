// security/guidValidation.js
const pool = require('../db');

const validateGUID = async (req, res, next) => {
    const guid = req.headers['guid']; // 📌 Tomamos el GUID desde el header correctamente
    const id_ruta = req.body.id_ruta || req.query.id_ruta; // Compatible con POST/GET
    const ip = req.ip;

    if (!guid) {
        console.log('❌ Falta el GUID en la solicitud');
        return res.status(400).json({ error: 'GUID requerido en el header' });
    }

    try {
        // 🔍 Verificar si el GUID está autorizado para la ruta
        const query = await pool.query(
            'SELECT * FROM dispositivos_autorizados WHERE guid = $1 AND ruta = $2',
            [guid, id_ruta]
        );

        const autorizado = query.rows.length > 0 ? 'permitido' : 'denegado';

        // 📌 Registrar el intento de acceso en logs_acceso
        await pool.query(
            'INSERT INTO logs_acceso (guid, ruta, estado, ip) VALUES ($1, $2, $3, $4)',
            [guid, id_ruta, autorizado, ip]
        );

        if (autorizado === 'denegado') {
            console.log(`🚫 Dispositivo no autorizado: ${guid} para la ruta ${id_ruta}`);
            return res.status(403).json({ error: 'Dispositivo no autorizado' });
        }

        console.log(`✅ Dispositivo autorizado: ${guid} para la ruta ${id_ruta}`);
        next(); // Continuar con la solicitud
    } catch (error) {
        console.error('❌ Error en validación de GUID:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = validateGUID;
