const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('./db');
const { validationResult } = require('express-validator');

exports.login = async (req, res) => {
    const { username, password } = req.body;

    // Validación de entradas
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            // No revelar si el usuario existe o no
            return res.status(401).send('Credenciales inválidas');
        }

        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            // No revelar si el problema es con el usuario o la contraseña
            return res.status(401).send('Credenciales inválidas');
        }

        // Establecer sesión
        req.session.userId = user.id;

        res.status(200).json({
            success: true,
            message: 'Inicio de sesión exitoso',
            user: { id: user.id, username: user.username },
        });
    } catch (err) {
        console.error('Error al iniciar sesión:', err.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
