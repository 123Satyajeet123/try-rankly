# Production Configuration Summary

## Overview

This document summarizes all changes made to prepare the Rankly codebase for production deployment on a Linux server using Nginx and PM2.

---

## Changes Made

### 1. Backend Server Configuration (`backend/src/index.js`)

#### ✅ CORS Configuration
- **Before:** Single origin hardcoded
- **After:** Dynamic origin checking with support for multiple origins
- **Feature:** Environment variable `ALLOWED_ORIGINS` for comma-separated list
- **Security:** Strict origin validation in production, relaxed in development

#### ✅ Session Cookie Configuration
- **Added:** `httpOnly: true` to prevent XSS attacks
- **Added:** `sameSite: 'none'` for production (supports cross-site with HTTPS)
- **Added:** `domain` support via `COOKIE_DOMAIN` environment variable
- **Added:** Named session cookie (`rankly_session`) for clarity

#### ✅ Trust Proxy Configuration
- **Added:** `app.set('trust proxy', 1)` for production
- **Purpose:** Ensures correct IP addresses and protocol detection behind Nginx

#### ✅ Helmet Security Headers
- **Updated:** Content Security Policy disabled in production (handled by Nginx)
- **Updated:** Cross-Origin Embedder Policy disabled for compatibility

---

## Files Created

### 1. `backend/.env.example`
- Complete template for backend environment variables
- Includes all required OAuth, database, and API configurations
- Production-ready defaults

### 2. `.env.example` (Root)
- Template for Next.js frontend environment variables
- `NEXT_PUBLIC_API_URL` configuration

### 3. `ecosystem.config.js`
- PM2 ecosystem configuration for both frontend and backend
- Cluster mode for backend (2 instances)
- Auto-restart configuration
- Log file management
- Memory limits

### 4. `nginx.conf`
- Complete Nginx reverse proxy configuration
- SSL/TLS configuration
- Rate limiting
- Load balancing upstream configuration
- Security headers
- Static file caching
- Health check endpoint

### 5. `DEPLOYMENT_GUIDE.md`
- Comprehensive step-by-step deployment guide
- Server setup instructions
- SSL certificate configuration
- Troubleshooting section
- Security checklist

### 6. `QUICK_DEPLOYMENT_CHECKLIST.md`
- Quick reference checklist
- 40-minute deployment timeline
- Common issues and fixes

### 7. `deploy.sh`
- Automated deployment script
- Dependency installation
- Build process
- PM2 management

---

## Environment Variables Required

### Backend (`backend/.env`)

**Required:**
- `MONGODB_URI` - MongoDB connection string
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Set to `production`
- `FRONTEND_URL` - Your domain (https://yourdomain.com)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth secret
- `GOOGLE_CALLBACK_URL` - OAuth callback URL
- `GA4_CLIENT_ID` - GA4 OAuth client ID
- `GA4_CLIENT_SECRET` - GA4 OAuth secret
- `GA4_REDIRECT_URI` - GA4 OAuth callback
- `JWT_SECRET` - Secret key (32+ characters)
- `OPENROUTER_API_KEY` - OpenRouter API key

**Optional:**
- `ALLOWED_ORIGINS` - Comma-separated list of allowed origins
- `COOKIE_DOMAIN` - Cookie domain (for subdomains)
- `JWT_EXPIRES_IN` - JWT expiration (default: 7d)

### Frontend (`.env.production.local`)

**Required:**
- `NEXT_PUBLIC_API_URL` - Backend API URL (https://yourdomain.com/api)

---

## CORS Configuration Explained

### Development
- All origins allowed (for local development)
- No strict validation

### Production
- Only allowed origins accepted
- Configured via `ALLOWED_ORIGINS` or `FRONTEND_URL`
- Credentials enabled for authentication cookies
- Specific methods and headers allowed

### Multiple Origins
If you need to support multiple domains:
```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://app.yourdomain.com
```

---

## Authentication Flow

### JWT Authentication (API)
1. User logs in via `/api/auth/login` or OAuth
2. Backend returns JWT token
3. Frontend stores token in localStorage
4. Frontend sends token in `Authorization: Bearer <token>` header
5. Backend validates token on protected routes

### Session Authentication (OAuth)
1. User initiates OAuth via `/api/auth/google` or `/api/auth/ga4`
2. OAuth callback stores session in `rankly_session` cookie
3. Session cookie sent automatically with requests
4. Backend validates session

### CORS & Cookies
- Cookies set with `Secure` flag (HTTPS only)
- Cookies set with `SameSite: none` (allows cross-site with HTTPS)
- Frontend requests include `credentials: 'include'`
- Backend CORS allows credentials

---

## Nginx Configuration Highlights

### Reverse Proxy
- Frontend: `localhost:3000` → `https://yourdomain.com`
- Backend API: `localhost:5000` → `https://yourdomain.com/api`

### SSL/TLS
- Let's Encrypt certificate support
- Modern TLS protocols (1.2, 1.3)
- Strong cipher suites

### Rate Limiting
- API endpoints: 10 requests/second
- Auth endpoints: 5 requests/second
- Prevents abuse

### Load Balancing
- Backend runs multiple instances (PM2 cluster mode)
- Nginx distributes requests using least connections

### Security Headers
- HSTS (Strict Transport Security)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Referrer-Policy

---

## PM2 Configuration

### Backend (`rankly-backend`)
- **Mode:** Cluster (2 instances)
- **Memory Limit:** 1GB per instance
- **Auto-restart:** Enabled
- **Logs:** `./logs/backend-*.log`

### Frontend (`rankly-frontend`)
- **Mode:** Fork (single instance)
- **Memory Limit:** 500MB
- **Auto-restart:** Enabled
- **Logs:** `./logs/frontend-*.log`

### Commands
```bash
pm2 start ecosystem.config.js --env production
pm2 status
pm2 logs
pm2 restart all
pm2 save
pm2 startup  # Enable auto-start on reboot
```

---

## Deployment Steps Summary

1. **Server Setup** (Install Node.js, PM2, Nginx, MongoDB)
2. **Clone Repository** (to `/var/www/rankly`)
3. **Configure Environment** (`.env` files)
4. **Install Dependencies** (`npm install`)
5. **Build Frontend** (`npm run build`)
6. **Start PM2** (`pm2 start ecosystem.config.js`)
7. **Configure Nginx** (copy `nginx.conf` and update domain)
8. **SSL Certificate** (`certbot --nginx`)
9. **Update OAuth** (Google Cloud Console redirect URIs)
10. **Firewall** (allow 80, 443, 22)

---

## Security Considerations

### ✅ Implemented
- HTTPS enforced (SSL/TLS)
- Secure session cookies (HttpOnly, Secure)
- CORS with origin validation
- Rate limiting
- Security headers
- Trust proxy configuration
- Environment variable security

### ⚠️ Additional Recommendations
- Regular security updates
- MongoDB authentication (if not using Atlas)
- Database backups
- Monitoring and alerting
- DDoS protection (Cloudflare, etc.)
- Regular log reviews

---

## Troubleshooting

### CORS Issues
**Symptom:** `Access-Control-Allow-Origin` errors

**Fix:**
1. Verify `FRONTEND_URL` in backend `.env`
2. Check `ALLOWED_ORIGINS` if using multiple domains
3. Ensure frontend uses correct `NEXT_PUBLIC_API_URL`
4. Check nginx headers are not blocking

### Session Issues
**Symptom:** OAuth not working, session not persisting

**Fix:**
1. Verify `sameSite: 'none'` with HTTPS
2. Check `COOKIE_DOMAIN` if using subdomains
3. Ensure `secure: true` in production
4. Check browser console for cookie warnings

### 502 Bad Gateway
**Symptom:** Nginx returns 502

**Fix:**
1. Check PM2: `pm2 status`
2. Check backend logs: `pm2 logs rankly-backend`
3. Verify backend is listening on port 5000
4. Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`

---

## Next Steps

1. **Deploy to Server:** Follow `DEPLOYMENT_GUIDE.md`
2. **Test Everything:** Verify all features work
3. **Monitor:** Set up PM2 monitoring
4. **Backup:** Configure database backups
5. **Scale:** Add more instances if needed

---

## Support

For detailed deployment instructions, see:
- `DEPLOYMENT_GUIDE.md` - Full deployment guide
- `QUICK_DEPLOYMENT_CHECKLIST.md` - Quick reference

For issues:
1. Check logs: `pm2 logs` and `/var/log/nginx/`
2. Review this document
3. Check environment variables
4. Verify OAuth configuration




