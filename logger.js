const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

// 📂 Asegurar que la carpeta de logs exista
const logDirectory = path.join(__dirname, 'logs');
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}

// 🎯 Configuración de niveles de log
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// 🔍 Determina el nivel de log según el entorno
const level = () => {
    const env = process.env.NODE_ENV || 'development';
    return env === 'development' ? 'debug' : 'info';
};

// 🎨 Formatos personalizados
const logFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }), // Muestra stack trace de errores
    format.splat(), // Permite interpolación de strings
    format.printf(({ timestamp, level, message, stack }) => {
        return `${timestamp} [${level.toUpperCase()}] ${message} ${stack || ''}`;
    })
);

// 🚀 Configuración del logger
const logger = createLogger({
    level: level(),
    levels,
    format: logFormat,
    transports: [
        // Mostrar logs en consola (solo en desarrollo)
        new transports.Console({
            format: format.combine(format.colorize(), logFormat),
        }),

        // Guardar logs de errores en un archivo
        new transports.File({
            filename: path.join(logDirectory, 'error.log'),
            level: 'error',
        }),

        // Guardar todos los logs en un archivo
        new transports.File({
            filename: path.join(logDirectory, 'combined.log'),
        }),
    ],
});

// 📡 Middleware para registrar todas las solicitudes HTTP
const httpLogger = (req, res, next) => {
    logger.http(`${req.method} ${req.url} - ${req.ip}`);
    next();
};

module.exports = { logger, httpLogger };
