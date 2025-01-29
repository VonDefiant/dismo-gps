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
          logger.info(`Sesión establecida para usuario ID: ${user.id}`);
          res.redirect('/main');
        } else {
          res.status(401).send('Credenciales incorrectas');
        }
      } else {
        res.status(401).send('Credenciales incorrectas');
      }
    } catch (err) {
      logger.error(`Error al iniciar sesión: ${err.message}`);
      res.status(500).send('Error al iniciar sesión');
    }
  }
];