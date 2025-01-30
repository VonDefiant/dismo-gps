const express = require('express');
const router = express.Router();
const path = require('path');
const { login } = require('../authController');

// Ruta GET para login
router.get('/login', (req, res) => {
    try {
        if (req.session.userId) {
            return res.redirect('/main');
        }
        res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
    } catch (error) {
        console.error('Error serving login page:', error);
        res.status(500).send('Error loading login page');
    }
});

// Ruta POST para login
router.post('/login', login);

// Ruta para logout
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        res.redirect('/login');
    });
});

module.exports = router;