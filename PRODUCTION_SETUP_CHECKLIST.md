# Production Setup Quick Checklist

Use this checklist when setting up your production Google Cloud project.

## Google Cloud Console Setup

### 1. Enable APIs
- [ ] Google Analytics Data API
- [ ] Google Analytics Admin API
- [ ] Google+ API (or People API)

### 2. Configure OAuth Consent Screen
- [ ] App name set
- [ ] Support email set
- [ ] Scopes added:
  - [ ] `userinfo.profile`
  - [ ] `userinfo.email`
  - [ ] `analytics.readonly`
- [ ] Test users added (if in testing mode)

### 3. Create User Authentication OAuth Credentials
- [ ] OAuth 2.0 Client ID created (Web application)
- [ ] Name: "Rankly User Authentication"
- [ ] Authorized JavaScript origins:
  - [ ] `https://yourdomain.com`
  - [ ] `https://www.yourdomain.com` (if using www)
- [ ] Authorized redirect URI:
  - [ ] `https://yourdomain.com/api/auth/google/callback`
- [ ] Client ID copied → `GOOGLE_CLIENT_ID`
- [ ] Client Secret copied → `GOOGLE_CLIENT_SECRET`

### 4. Create GA4 OAuth Credentials
- [ ] OAuth 2.0 Client ID created (Web application)
- [ ] Name: "Rankly GA4 Integration"
- [ ] Authorized JavaScript origins:
  - [ ] `https://yourdomain.com`
  - [ ] `https://www.yourdomain.com` (if using www)
- [ ] Authorized redirect URI:
  - [ ] `https://yourdomain.com/api/auth/ga4/callback`
- [ ] Client ID copied → `GA4_CLIENT_ID`
- [ ] Client Secret copied → `GA4_CLIENT_SECRET`

## Backend Configuration

### Environment Variables (`backend/.env`)
- [ ] `NODE_ENV=production`
- [ ] `FRONTEND_URL=https://yourdomain.com` (matches production domain)
- [ ] `GOOGLE_CLIENT_ID` (from Step 3)
- [ ] `GOOGLE_CLIENT_SECRET` (from Step 3)
- [ ] `GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback`
- [ ] `GA4_CLIENT_ID` (from Step 4)
- [ ] `GA4_CLIENT_SECRET` (from Step 4)
- [ ] `GA4_REDIRECT_URI=https://yourdomain.com/api/auth/ga4/callback`
- [ ] `JWT_SECRET` (32+ characters, generated securely)
- [ ] `MONGODB_URI` (production database)
- [ ] `OPENROUTER_API_KEY` (if using)
- [ ] All URLs use `https://` (not `http://`)

## Frontend Configuration

### Environment Variables (`.env.production.local`)
- [ ] `NEXT_PUBLIC_API_URL=https://yourdomain.com/api`

## Verification

### URL Matching (Critical!)
- [ ] Google Console User Auth redirect URI = `GOOGLE_CALLBACK_URL` in `.env`
- [ ] Google Console GA4 redirect URI = `GA4_REDIRECT_URI` in `.env`
- [ ] Google Console JavaScript origins = `FRONTEND_URL` in `.env`
- [ ] All URLs match exactly (case-sensitive, no trailing slashes)

### Testing
- [ ] Backend deployed and running
- [ ] Frontend deployed and accessible
- [ ] User authentication works (Google login)
- [ ] GA4 connection works (Connect Google Analytics)
- [ ] No console errors
- [ ] No CORS errors
- [ ] Cookies set correctly

## Security
- [ ] `.env` files not committed to git
- [ ] Using production OAuth credentials (not development)
- [ ] `JWT_SECRET` is strong and unique
- [ ] HTTPS enabled everywhere
- [ ] OAuth client secrets kept secure

---

## Quick Command Reference

### Generate JWT Secret
```bash
openssl rand -base64 32
```

### Test Backend Health
```bash
curl https://yourdomain.com/api/health
```

### Test CORS
```bash
curl -H "Origin: https://yourdomain.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://yourdomain.com/api
```

---

## Common Issues

### `redirect_uri_mismatch`
- ✅ Check redirect URIs match exactly in Google Console and `.env`
- ✅ Wait a few minutes for changes to propagate

### `invalid_client`
- ✅ Verify using correct Client ID and Secret
- ✅ Check for typos

### CORS errors
- ✅ Verify `FRONTEND_URL` matches frontend domain
- ✅ Check `ALLOWED_ORIGINS` if using multiple domains

---

**For detailed instructions, see `GOOGLE_CLOUD_PRODUCTION_SETUP.md`**

