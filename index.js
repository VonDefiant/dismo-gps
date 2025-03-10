require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const mainRoutes = require('./routes/mainRoutes');
const coordinatesRoutes = require('./routes/coordinatesRoutes');
const salesRoutes = require('./routes/salesRoutes');
const adminRoutes = require('./routes/adminRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const firebaseRoutes = require('./routes/firebaseRoutes'); // Importación correcta

// Middleware para sesiones
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,  
    saveUninitialized: true,
}));

// Middleware para archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para parsear datos
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Ruta por defecto
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Rutas públicas
app.use('/auth', authRoutes);
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Middlewares de autenticación
function isAuthenticated(req, res, next) {
    if (req.path.startsWith('/coordinates') && req.method === 'POST') {
        return next();
    }
    if (req.session.userId) {
        return next();
    } else {
        res.redirect('/login');
    }
}

function isAdminAuthenticated(req, res, next) {
    if (req.session.userId && req.session.isAdmin) {
        next();
    } else {
        res.status(403).send('Acceso restringido a administradores');
    }
}

// Rutas protegidas
app.use('/device', deviceRoutes);
app.use('/api', firebaseRoutes); // Usa el nombre correcto
app.use('/main', isAuthenticated, mainRoutes);
app.use('/admin', isAdminAuthenticated, adminRoutes); // Usa el middleware de admin
app.use('/coordinates', coordinatesRoutes);
app.use('/sales', salesRoutes);

// Rutas para archivos estáticos
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/scripts', express.static(path.join(__dirname, 'public/scripts')));

// Cerrar sesión
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        res.redirect('/login');
    });
});

// Iniciar servidor
const PORT = process.env.PORT || 5006;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});