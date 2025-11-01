# Deployment Environment & CORS Fixes Summary

## Overview

All environment variables, URLs, and CORS configurations have been updated to be production-ready and deployment-safe.

---

## Fixed Issues

### 1. CORS Configuration Improvements

**File**: `backend/src/index.js`

**Changes**:
- ✅ Enhanced CORS origin validation
- ✅ Support for multiple origins via `ALLOWED_ORIGINS`
- ✅ Wildcard subdomain support (`*.yourdomain.com`)
- ✅ Better error logging for blocked origins
- ✅ Production validation warning for missing `FRONTEND_URL`
- ✅ Added preflight cache (24 hours)
- ✅ Additional allowed methods and headers

**Features**:
- Development: Allows all origins (for testing)
- Production: Strict origin validation
- Supports comma-separated multiple origins
- Supports wildcard subdomain patterns

### 2. Environment Variable Validation

**File**: `backend/src/index.js`

**Changes**:
- ✅ `JWT_SECRET` must be 32+ characters in production (server won't start if invalid)
- ✅ Warning if `FRONTEND_URL` missing in production
- ✅ All OAuth redirects use `FRONTEND_URL` with fallbacks

### 3. OAuth Redirect URLs

**Files**: 
- `backend/src/routes/auth.js`
- `backend/src/routes/ga4Auth.js`

**Changes**:
- ✅ All redirects use `process.env.FRONTEND_URL` with safe fallbacks
- ✅ No hardcoded `localhost` URLs in production code
- ✅ Proper error handling for missing environment variables

### 4. OpenRouter Referer Headers

**Files**:
- `backend/src/services/promptTestingService.js`
- `backend/src/services/promptGenerationService.js`
- `backend/src/services/websiteAnalysisService.js` (already had env var)
- `backend/src/services/subjectiveMetricsService.js` (already had env var)

**Changes**:
- ✅ All `HTTP-Referer` headers use `OPENROUTER_REFERER` env var
- ✅ Falls back to `FRONTEND_URL` if not set
- ✅ No hardcoded referer URLs

### 5. Cookie Configuration

**Files**:
- `backend/src/index.js` (main session cookie)
- `backend/src/routes/ga4Auth.js` (GA4 session cookie)

**Changes**:
- ✅ `sameSite: 'none'` in production (for cross-site cookies with HTTPS)
- ✅ `sameSite: 'lax'` in development
- ✅ `domain` support via `COOKIE_DOMAIN` env var
- ✅ Secure cookies in production only

---

## Environment Variables Required for Production

### Backend (`backend/.env`)

#### Critical (Must Set)
```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
FRONTEND_URL=https://yourdomain.com
JWT_SECRET=<32+ character secret>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
GA4_CLIENT_ID=...
GA4_CLIENT_SECRET=...
GA4_REDIRECT_URI=https://yourdomain.com/api/auth/ga4/callback
OPENROUTER_API_KEY=...
```

#### Optional
```bash
# For multiple domains
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# For subdomain cookies
COOKIE_DOMAIN=.yourdomain.com

# Custom OpenRouter referer
OPENROUTER_REFERER=https://yourdomain.com
```

### Frontend (`.env.production.local`)

```bash
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

---

## CORS Behavior

### Development Mode
- ✅ Allows all origins (for local development)
- ✅ Relaxed CORS for easier testing

### Production Mode
- ✅ Strict origin validation
- ✅ Only allowed origins accepted
- ✅ Logs blocked origins for debugging
- ✅ Supports multiple origins via `ALLOWED_ORIGINS`
- ✅ Supports wildcard subdomains (`*.yourdomain.com`)

---

## OAuth Configuration

### User OAuth (Google Sign-In)

**Required Settings**:
1. Google Cloud Console → OAuth 2.0 Client
2. Authorized JavaScript origins: `https://yourdomain.com`
3. Authorized redirect URIs: `https://yourdomain.com/api/auth/google/callback`
4. Set `GOOGLE_CALLBACK_URL` in `.env` to match

### GA4 OAuth (Analytics)

**Required Settings**:
1. Google Cloud Console → GA4 OAuth 2.0 Client
2. Authorized JavaScript origins: `https://yourdomain.com`
3. Authorized redirect URIs: `https://yourdomain.com/api/auth/ga4/callback`
4. Set `GA4_REDIRECT_URI` in `.env` to match

---

## Validation on Startup

The backend now validates:

1. **JWT_SECRET**: Must be 32+ characters in production (exits if invalid)
2. **FRONTEND_URL**: Warning if missing in production
3. **MongoDB**: Connection retry with graceful degradation

---

## Files Modified

### Backend
- ✅ `backend/src/index.js` - CORS, session, validation
- ✅ `backend/src/routes/auth.js` - OAuth redirects
- ✅ `backend/src/routes/ga4Auth.js` - GA4 OAuth redirects, cookies
- ✅ `backend/src/services/promptTestingService.js` - OpenRouter referer
- ✅ `backend/src/services/promptGenerationService.js` - OpenRouter referer

### Documentation
- ✅ `ENV_CONFIGURATION_GUIDE.md` - Complete environment guide
- ✅ `DEPLOYMENT_ENV_CHECKLIST.md` - Quick checklist
- ✅ `backend/.env.production.example` - Production env template

---

## Testing Checklist

After deployment:

- [ ] Backend starts without errors
- [ ] Frontend connects to backend API
- [ ] No CORS errors in browser console
- [ ] OAuth login works (Google)
- [ ] GA4 OAuth works (Analytics)
- [ ] Sessions persist (cookies working)
- [ ] API calls include credentials
- [ ] Environment variables validated on startup

---

## Common Deployment Scenarios

### Same Domain Setup
```bash
# Frontend and backend on same domain
FRONTEND_URL=https://rankly.ai
NEXT_PUBLIC_API_URL=https://rankly.ai/api
# Nginx proxies /api to backend
```

### Separate API Subdomain
```bash
# Frontend: https://rankly.ai
# Backend API: https://api.rankly.ai
FRONTEND_URL=https://rankly.ai
ALLOWED_ORIGINS=https://rankly.ai,https://www.rankly.ai
NEXT_PUBLIC_API_URL=https://api.rankly.ai/api
COOKIE_DOMAIN=.rankly.ai
```

### Multiple Frontend Domains
```bash
# Support multiple domains
FRONTEND_URL=https://rankly.ai
ALLOWED_ORIGINS=https://rankly.ai,https://www.rankly.ai,https://app.rankly.ai
```

---

## Security Improvements

1. ✅ **No hardcoded URLs** - All URLs use environment variables
2. ✅ **Production validation** - Server validates critical env vars
3. ✅ **Secure cookies** - HTTPS-only in production
4. ✅ **CORS protection** - Strict origin validation in production
5. ✅ **Strong secrets** - JWT_SECRET validation (32+ chars)

---

## Need Help?

### CORS Issues
- Check `FRONTEND_URL` or `ALLOWED_ORIGINS` in backend `.env`
- Verify frontend origin matches exactly (including protocol)
- Check browser console for exact blocked origin

### OAuth Issues
- Verify callback URLs match Google Cloud Console exactly
- Ensure `https://` is used (not `http://`)
- Check OAuth credentials are for production (not development)

### Cookie Issues
- Verify HTTPS is enabled
- Check `COOKIE_DOMAIN` if using subdomains
- Ensure `sameSite: 'none'` in production (automatic)

---

**All environment and CORS issues are now fixed and production-ready!**




