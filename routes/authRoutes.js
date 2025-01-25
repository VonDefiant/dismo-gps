const express = require('express');
const { login } = require('../authController');
const path = require('path');
const router = express.Router();

// Ruta para servir la página de login
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

router.post('/login', login);

module.exports = router;
