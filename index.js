require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

const authRoutes = require('./routes/authRoutes');
const mainRoutes = require('./routes/mainRoutes');
const coordinatesRoutes = require('./routes/coordinatesRoutes');

// Middleware para servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para parsear cuerpos de solicitud JSON
app.use(express.urlencoded({ extended: true }));

exports.login = async (req, res) => {
    console.log("Datos recibidos:", req.body); // Esto mostrará los datos recibidos
    const { username, password } = req.body;

    // Aquí continúa tu lógica de autenticación
};


// Redirigir todas las solicitudes a la raíz al login
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Rutas de autenticación
app.use('/auth', authRoutes);

// Ruta para mostrar el formulario de login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Rutas principales
app.use(mainRoutes);

app.use(express.urlencoded({ extended: true }));  // Middleware para parsear formularios


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
