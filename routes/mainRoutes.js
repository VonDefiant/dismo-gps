const express = require('express');
const router = express.Router();
const path = require('path');

// Middleware para verificar autenticación
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/login');
};

// Ruta para servir la página principal
router.get('/', isAuthenticated, (req, res) => {
    try {
        res.sendFile(path.join(__dirname, '../public', 'main.html'));
    } catch (err) {
        console.error('Error al servir main.html:', err.message);
        res.status(500).send('Error al cargar la página principal');
    }
});

module.exports = router;
