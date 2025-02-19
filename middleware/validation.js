const { body, query, header } = require('express-validator');

// 🔒 Validación del GUID en headers
const validateDeviceId = header('Device-ID')
    .isUUID()
    .withMessage('Device-ID inválido o ausente.');

// 🔐 Validaciones para login
exports.validateLogin = [
    body('username').trim().escape().notEmpty(),
    body('password').notEmpty()
];

// 📍 Validaciones para coordenadas (POST)
exports.coordinateValidations = [
    validateDeviceId,  // ✅ Validación de GUID antes de procesar
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitud inválida.'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitud inválida.'),
    body('id_ruta').isString().trim().notEmpty().withMessage('ID de ruta requerido.'),
    body('battery').optional().isFloat({ min: 0, max: 100 }).withMessage('Nivel de batería inválido.')
];

// 🔄 Validaciones para reconstrucción de recorrido (GET)
exports.reconstructionValidations = [
    validateDeviceId,  // ✅ Validación de GUID antes de procesar
    query('id_ruta').isString().trim().notEmpty().withMessage('ID de ruta requerido.'),
    query('fecha').isISO8601().withMessage('Fecha inválida. Formato esperado: YYYY-MM-DD.')
];
