// security/rateLimiters.js
const rateLimit = require('express-rate-limit');

// Rate limiter para login
exports.loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5,
    message: 'Demasiados intentos de login desde esta IP',
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiter para las rutas de coordenadas (nuevo)
exports.rateLimiterAPI = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 100, // 100 peticiones por minuto
    message: 'Límite de solicitudes excedido',
    standardHeaders: true,
    legacyHeaders: false
});