// security/guidValidation.js
const pool = require('../db');

const validateGUID = async (req, res, next) => {
    try {
        // 📌 Aceptar múltiples formatos del GUID en los headers
        const guid = req.headers['device-id'] || req.headers['guid'] || req.headers['Device-ID'] || req.headers['GUID'];
        const id_ruta = req.body.id_ruta || req.query.id_ruta;
        const ip = req.ip;

        // Validación: `guid` debe estar presente
        if (!guid) {
            console.log(`❌ Falta el GUID en la solicitud (Ruta: ${id_ruta || 'desconocida'})`);
            return res.status(400).json({ error: 'Device-ID requerido en el header' });
        }

        // Validación: `id_ruta` debe estar presente
        if (!id_ruta) {
            console.log(`❌ Falta id_ruta en la solicitud (GUID: ${guid})`);
            return res.status(400).json({ error: 'id_ruta requerido en la solicitud' });
        }

        console.log(`🔍 Validando GUID: ${guid} para la Ruta: ${id_ruta}`);

        // 🔍 Verificar si el GUID está autorizado en la base de datos
        const query = await pool.query(
            'SELECT * FROM dispositivos_autorizados WHERE guid = $1 AND ruta = $2',
            [guid, id_ruta]
        );

        const autorizado = query.rows.length > 0 ? 'permitido' : 'denegado';

        // 📌 Registrar intento en logs_acceso con la ruta incluida
        await pool.query(
            'INSERT INTO logs_acceso (guid, ruta, estado, ip) VALUES ($1, $2, $3, $4)',
            [guid, id_ruta, autorizado, ip]
        );

        if (autorizado === 'denegado') {
            console.log(`🚫 Dispositivo NO autorizado (GUID: ${guid}, Ruta: ${id_ruta})`);
            return res.status(403).json({ error: 'Dispositivo no autorizado' });
        }

        console.log(`✅ Dispositivo AUTORIZADO (GUID: ${guid}, Ruta: ${id_ruta})`);
        next(); // Continuar con la solicitud
    } catch (error) {
        console.error(`❌ Error en validación de GUID (Ruta: ${id_ruta || 'desconocida'})`, error);
        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
};

module.exports = validateGUID;
