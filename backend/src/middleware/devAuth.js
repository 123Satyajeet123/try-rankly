/**
 * Development Authentication Middleware
 * Bypasses JWT authentication and sets a default userId for development
 */

const devAuth = (req, res, next) => {
  // Set a default userId for development
  // You can change this to any valid MongoDB ObjectId from your database
  req.userId = '68f362f27979b83b67e50834'; // Default user ID for development
  
  console.log(`🔧 [DEV AUTH] Using default userId: ${req.userId}`);
  next();
};

module.exports = devAuth;
