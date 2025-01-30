const csrf = require('csurf');

exports.csrfProtection = csrf({
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    }
});