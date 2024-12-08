require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const mainRoutes = require('./routes/mainRoutes');
const coordinatesRoutes = require('./routes/coordinatesRoutes');
const coordinatesRoutes2 = require('./routes/coordinatesRoutes2'); // Segundo GPS

// Middleware para sesiones
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,  
    saveUninitialized: true,
}));

// Middleware para servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para servir archivos del segundo GPS
app.use('/gps2', express.static(path.join(__dirname, 'public', 'gps2')));

// Middleware para parsear cuerpos de solicitud JSON y URL-encoded
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Ruta por defecto para redirigir al login o a la vista correspondiente
app.get('/', (req, res) => {
    res.redirect('/login'); // Por defecto, redirige al login
});

// Rutas de autenticación
app.set('trust proxy', 1);
app.use('/auth', authRoutes);

// Ruta para mostrar el formulario de login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Middleware para verificar autenticación
function isAuthenticated(req, res, next) {
    if ((req.path.startsWith('/coordinates') || req.path.startsWith('/coordinates2')) && req.method === 'POST') {
        return next();
    }
    if (req.session.userId) {
        return next();
    } else {
        res.redirect('/login');
    }
}

// Rutas principales protegidas por autenticación
app.use('/main', isAuthenticated, mainRoutes);

// Rutas de coordenadas del GPS principal (requiere autenticación)
app.use('/coordinates', coordinatesRoutes);

// Rutas de coordenadas del GPS 2 (sin autenticación)
app.use('/coordinates2', coordinatesRoutes2);

// Ruta para mostrar la interfaz de GPS 2 sin autenticación
app.get('/gps2', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'gps2', 'main2.html'));
});

// Ruta para cerrar sesión
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
            return res.status(500).send('No se pudo cerrar la sesión');
        }
        res.redirect('/login');
    });
});

// Servidor escucha en el puerto 5006 o en el puerto de Heroku
const PORT = process.env.PORT || 5006;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
