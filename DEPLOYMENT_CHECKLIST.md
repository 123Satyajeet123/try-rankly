# 🚀 Ubuntu Server Deployment Checklist

Complete checklist for deploying Rankly to an Ubuntu server.

## 📋 Pre-Deployment Checklist

### 1. Server Prerequisites
- [ ] Ubuntu 20.04 LTS or later installed
- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm 9+ installed (`npm --version`)
- [ ] PM2 installed globally (`npm install -g pm2`)
- [ ] MongoDB Atlas connection string (or local MongoDB configured)
- [ ] Nginx installed and configured
- [ ] Domain name configured with DNS pointing to server IP
- [ ] SSL certificate obtained (Let's Encrypt recommended)

### 2. Environment Variables Setup

#### Backend (.env file in `/backend/` directory)
- [ ] Copy `backend/env.example.txt` to `backend/.env`
- [ ] Set `NODE_ENV=production`
- [ ] Set `PORT=5000`
- [ ] Set `MONGODB_URI` with your MongoDB Atlas connection string
- [ ] Set `FRONTEND_URL` to your production domain (e.g., `https://rankly.ai`)
- [ ] Generate and set `JWT_SECRET` (minimum 32 characters): `openssl rand -base64 32`
- [ ] Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (from Google Cloud Console)
- [ ] Set `GOOGLE_CALLBACK_URL` to `https://yourdomain.com/api/auth/google/callback`
- [ ] Set `GA4_CLIENT_ID` and `GA4_CLIENT_SECRET` (from Google Cloud Console)
- [ ] Set `GA4_REDIRECT_URI` to `https://yourdomain.com/api/auth/ga4/callback`
- [ ] Set `OPENROUTER_API_KEY` (from OpenRouter dashboard)
- [ ] Set `OPENROUTER_REFERER` to your production domain
- [ ] If using multiple domains, set `ALLOWED_ORIGINS` (comma-separated)
- [ ] If using subdomains, set `COOKIE_DOMAIN` (e.g., `.yourdomain.com`)

#### Frontend (.env.production.local file in root directory)
- [ ] Copy `env.production.local.example.txt` to `.env.production.local`
- [ ] Set `NEXT_PUBLIC_API_URL` to `https://yourdomain.com/api`

### 3. Google Cloud Console Configuration

#### User OAuth (GOOGLE_CLIENT_ID)
- [ ] Go to https://console.cloud.google.com/apis/credentials
- [ ] Edit your OAuth 2.0 Client ID
- [ ] Add to **Authorized JavaScript origins**:
  - `https://yourdomain.com`
  - `https://www.yourdomain.com` (if using www)
- [ ] Add to **Authorized redirect URIs**:
  - `https://yourdomain.com/api/auth/google/callback`

#### GA4 OAuth (GA4_CLIENT_ID)
- [ ] Edit your GA4 OAuth 2.0 Client ID
- [ ] Add to **Authorized JavaScript origins**:
  - `https://yourdomain.com`
- [ ] Add to **Authorized redirect URIs**:
  - `https://yourdomain.com/api/auth/ga4/callback`

### 4. File Permissions
```bash
# Set proper permissions on .env files
chmod 600 backend/.env
chmod 600 .env.production.local

# Ensure deploy script is executable
chmod +x deploy.sh
```

## 🛠️ Deployment Steps

### Step 1: Clone/Upload Code
```bash
# If using git
git clone <repository-url> rankly
cd rankly

# Or upload code via SCP/SFTP
```

### Step 2: Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### Step 3: Build Frontend
```bash
# Build Next.js application
npm run build
```

### Step 4: Configure Environment Variables
```bash
# Create backend .env file
cp backend/env.example.txt backend/.env
nano backend/.env  # Edit with your values

# Create frontend .env.production.local
cp env.production.local.example.txt .env.production.local
nano .env.production.local  # Edit with your values
```

### Step 5: Test Configuration
```bash
# Test backend startup (without PM2)
cd backend
node src/index.js
# Press Ctrl+C to stop after verifying it starts correctly
cd ..

# Verify environment variables are loaded
cd backend
node -e "require('dotenv').config(); console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'MISSING');"
```

### Step 6: Start with PM2
```bash
# Start PM2 processes
pm2 start ecosystem.config.js --env production

# Save PM2 configuration for auto-restart on reboot
pm2 save
pm2 startup  # Follow the instructions shown

# Check status
pm2 status
pm2 logs
```

### Step 7: Configure Nginx

1. Copy nginx configuration:
```bash
sudo cp nginx.conf /etc/nginx/sites-available/rankly
```

2. Edit configuration:
```bash
sudo nano /etc/nginx/sites-available/rankly
```
- Replace `yourdomain.com` with your actual domain
- Update SSL certificate paths if needed

3. Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/rankly /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

### Step 8: SSL Certificate (if not already set up)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is set up automatically
```

## ✅ Post-Deployment Verification

### 1. Health Checks
```bash
# Backend health check
curl https://yourdomain.com/health

# API info
curl https://yourdomain.com/api

# Frontend (should return HTML)
curl https://yourdomain.com
```

### 2. Application Tests
- [ ] Visit `https://yourdomain.com` - should load frontend
- [ ] Try Google OAuth login - should redirect and authenticate
- [ ] Access dashboard - should load without errors
- [ ] Check browser console - no critical errors
- [ ] Test API endpoints from frontend

### 3. Log Monitoring
```bash
# View PM2 logs
pm2 logs

# View Nginx logs
sudo tail -f /var/log/nginx/rankly-access.log
sudo tail -f /var/log/nginx/rankly-error.log

# Check for errors
pm2 logs --err
```

### 4. Performance Checks
- [ ] Frontend loads quickly (< 3 seconds)
- [ ] API responses are fast (< 500ms for most endpoints)
- [ ] Database connections are stable
- [ ] No memory leaks (check `pm2 monit`)

## 🔧 Troubleshooting

### Backend won't start
1. Check environment variables are set correctly
2. Verify MongoDB connection string works
3. Check PM2 logs: `pm2 logs rankly-backend --err`
4. Ensure port 5000 is not in use: `sudo lsof -i :5000`

### Frontend won't start
1. Check `.env.production.local` exists and has `NEXT_PUBLIC_API_URL`
2. Verify build succeeded: `npm run build`
3. Check PM2 logs: `pm2 logs rankly-frontend --err`
4. Ensure port 3000 is not in use: `sudo lsof -i :3000`

### CORS Errors
1. Verify `FRONTEND_URL` in backend `.env` matches your domain exactly
2. Check `ALLOWED_ORIGINS` includes all needed domains
3. Verify frontend `NEXT_PUBLIC_API_URL` is correct

### OAuth Errors
1. Verify callback URLs in Google Cloud Console match exactly
2. Check URLs include `https://` and match case
3. Verify domain in OAuth credentials matches your actual domain

### Database Connection Errors
1. Verify MongoDB Atlas IP whitelist includes server IP (or 0.0.0.0/0)
2. Check MongoDB connection string is correct
3. Verify database user has correct permissions

## 🔄 Updates and Maintenance

### Updating Application
```bash
# Pull latest code
git pull

# Rebuild frontend
npm run build

# Restart PM2
pm2 restart all

# Check status
pm2 status
```

### Viewing Logs
```bash
# All logs
pm2 logs

# Specific app
pm2 logs rankly-backend
pm2 logs rankly-frontend

# Follow logs in real-time
pm2 logs --lines 100
```

### Restarting Services
```bash
# Restart all
pm2 restart all

# Restart specific app
pm2 restart rankly-backend

# Reload (zero downtime)
pm2 reload all
```

## 📊 Monitoring

### PM2 Monitoring
```bash
# Real-time monitoring
pm2 monit

# Process list with details
pm2 list

# Process information
pm2 info rankly-backend
pm2 info rankly-frontend
```

### System Resources
```bash
# Check memory usage
free -h

# Check disk space
df -h

# Check CPU
top
```

## 🛡️ Security Checklist

- [ ] All `.env` files have 600 permissions
- [ ] `.env` files are in `.gitignore` (already configured)
- [ ] `JWT_SECRET` is 32+ characters and secure
- [ ] `DEV_AUTH_BYPASS` is not set or set to false
- [ ] HTTPS is enabled and working
- [ ] SSL certificate is valid and auto-renewing
- [ ] Firewall is configured (UFW recommended)
- [ ] MongoDB connection uses authentication
- [ ] OAuth credentials are for production (not development)
- [ ] No secrets are exposed in `NEXT_PUBLIC_*` variables

## 🔐 Firewall Configuration (Optional but Recommended)

```bash
# Install UFW if not installed
sudo apt install ufw

# Allow SSH (IMPORTANT - do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## 📝 Notes

- The deploy script (`deploy.sh`) automates most of these steps
- PM2 will auto-restart apps if they crash
- PM2 startup command ensures apps start on server reboot
- Nginx handles SSL termination and reverse proxying
- Frontend runs on port 3000 (internal)
- Backend runs on port 5000 (internal)
- Both are accessible via HTTPS (port 443) through Nginx

## 🆘 Need Help?

If you encounter issues:
1. Check PM2 logs: `pm2 logs --err`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/rankly-error.log`
3. Verify all environment variables are set
4. Test backend directly: `curl http://localhost:5000/health`
5. Test frontend directly: `curl http://localhost:3000`




