/**
 * Development Authentication Middleware
 * Bypasses JWT authentication and sets a default userId for development
 */

const devAuth = (req, res, next) => {
  // Set a default userId for development
  // You can change this to any valid MongoDB ObjectId from your database
  req.userId = '69027b7270fb65c760d81897'; // Default user ID for development
  
  console.log(`🔧 [DEV AUTH] Using default userId: ${req.userId}`);
  next();
};

module.exports = devAuth;
