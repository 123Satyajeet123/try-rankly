/**
 * GA4 Session Parser Middleware
 * Parses and validates ga4_session cookie
 */

/**
 * Parse GA4 session from cookie
 * @param {Object} req - Express request object
 * @returns {Object|null} Parsed session or null
 */
function parseGA4Session(req) {
  const ga4SessionCookie = req.cookies?.ga4_session;
  
  if (!ga4SessionCookie) {
    return null;
  }

  try {
    const decoded = Buffer.from(ga4SessionCookie, 'base64').toString('utf8');
    const session = JSON.parse(decoded);
    
    // Validate session structure
    if (!session.userId || !session.accessToken || !session.refreshToken) {
      return null;
    }
    
    // Check expiry
    if (session.expiresAt && Date.now() > session.expiresAt) {
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Error parsing GA4 session:', error);
    return null;
  }
}

/**
 * Middleware to parse and validate GA4 session
 */
function ga4SessionMiddleware(req, res, next) {
  const session = parseGA4Session(req);
  
  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'No valid GA4 session found'
    });
  }
  
  // Attach session to request
  req.ga4Session = session;
  next();
}

module.exports = {
  parseGA4Session,
  ga4SessionMiddleware
};

