var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var favicon = require('serve-favicon');
require('dotenv').config();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./tests/swaggerOptions');
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

var app = express();

// CORS - cho phép frontend truy cập
app.use(cors({
    origin: [
        'http://localhost:3000', 
        'http://localhost:3001',
        'http://3.93.248.130:3000',
        'http://3.93.248.130:3001',
        // Thêm domain frontend của bạn ở đây
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
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
if (process.env.NODE_ENV === 'development') {
    app.use('/auth', debugMiddleware);
}

// Routes
app.use('/', indexRouter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
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
