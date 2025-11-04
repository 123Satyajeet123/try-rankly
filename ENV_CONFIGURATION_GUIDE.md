# Environment Variables Configuration Guide

Complete guide for configuring environment variables for production deployment.

## Quick Start

1. **Backend**: Copy `backend/.env.production.example` to `backend/.env` and update values
2. **Frontend**: Copy `.env.production.local.example` to `.env.production.local` and update values

---

## Backend Environment Variables

### Required Variables

#### Database
```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/rankly?retryWrites=true&w=majority
```

#### Server Configuration
```bash
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com
```

#### Authentication
```bash
JWT_SECRET=your-secret-minimum-32-characters-long
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
```

#### GA4 Analytics
```bash
GA4_CLIENT_ID=your-ga4-client-id.apps.googleusercontent.com
GA4_CLIENT_SECRET=your-ga4-client-secret
GA4_REDIRECT_URI=https://yourdomain.com/api/auth/ga4/callback
```

#### LLM Services
```bash
OPENROUTER_API_KEY=your-openrouter-api-key
```

### Optional Variables

#### Multiple Origins (CORS)
```bash
# Comma-separated list (no spaces after commas)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://app.yourdomain.com

# Or use wildcard for subdomains
ALLOWED_ORIGINS=https://*.yourdomain.com
```

#### Cookie Domain (Subdomains)
```bash
COOKIE_DOMAIN=.yourdomain.com
```

#### OpenRouter Referer
```bash
OPENROUTER_REFERER=https://yourdomain.com
```

---

## Frontend Environment Variables

### Required Variables

```bash
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

**Note**: `NEXT_PUBLIC_*` variables are exposed to the browser. Never put secrets here.

---

## Production Checklist

### Before Deployment

- [ ] `FRONTEND_URL` matches your production domain (with https://)
- [ ] `GOOGLE_CALLBACK_URL` matches Google Cloud Console redirect URI
- [ ] `GA4_REDIRECT_URI` matches Google Cloud Console redirect URI
- [ ] `JWT_SECRET` is at least 32 characters (generate with `openssl rand -base64 32`)
- [ ] `MONGODB_URI` uses MongoDB Atlas or secure connection
- [ ] `NEXT_PUBLIC_API_URL` matches your production API endpoint
- [ ] `ALLOWED_ORIGINS` includes all domains that will access the API
- [ ] All OAuth credentials are for production (not development)

### Google Cloud Console Updates

#### User OAuth (GOOGLE_CLIENT_ID)
1. Go to https://console.cloud.google.com/apis/credentials
2. Edit your OAuth 2.0 Client ID
3. Add to **Authorized JavaScript origins**:
   - `https://yourdomain.com`
   - `https://www.yourdomain.com` (if using www)
4. Add to **Authorized redirect URIs**:
   - `https://yourdomain.com/api/auth/google/callback`

#### GA4 OAuth (GA4_CLIENT_ID)
1. Edit your GA4 OAuth 2.0 Client ID
2. Add to **Authorized JavaScript origins**:
   - `https://yourdomain.com`
3. Add to **Authorized redirect URIs**:
   - `https://yourdomain.com/api/auth/ga4/callback`

---

## CORS Configuration

The backend supports flexible CORS configuration:

### Single Domain
```bash
FRONTEND_URL=https://yourdomain.com
```

### Multiple Domains
```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://app.yourdomain.com
```

### Wildcard Subdomains
```bash
ALLOWED_ORIGINS=https://*.yourdomain.com
```

**Important**: In production, CORS is strictly enforced. Make sure your frontend domain is in the allowed list.

---

## Security Notes

### DO NOT:
- ❌ Commit `.env` files to git
- ❌ Use development secrets in production
- ❌ Set `DEV_AUTH_BYPASS=true` in production
- ❌ Use weak `JWT_SECRET` (must be 32+ characters)
- ❌ Expose secrets in `NEXT_PUBLIC_*` variables

### DO:
- ✅ Use strong `JWT_SECRET` (generate with `openssl rand -base64 32`)
- ✅ Use HTTPS in production
- ✅ Validate all URLs match your domain
- ✅ Use environment-specific OAuth credentials
- ✅ Keep `.env` files secure (chmod 600)

---

## Troubleshooting

### CORS Errors
**Symptom**: "Not allowed by CORS" errors

**Fix**:
1. Check `FRONTEND_URL` or `ALLOWED_ORIGINS` in backend `.env`
2. Verify frontend URL matches exactly (including https://)
3. Check browser console for the exact origin being blocked
4. Add the origin to `ALLOWED_ORIGINS` if using multiple domains

### OAuth Redirect Errors
**Symptom**: "redirect_uri_mismatch" errors

**Fix**:
1. Verify callback URLs in `.env` match Google Cloud Console exactly
2. URLs must include `https://` and match case
3. Update Google Cloud Console redirect URIs if needed

### Session Not Persisting
**Symptom**: Users logged out on refresh

**Fix**:
1. Verify `COOKIE_DOMAIN` is set correctly for subdomains
2. Check `secure: true` is enabled in production (automatic)
3. Ensure HTTPS is working
4. Check `sameSite: 'none'` is set (automatic in production)

### API Connection Errors
**Symptom**: Frontend can't connect to backend

**Fix**:
1. Verify `NEXT_PUBLIC_API_URL` matches your backend URL
2. Check backend is running and accessible
3. Verify CORS allows the frontend origin
4. Check network tab for actual error messages

---

## Environment Variable Validation

The backend validates critical environment variables on startup:

- ✅ `JWT_SECRET` must be 32+ characters in production
- ✅ `FRONTEND_URL` warning if missing in production
- ✅ `MONGODB_URI` error if connection fails

---

## Example Production .env Files

### backend/.env
```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/rankly
FRONTEND_URL=https://rankly.ai
ALLOWED_ORIGINS=https://rankly.ai,https://www.rankly.ai
JWT_SECRET=$(openssl rand -base64 32)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://rankly.ai/api/auth/google/callback
GA4_CLIENT_ID=...
GA4_CLIENT_SECRET=...
GA4_REDIRECT_URI=https://rankly.ai/api/auth/ga4/callback
OPENROUTER_API_KEY=...
OPENROUTER_REFERER=https://rankly.ai
```

### .env.production.local
```bash
NEXT_PUBLIC_API_URL=https://rankly.ai/api
```

---

## Verification Commands

After deployment, verify configuration:

```bash
# Check backend health
curl https://yourdomain.com/health

# Check API info
curl https://yourdomain.com/api

# Test CORS (from frontend domain)
curl -H "Origin: https://yourdomain.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://yourdomain.com/api
```

---

## Need Help?

Common issues:
1. **CORS errors**: Check `ALLOWED_ORIGINS` and `FRONTEND_URL`
2. **OAuth errors**: Verify callback URLs match Google Console
3. **Connection errors**: Verify `NEXT_PUBLIC_API_URL` is correct
4. **Session errors**: Check cookie settings and HTTPS









