const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.send('¡Bienvenido a DISMO-GPS!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
