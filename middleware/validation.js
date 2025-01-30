const { body, query } = require('express-validator');

// Validaciones para login
exports.validateLogin = [
    body('username').trim().escape().notEmpty(),
    body('password').notEmpty()
];

// Validaciones para coordenadas (POST)
exports.coordinateValidations = [
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
    body('id_ruta').isString().trim().notEmpty(),
    body('battery').optional().isFloat({ min: 0, max: 100 })
];

// Validaciones para reconstruir recorrido (GET)
exports.reconstructionValidations = [
    query('id_ruta').isString().trim().notEmpty(),
    query('fecha').isISO8601()
];