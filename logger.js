const { createLogger, format, transports } = require('winston');
const path = require('path');

// Configuración de niveles de log
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define el nivel de log según el entorno
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info';
};

// Formatos personalizados
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }), // Muestra el stack trace de errores
  format.splat(), // Permite interpolación de strings
  format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}] ${message} ${stack || ''}`;
  })
);

// Transportes (dónde se guardan los logs)
const logger = createLogger({
  level: level(),
  levels,
  format: logFormat,
  transports: [
    // Guardar logs en la consola
    new transports.Console({
      format: format.combine(format.colorize(), logFormat),
    }),

    // Guardar logs de errores en un archivo
    new transports.File({
      filename: path.join(__dirname, 'logs', 'error.log'),
      level: 'error',
    }),

    // Guardar todos los logs en un archivo
    new transports.File({
      filename: path.join(__dirname, 'logs', 'combined.log'),
    }),
  ],
});

module.exports = logger;