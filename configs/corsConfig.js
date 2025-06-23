// Alternative CORS config for development that accepts any origin
const corsConfigDev = {
    origin: function (origin, callback) {
        // In development, accept any origin
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie']
};

const corsConfigProd = {
    origin: [
        'https://yourdomain.com',
        'https://www.yourdomain.com'
        // Add your production domains here
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie']
};

module.exports = {
    corsConfigDev,
    corsConfigProd
};
