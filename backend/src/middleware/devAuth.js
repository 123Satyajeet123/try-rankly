/**
 * DEPRECATED: Development Authentication Middleware
 * 
 * ⚠️ WARNING: This middleware is deprecated and should NOT be used.
 * It hardcodes a userId which bypasses proper authentication.
 * 
 * All routes should use authenticateToken from middleware/auth.js instead,
 * which correctly extracts userId from JWT tokens created during Google OAuth login.
 * 
 * The userId is set by:
 * 1. Google OAuth creates/finds user in MongoDB (via passport.js)
 * 2. JWT token is generated with user._id (via routes/auth.js generateToken)
 * 3. Frontend stores token and sends in Authorization header
 * 4. authenticateToken middleware extracts userId from JWT token
 */

const devAuth = (req, res, next) => {
  console.error('❌ [DEPRECATED] devAuth middleware should not be used!');
  console.error('❌ Use authenticateToken from middleware/auth.js instead');
  console.error('❌ This ensures userId comes from authenticated user, not hardcoded value');
  
  // Still allow for backwards compatibility in extreme cases, but warn heavily
  req.userId = '69027b7270fb65c760d81897'; // Default user ID for development
  
  console.warn(`⚠️ [DEV AUTH] Using hardcoded userId: ${req.userId} - THIS IS NOT PROPER AUTHENTICATION`);
  next();
};

module.exports = devAuth;
