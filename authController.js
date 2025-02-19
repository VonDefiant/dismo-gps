const bcrypt = require('bcryptjs');
const pool = require('./db');
const { logger } = require('./logger'); // ✅ Importamos el logger correctamente
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
    logger.info(`🟢 Intentando iniciar sesión para: ${username}`);

    try {
      // 🔍 Buscar el usuario en la base de datos (incluye isAdmin)
      const result = await pool.query(
        'SELECT id, password, isAdmin FROM users WHERE username = $1',
        [username]
      );

      if (result.rows.length === 0) {
        logger.warn(`❌ Usuario no encontrado: ${username}`);
        return res.status(404).send('Credenciales incorrectas');
      }

      const user = result.rows[0];

      // 🔑 Comparar contraseñas con bcrypt
      const isValid = await bcrypt.compare(password, user.password);

      if (!isValid) {
        logger.warn(`🔑 Contraseña incorrecta para usuario: ${username}`);
        return res.status(401).send('Credenciales incorrectas');
      }

      // ✅ Iniciar sesión
      req.session.userId = user.id;
      req.session.isAdmin = user.isadmin; // PostgreSQL devuelve en minúsculas
      logger.info(`✅ Sesión iniciada para ${username} (Admin: ${user.isadmin})`);
      
      res.redirect('/main');
    } catch (err) {
      logger.error(`❌ Error al iniciar sesión para ${username}: ${err.message}`);
      res.status(500).send('Error al iniciar sesión');
    }
  }
];
