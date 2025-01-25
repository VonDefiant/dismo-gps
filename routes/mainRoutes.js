const express = require('express');
const router = express.Router();
const path = require('path');  // Asegúrate de que esta línea está presente

router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'main.html'));  // Asegúrate de que la ruta está bien escrita
});

module.exports = router;
