var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var favicon = require('serve-favicon');
require('dotenv').config();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./tests/swagger/swaggerOptions');
const connectDB = require('./configs/dbConfig');
const cors = require('cors');
const debugMiddleware = require('./middlewares/debugMiddleware');

var indexRouter = require('./routes/index');
const authRoutes = require('./routes/authRoutes');
const userRouters = require('./routes/userRouters');
const blogRoutes = require('./routes/blogRouters');
const userAlbumRoutes = require('./routes/userAlbumRouters');
const albumImageRoutes = require('./routes/albumImageRouters');
const ratingRoutes = require('./routes/ratingRouters');
const reportRouters = require('./routes/reportRoters');
const travelInfoRoutes = require('./routes/travelInfoRouters');
const matchUserRouters = require('./routes/matchUserRouters');
const chatRouters = require('./routes/chatRouters');
const travelPlanRouters = require('./routes/travelPlanRouters');
const notificationRouters = require('./routes/notificationRouters');
const connectionRouters = require('./routes/connectionRouters');
const testRoutes = require('./routes/testRoutes');

var app = express();

// CORS - allow frontend access
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      // Production origins
      'https://your-frontend-domain.com',
      'https://www.your-frontend-domain.com',
      'https://travelmate-fe-web.vercel.app',
      'http://3.93.248.130'
    ]
  : [
      // Development origins
      'http://localhost:3000', 
      'http://localhost:3001',
      'http://localhost:5173', // Vite dev server
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://3.93.248.130:3000',
      'http://3.93.248.130:3001',
      'https://travelmate-fe-web.vercel.app',
      'http://3.93.248.130'
    ];

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie']
}));

// Handle preflight requests explicitly
app.options('*', cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie']
}));

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '20mb' })); // Set limit for JSON data
app.use(express.urlencoded({ extended: true, limit: '20mb' })); // Set limit for form data

// Connect to MongoDB
connectDB();

// Debug middleware (only in development)
// if (process.env.NODE_ENV === 'development') {
//     app.use('/auth', debugMiddleware);
// }

// Routes
app.use('/', indexRouter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/test', testRoutes); // Add test routes for debugging
app.use('/auth', authRoutes);
app.use('/users', userRouters);
app.use('/blog', blogRoutes);
app.use('/userAlbum', userAlbumRoutes);
app.use('/albumImage', albumImageRoutes);
app.use('/rating', ratingRoutes);
app.use('/report', reportRouters);
app.use('/travelInfo', travelInfoRoutes);
app.use('/matchUser', matchUserRouters);
app.use('/chat', chatRouters);
app.use('/travelPlan', travelPlanRouters);
app.use('/notifications', notificationRouters);
app.use('/connections', connectionRouters);

module.exports = app;
