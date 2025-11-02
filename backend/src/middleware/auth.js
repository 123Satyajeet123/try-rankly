/**
 * JWT Authentication Middleware
 * Verifies JWT tokens from Authorization header
 * 
 * Authentication Flow:
 * 1. User logs in via Google OAuth (routes/auth.js)
 * 2. Backend creates/finds User in MongoDB (config/passport.js)
 * 3. JWT token generated with user._id (routes/auth.js generateToken)
 * 4. Frontend stores token and sends in Authorization: Bearer <token> header
 * 5. This middleware extracts userId from JWT token
 * 6. All API routes use req.userId which comes from authenticated user
 * 
 * ⚠️ PRODUCTION: DEV_AUTH_BYPASS must be false or unset in production!
 */

const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('./errorHandler');

/**
 * Authenticate JWT token from Authorization header
 * Sets req.userId if token is valid
 * 
 * userId comes from JWT token created during Google OAuth login
 */
const authenticateToken = (req, res, next) => {
  // ⚠️ DEVELOPMENT ONLY: Allow bypass with NODE_ENV=development and DEV_AUTH_BYPASS=true
  // ⚠️ WARNING: This bypass is ONLY for development! NEVER enable DEV_AUTH_BYPASS=true in production!
  // In production, NODE_ENV must be 'production' which prevents this bypass from working
  if (process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true') {
    console.warn('⚠️ [AUTH] Development mode: Authentication bypassed (DEV_AUTH_BYPASS=true)');
    console.warn('⚠️ [AUTH] ⚠️ THIS MUST BE DISABLED IN PRODUCTION! ⚠️');
    
    // Use default userId if provided, otherwise require token
    req.userId = process.env.DEV_USER_ID || null;
    if (!req.userId) {
      // Still try to get token in dev mode
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          req.userId = decoded.userId;
          console.log('✅ [AUTH] Using userId from JWT token:', req.userId);
        } catch (error) {
          // In dev mode with bypass, use fallback
          return next(new AuthenticationError('Invalid token in development mode'));
        }
      } else {
        return next(new AuthenticationError('No token provided and DEV_USER_ID not set'));
      }
    } else {
      console.warn('⚠️ [AUTH] Using DEV_USER_ID from environment (bypass mode)');
    }
    return next();
  }

  // Production: Require valid token
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    console.warn(`⚠️ [AUTH] No token provided for ${req.method} ${req.path} from IP: ${req.ip}`);
    return next(new AuthenticationError('No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    
    if (!req.userId) {
      console.error(`❌ [AUTH] Token verified but no userId found in decoded token:`, decoded);
      return next(new AuthenticationError('Invalid token: no userId'));
    }
    
    // Log successful authentication (userId comes from JWT token created during Google OAuth)
    console.log(`✅ [AUTH] Authenticated user: ${req.userId} (from JWT token) for ${req.method} ${req.path}`);
    
    next();
  } catch (error) {
    // Log the actual error for debugging
    console.error(`❌ [AUTH] JWT verification failed for ${req.method} ${req.path}:`, {
      errorName: error.name,
      errorMessage: error.message,
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      ip: req.ip
    });
    
    if (error.name === 'TokenExpiredError') {
      return next(new AuthenticationError('Token expired'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new AuthenticationError(`Invalid token: ${error.message}`));
    }
    return next(new AuthenticationError(`Token verification failed: ${error.message}`));
  }
};

/**
 * Optional authentication - doesn't fail if no token, but sets userId if token exists
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // Continue without authentication
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
  } catch (error) {
    // Ignore errors for optional auth - just don't set userId
  }
  
  next();
};

module.exports = {
  authenticateToken,
  optionalAuth,
};







