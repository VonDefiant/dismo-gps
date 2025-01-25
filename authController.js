const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('./db');

exports.login = async (req, res) => {
    const { username, password } = req.body;
    console.log("Intentando iniciar sesión para:", username);
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        console.log("Usuario encontrado:", result.rows.length > 0);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const isValid = await bcrypt.compare(password, user.password);
            console.log("Contraseña válida:", isValid);
            if (isValid) {
                req.session.userId = user.id;  // Establecer el ID del usuario en la sesión
                console.log("Sesión establecida para usuario ID:", user.id);
                res.redirect('/main');  // Redirigir al usuario a la página principal
            } else {
                res.status(401).send('Contraseña incorrecta');
            }
        } else {
            res.status(404).send('Usuario no encontrado');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al iniciar sesión');
    }
};
