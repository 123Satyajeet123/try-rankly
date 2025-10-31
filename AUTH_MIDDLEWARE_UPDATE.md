# Authentication Middleware Update

## Summary

All routes have been updated to use proper JWT authentication middleware instead of the development-only `devAuth` middleware.

## Changes Made

### Created New Authentication Middleware
- **File**: `backend/src/middleware/auth.js`
- **Features**:
  - Proper JWT token verification
  - Development mode bypass option (via `DEV_AUTH_BYPASS=true` env var)
  - Uses centralized error handling
  - Supports optional authentication for public endpoints

### Replaced devAuth in All Routes

All route files now use `authenticateToken` from the centralized auth middleware:

**Updated Routes:**
- ✅ `routes/onboarding.js` - 8 routes updated
- ✅ `routes/prompts.js` - 11 routes updated
- ✅ `routes/competitors.js` - 4 routes updated
- ✅ `routes/topics.js` - 4 routes updated
- ✅ `routes/personas.js` - 4 routes updated
- ✅ `routes/metrics.js` - 7 routes updated
- ✅ `routes/urlAnalysis.js` - 3 routes updated
- ✅ `routes/clusters.js` - 2 routes updated
- ✅ `routes/dashboardMetrics.js` - 2 routes updated
- ✅ `routes/insights.js` - 5 routes updated
- ✅ `routes/citations.js` - 4 routes updated
- ✅ `routes/sentimentBreakdown.js` - 1 route updated
- ✅ `routes/subjectiveMetrics.js` - 6 routes updated
- ✅ `routes/analytics.js` - Already had proper auth, consolidated to use shared middleware
- ✅ `routes/cleanup.js` - Already had proper auth, consolidated to use shared middleware

**Total**: ~60+ routes now using proper authentication

## Development Mode

For development testing, you can enable authentication bypass by setting:

```bash
# In backend/.env
NODE_ENV=development
DEV_AUTH_BYPASS=true
DEV_USER_ID=your-user-id-here  # Optional: set default user ID
```

**Note**: Authentication bypass only works when `NODE_ENV=development`. In production, authentication is always required.

## Production Behavior

In production (`NODE_ENV=production`):
- ✅ All routes require valid JWT token
- ✅ Tokens are verified using `JWT_SECRET`
- ✅ Invalid/expired tokens return 401 errors
- ✅ Missing tokens return 401 errors

## Migration Notes

### Before
```javascript
const devAuth = require('../middleware/devAuth');
router.get('/', devAuth, async (req, res) => {
  // Uses hardcoded userId: '69027b7270fb65c760d81897'
});
```

### After
```javascript
const { authenticateToken } = require('../middleware/auth');
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  // Uses req.userId from verified JWT token
}));
```

## Security Improvements

1. **Proper Authentication**: All routes now verify JWT tokens
2. **Centralized Error Handling**: Auth errors use the error handler middleware
3. **Consistent Behavior**: Same auth logic across all routes
4. **Production Ready**: No authentication bypass in production
5. **Better Error Messages**: User-friendly auth error messages

## Testing

To test authentication:
1. **Without token**: Should return 401 with "No token provided"
2. **With invalid token**: Should return 401 with "Invalid token"
3. **With expired token**: Should return 401 with "Token expired"
4. **With valid token**: Should proceed normally

## Environment Variables

Required for production:
- `JWT_SECRET` - Secret key for signing/verifying tokens
- `JWT_EXPIRES_IN` - Token expiration (default: '7d')

Optional for development:
- `DEV_AUTH_BYPASS=true` - Enable auth bypass in dev mode
- `DEV_USER_ID` - Default user ID when bypass is enabled

