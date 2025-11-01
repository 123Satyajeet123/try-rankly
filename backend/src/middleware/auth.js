/**
 * JWT Authentication Middleware
 * Verifies JWT tokens from Authorization header
 */

const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('./errorHandler');

/**
 * Authenticate JWT token from Authorization header
 * Sets req.userId if token is valid
 */
const authenticateToken = (req, res, next) => {
  // In development, allow bypass with NODE_ENV=development and DEV_AUTH_BYPASS=true
  if (process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true') {
    console.warn('⚠️ [AUTH] Development mode: Authentication bypassed (DEV_AUTH_BYPASS=true)');
    // Use default userId if provided, otherwise require token
    req.userId = process.env.DEV_USER_ID || null;
    if (!req.userId) {
      // Still try to get token in dev mode
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          req.userId = decoded.userId;
        } catch (error) {
          // In dev mode with bypass, use fallback
          return next(new AuthenticationError('Invalid token in development mode'));
        }
      } else {
        return next(new AuthenticationError('No token provided and DEV_USER_ID not set'));
      }
    }
    return next();
  }

  // Production: Require valid token
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return next(new AuthenticationError('No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    
    if (!req.userId) {
      return next(new AuthenticationError('Invalid token: no userId'));
    }
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AuthenticationError('Token expired'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new AuthenticationError('Invalid token'));
    }
    return next(new AuthenticationError('Token verification failed'));
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





