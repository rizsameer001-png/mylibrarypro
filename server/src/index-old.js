require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const cron = require('node-cron');


const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');
const { scheduleJobs } = require('./utils/scheduler');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const bookRoutes = require('./routes/books');
const categoryRoutes = require('./routes/categories');
const authorRoutes = require('./routes/authors');
const publisherRoutes = require('./routes/publishers');
const circulationRoutes = require('./routes/circulation');
const membershipRoutes = require('./routes/memberships');
const penaltyRoutes = require('./routes/penalties');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/reports');
const cmsRoutes = require('./routes/cms');
const dashboardRoutes = require('./routes/dashboard');
const galleryRoutes = require('./routes/gallery');
const digitalRoutes  = require('./routes/digital');
const cloudinaryRoutes = require('./routes/cloudinary');

const app = express();

// Connect to Database
connectDB();

// Security Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/authors', authorRoutes);
app.use('/api/publishers', publisherRoutes);
app.use('/api/circulation', circulationRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/penalties', penaltyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/books/:id/gallery', galleryRoutes);
app.use('/api/digital', digitalRoutes);
app.use('/api/cloudinary', cloudinaryRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error Handler (must be last)
app.use(errorHandler);

// Schedule automated jobs
scheduleJobs();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 LMS Server running on port ${PORT}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 API: http://localhost:${PORT}/api\n`);
});

module.exports = app;
