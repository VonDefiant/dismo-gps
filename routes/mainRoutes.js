const express = require('express');
const router = express.Router();

// Ruta de bienvenida
router.get('/welcome', (req, res) => {
    res.send('¡Bienvenido a DISMO-APP!');
});

module.exports = router;
