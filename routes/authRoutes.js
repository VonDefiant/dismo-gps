const express = require('express');
const { login } = require('../authController');
const path = require('path');
const router = express.Router();

// Ruta para servir la página de login
router.get('/login', (req, res) => {
    try {
        // Redirige si el usuario ya está autenticado
        if (req.session && req.session.userId) {
            return res.redirect('/main');
        }

        res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
    } catch (err) {
        console.error('[ERROR] No se pudo servir la página de login:', err.message);
        res.status(500).send('Error al cargar la página de inicio de sesión');
    }
});

// Ruta para manejar la lógica de login
router.post('/login', login);

module.exports = router;
