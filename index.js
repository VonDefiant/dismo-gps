require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

const authRoutes = require('./routes/authRoutes');
const mainRoutes = require('./routes/mainRoutes');
const coordinatesRoutes = require('./routes/coordinatesRoutes');

// Middleware para sesiones
app.use(session({
    secret: 'f3b8b1a8b0315bc094341302b7e3d761c8ee78944557f8a36283c9efb82694505718bfebdd8b073558b9c8af4ede0c22342934d95a620bc7',
    resave: false,
    saveUninitialized: true,
}));

// Middleware para servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para parsear cuerpos de solicitud JSON y URL-encoded
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Redirigir todas las solicitudes a la raíz al login
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Rutas de autenticación
app.set('trust proxy', 1);
app.use('/auth', authRoutes);

// Ruta para mostrar el formulario de login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Middleware para verificar la autenticación
function isAuthenticated(req, res, next) {
    // Permitir POST a /coordinates sin autenticación
    if (req.path === '/coordinates' && req.method === 'POST') {
        return next();
    }

    // Para todas las demás rutas, verificar la sesión
    if (req.session.userId) {
        return next();
    } else {
        res.redirect('/login');
    }
}


// Rutas principales protegidas por autenticación
app.use('/main', isAuthenticated, mainRoutes);

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

// Rutas de coordenadas
app.use('/coordinates', coordinatesRoutes);

const PORT = process.env.PORT || 5006;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
