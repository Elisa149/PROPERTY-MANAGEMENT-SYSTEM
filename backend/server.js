const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import Firebase Admin
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 5001;

// Initialize Firebase Admin SDK FIRST
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`,
  });
}

// Import routes AFTER Firebase is initialized
const propertyRoutes = require('./routes/properties');
const rentRoutes = require('./routes/rent');
const paymentRoutes = require('./routes/payments');
const authRoutes = require('./routes/auth');
const tenantRoutes = require('./routes/tenants');
const organizationsRoutes = require('./routes/organizations');
const usersRoutes = require('./routes/users');

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:3002',  // Added port 3002
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',  // Added port 3002
    /^http:\/\/192\.168\.\d+\.\d+:300[0-5]$/,  // Allow network IPs (expanded range)
    /^http:\/\/172\.\d+\.\d+\.\d+:300[0-5]$/,  // Allow Docker/VM IPs (expanded range)
  ],
  credentials: true,
}));
app.use(morgan('combined'));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/rent', rentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/organizations', organizationsRoutes);
app.use('/api/users', usersRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
