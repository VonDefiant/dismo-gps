const bcrypt = require('bcryptjs');
const pool = require('./db');
const logger = require('./logger'); // Configura winston en un archivo aparte
const { body, validationResult } = require('express-validator');

exports.login = [
  body('username').trim().notEmpty().withMessage('El nombre de usuario es requerido'),
  body('password').notEmpty().withMessage('La contraseña es requerida'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    logger.info(`Intentando iniciar sesión para: ${username}`);

    try {
      const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password);
        if (isValid) {
          req.session.userId = user.id;
          logger.info(`Sesión establecida`, { username }); // Incluye el username
          res.redirect('/main');
        } else {
          logger.warn('Contraseña incorrecta', { username }); // Incluye el username
          res.status(401).send('Credenciales incorrectas');
        }
      } else {
        logger.warn('Usuario no encontrado', { username }); // Incluye el username
        res.status(404).send('Credenciales incorrectas');
      }
    } catch (err) {
      logger.error(`Error al iniciar sesión: ${err.message}`, { username }); // Incluye el username
      res.status(500).send('Error al iniciar sesión');
    }
  }
];