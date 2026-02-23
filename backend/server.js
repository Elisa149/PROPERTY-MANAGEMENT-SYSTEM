const express = require('express');
const path = require('path');
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
const invoiceRoutes = require('./routes/invoices');
const authRoutes = require('./routes/auth');
const tenantRoutes = require('./routes/tenants');
const organizationsRoutes = require('./routes/organizations');
const usersRoutes = require('./routes/users');
const systemRoutes = require('./routes/system');

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
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    /^http:\/\/192\.168\.\d+\.\d+:300[0-5]$/,
    /^http:\/\/172\.\d+\.\d+\.\d+:300[0-5]$/,
    // Vercel (production + preview deployments)
    /^https:\/\/[\w.-]+\.vercel\.app$/,
  ],
  credentials: true,
}));
app.use(morgan('combined'));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// On Vercel: serve built frontend from public/ and SPA fallback
if (process.env.VERCEL) {
  const publicDir = path.join(__dirname, '..', 'public');
  app.use(express.static(publicDir));
}

// Root route (API info; on Vercel, / is served by static index.html)
app.get('/api', (req, res) => {
  res.json({
    message: 'Property Management System API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      properties: '/api/properties',
      tenants: '/api/tenants',
      rent: '/api/rent',
      payments: '/api/payments',
      invoices: '/api/invoices',
      organizations: '/api/organizations',
      users: '/api/users',
      system: '/api/system'
    }
  });
});

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
app.use('/api/invoices', invoiceRoutes);
app.use('/api/organizations', organizationsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/system', systemRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});

// SPA fallback on Vercel: non-API GET requests serve index.html
if (process.env.VERCEL) {
  app.get('*', (req, res, next) => {
    if (!req.path.startsWith('/api')) {
      return res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    }
    next();
  });
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// On Vercel, the app is run as a serverless function; do not call listen().
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;
