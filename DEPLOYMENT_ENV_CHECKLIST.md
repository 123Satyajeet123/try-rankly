# Deployment Environment Variables Checklist

Quick reference checklist for production deployment.

## Backend (.env)

### Critical (Must Set)
- [ ] `NODE_ENV=production`
- [ ] `MONGODB_URI` - Your MongoDB connection string
- [ ] `FRONTEND_URL` - Your production domain (https://yourdomain.com)
- [ ] `JWT_SECRET` - At least 32 characters (run: `openssl rand -base64 32`)
- [ ] `GOOGLE_CLIENT_ID` - Production OAuth client ID
- [ ] `GOOGLE_CLIENT_SECRET` - Production OAuth secret
- [ ] `GOOGLE_CALLBACK_URL` - Must match Google Console (https://yourdomain.com/api/auth/google/callback)
- [ ] `GA4_CLIENT_ID` - Production GA4 OAuth client ID
- [ ] `GA4_CLIENT_SECRET` - Production GA4 OAuth secret
- [ ] `GA4_REDIRECT_URI` - Must match Google Console (https://yourdomain.com/api/auth/ga4/callback)
- [ ] `OPENROUTER_API_KEY` - Your OpenRouter API key

### Optional
- [ ] `ALLOWED_ORIGINS` - If using multiple domains
- [ ] `COOKIE_DOMAIN` - If using subdomains (.yourdomain.com)
- [ ] `OPENROUTER_REFERER` - Custom referer (defaults to FRONTEND_URL)
- [ ] `PORT` - Backend port (default: 5000)

### DO NOT SET (Production)
- [ ] `DEV_AUTH_BYPASS` - Must be unset or false
- [ ] `DEV_USER_ID` - Must be unset

---

## Frontend (.env.production.local)

### Critical (Must Set)
- [ ] `NEXT_PUBLIC_API_URL` - Your backend API URL (https://yourdomain.com/api)

---

## Google Cloud Console Updates

### User OAuth (GOOGLE_CLIENT_ID)
- [ ] Authorized JavaScript origins: `https://yourdomain.com`
- [ ] Authorized redirect URIs: `https://yourdomain.com/api/auth/google/callback`

### GA4 OAuth (GA4_CLIENT_ID)
- [ ] Authorized JavaScript origins: `https://yourdomain.com`
- [ ] Authorized redirect URIs: `https://yourdomain.com/api/auth/ga4/callback`

---

## Verification

After deployment, verify:

1. **Health Check**: `curl https://yourdomain.com/health`
2. **Frontend loads**: Visit `https://yourdomain.com`
3. **API accessible**: Frontend can make API calls
4. **OAuth works**: Test Google login
5. **CORS working**: No CORS errors in browser console

---

## Common Issues

| Issue | Solution |
|-------|----------|
| CORS errors | Check `FRONTEND_URL` or `ALLOWED_ORIGINS` in backend `.env` |
| OAuth redirect error | Verify callback URLs match Google Console exactly |
| Session not persisting | Check HTTPS is enabled and cookies are working |
| API connection failed | Verify `NEXT_PUBLIC_API_URL` matches backend URL |

---

## Security Reminders

- ✅ Use strong `JWT_SECRET` (32+ characters)
- ✅ Never commit `.env` files
- ✅ Use HTTPS in production
- ✅ Keep OAuth secrets secure
- ✅ Validate all URLs match your domain

