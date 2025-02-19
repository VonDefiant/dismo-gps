const rateLimit = require('express-rate-limit');

// 🔐 Límite de intentos de login (protección contra fuerza bruta)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Máximo de intentos permitidos
    message: { error: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
        console.warn(`⚠️ Intentos de login excesivos desde IP: ${req.ip}`);
        res.status(429).json({ error: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.' });
    }
});

// 📡 Límite de solicitudes a la API de coordenadas
const rateLimiterAPI = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 100, // Máximo de 100 solicitudes por minuto
    message: { error: 'Demasiadas solicitudes, espera un momento.' },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
        console.warn(`🚫 IP bloqueada temporalmente por exceso de peticiones: ${req.ip}`);
        res.status(429).json({ error: 'Demasiadas solicitudes, espera un momento.' });
    }
});

module.exports = { loginLimiter, rateLimiterAPI };
