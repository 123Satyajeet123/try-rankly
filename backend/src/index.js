const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const mongoose = require('mongoose');
require('dotenv').config();

// Import passport after dotenv config
const passport = require('./config/passport');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting - More lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased from 100)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for development
  skip: (req) => {
    return process.env.NODE_ENV === 'development' && req.ip === '127.0.0.1';
  }
});

// Apply rate limiting to all routes except auth in development
if (process.env.NODE_ENV === 'production') {
  app.use(limiter);
} else {
  // In development, only apply to non-auth routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/auth')) {
      return next(); // Skip rate limiting for auth routes in development
    }
    return limiter(req, res, next);
  });
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session configuration for OAuth
app.use(session({
  secret: process.env.JWT_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rankly')
.then(async () => {
  console.log('✅ MongoDB connected');
  
  // Run startup cleanup to ensure database integrity
  try {
    const dataCleanupService = require('./services/dataCleanupService');
    console.log('\n🧹 Running startup cleanup...');
    await dataCleanupService.cleanOrphanedPrompts();
    await dataCleanupService.cleanOrphanedTestResults();
    console.log('✅ Startup cleanup complete\n');
  } catch (cleanupError) {
    console.error('⚠️  Startup cleanup failed (non-critical):', cleanupError.message);
  }
})
.catch(err => console.error('❌ MongoDB connection error:', err));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Rankly Backend API',
    version: '1.0.0',
    description: 'Multi-LLM GEO/AEO Platform Backend',
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth/*',
      user: '/api/user/*',
      onboarding: '/api/onboarding/*',
      competitors: '/api/competitors/*',
      topics: '/api/topics/*',
      personas: '/api/personas/*',
      prompts: '/api/prompts/*',
      cleanup: '/api/cleanup/*',
      metrics: '/api/metrics/*',
      analytics: '/api/analytics/*',
      urlAnalysis: '/api/url-analysis/*'
    },
    status: 'Development - Ready for implementation'
  });
});

// Import routes
const authRoutes = require('./routes/auth');
const onboardingRoutes = require('./routes/onboarding');
const competitorRoutes = require('./routes/competitors');
const topicRoutes = require('./routes/topics');
const personaRoutes = require('./routes/personas');
const promptRoutes = require('./routes/prompts');
const cleanupRoutes = require('./routes/cleanup');
const metricsRoutes = require('./routes/metrics');
const analyticsRoutes = require('./routes/analytics');
const urlAnalysisRoutes = require('./routes/urlAnalysis');
const clustersRoutes = require('./routes/clusters');
const insightsRoutes = require('./routes/insights');
const dashboardMetricsRoutes = require('./routes/dashboardMetrics');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/competitors', competitorRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/personas', personaRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/cleanup', cleanupRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/url-analysis', urlAnalysisRoutes);
app.use('/api/clusters', clustersRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/dashboard', dashboardMetricsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /health',
      'GET /api',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/user/profile',
      'GET /api/onboarding',
      'GET /api/competitors',
      'GET /api/topics',
      'GET /api/personas',
      'GET /api/prompts',
      'GET /api/analytics/*',
      'GET /api/dashboard/all'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Rankly Backend API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API info: http://localhost:${PORT}/api`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

module.exports = app;
