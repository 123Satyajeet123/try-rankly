# Production Deployment Guide - Rankly

Complete guide for deploying Rankly to a Linux server using Nginx and PM2.

## Prerequisites

- Ubuntu 20.04+ or similar Linux distribution
- Node.js 18+ and npm installed
- MongoDB (local or Atlas)
- Domain name with DNS configured
- SSL certificate (Let's Encrypt recommended)
- Root or sudo access

---

## Step 1: Server Setup

### 1.1 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Node.js 18+

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Verify installation
```

### 1.3 Install PM2 Globally

```bash
sudo npm install -g pm2
```

### 1.4 Install Nginx

```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 1.5 Install MongoDB (if using local)

```bash
# Import MongoDB public GPG key
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Create MongoDB repository list file
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Or use MongoDB Atlas (recommended for production):**
- Sign up at https://www.mongodb.com/cloud/atlas
- Create a free cluster
- Get connection string

### 1.6 Install Certbot (for SSL)

```bash
sudo apt install certbot python3-certbot-nginx -y
```

---

## Step 2: Clone and Prepare Codebase

### 2.1 Clone Repository

```bash
cd /var/www
sudo git clone <your-repo-url> rankly
sudo chown -R $USER:$USER /var/www/rankly
cd /var/www/rankly
```

### 2.2 Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

---

## Step 3: Environment Configuration

### 3.1 Backend Environment Variables

```bash
cd backend
cp .env.example .env
nano .env
```

**Required variables:**
```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/rankly
# OR for Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rankly

# Server
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback

# GA4 OAuth
GA4_CLIENT_ID=your-ga4-client-id.apps.googleusercontent.com
GA4_CLIENT_SECRET=your-ga4-client-secret
GA4_REDIRECT_URI=https://yourdomain.com/api/auth/ga4/callback

# JWT Secret (generate: openssl rand -base64 32)
JWT_SECRET=your-secure-secret-key-minimum-32-characters

# OpenRouter API
OPENROUTER_API_KEY=your-openrouter-key
```

### 3.2 Frontend Environment Variables

```bash
cd /var/www/rankly
cp .env.example .env.production.local
nano .env.production.local
```

**Required variable:**
```bash
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

---

## Step 4: Build Frontend

### 4.1 Build Next.js Application

```bash
cd /var/www/rankly
npm run build
```

This creates the production-ready `.next` folder.

---

## Step 5: Configure PM2

### 5.1 Create Logs Directory

```bash
mkdir -p /var/www/rankly/logs
```

### 5.2 Update PM2 Configuration

Edit `ecosystem.config.js` if needed, then start:

```bash
cd /var/www/rankly
pm2 start ecosystem.config.js --env production
```

### 5.3 Save PM2 Configuration

```bash
pm2 save
pm2 startup
# Run the command it outputs to enable auto-start on reboot
```

### 5.4 Verify PM2 Status

```bash
pm2 status
pm2 logs
```

---

## Step 6: Configure Nginx

### 6.1 Update Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/rankly
```

Copy contents from `nginx.conf` and update:
- Replace `yourdomain.com` with your actual domain
- Update SSL certificate paths (or use Let's Encrypt)

### 6.2 Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/rankly /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default site
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

### 6.3 Configure SSL with Let's Encrypt

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

This automatically:
- Obtains SSL certificate
- Updates nginx configuration
- Sets up auto-renewal

---

## Step 7: Update Google OAuth Settings

### 7.1 Update Google Cloud Console

1. Go to https://console.cloud.google.com/apis/credentials
2. Edit your OAuth 2.0 Client ID
3. Add authorized redirect URIs:
   - `https://yourdomain.com/api/auth/google/callback`
   - `https://yourdomain.com/api/auth/ga4/callback`
4. Add authorized JavaScript origins:
   - `https://yourdomain.com`
5. Save changes

---

## Step 8: Firewall Configuration

### 8.1 Configure UFW

```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
sudo ufw status
```

---

## Step 9: Verify Deployment

### 9.1 Check Backend Health

```bash
curl https://yourdomain.com/health
```

### 9.2 Check Frontend

Visit `https://yourdomain.com` in browser.

### 9.3 Check Logs

```bash
# PM2 logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/rankly-access.log
sudo tail -f /var/log/nginx/rankly-error.log
```

---

## Step 10: Maintenance Commands

### 10.1 PM2 Commands

```bash
pm2 status           # Check status
pm2 logs             # View logs
pm2 restart all      # Restart all apps
pm2 stop all         # Stop all apps
pm2 reload all       # Zero-downtime reload
pm2 monit            # Monitor resources
```

### 10.2 Update Application

```bash
cd /var/www/rankly
git pull
npm install
cd backend && npm install && cd ..
npm run build
pm2 restart all
```

### 10.3 View Logs

```bash
# Application logs
pm2 logs rankly-backend
pm2 logs rankly-frontend

# Nginx logs
sudo tail -f /var/log/nginx/rankly-access.log
sudo tail -f /var/log/nginx/rankly-error.log
```

---

## Troubleshooting

### Backend Not Starting

1. Check environment variables:
   ```bash
   cd backend
   cat .env
   ```

2. Check MongoDB connection:
   ```bash
   mongo
   # Or test connection string
   ```

3. Check logs:
   ```bash
   pm2 logs rankly-backend
   ```

### CORS Errors

1. Verify `FRONTEND_URL` in backend `.env` matches your domain
2. Check nginx configuration includes proper headers
3. Verify `ALLOWED_ORIGINS` if using multiple domains

### SSL Certificate Issues

```bash
# Renew certificate
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

### Database Connection Issues

1. Verify MongoDB is running:
   ```bash
   sudo systemctl status mongod
   ```

2. Test connection string locally:
   ```bash
   node -e "require('mongoose').connect('your-connection-string').then(() => console.log('Connected')).catch(e => console.error(e))"
   ```

### High Memory Usage

1. Check PM2 memory:
   ```bash
   pm2 monit
   ```

2. Reduce instances in `ecosystem.config.js`:
   ```javascript
   instances: 1,  // Instead of 2 or 'max'
   ```

---

## Security Checklist

- [ ] SSL certificate installed and auto-renewal enabled
- [ ] Firewall configured (only 22, 80, 443 open)
- [ ] Strong JWT_SECRET (32+ characters)
- [ ] MongoDB secured (authentication enabled if Atlas)
- [ ] Environment variables secured (not in git)
- [ ] Regular backups configured
- [ ] PM2 running as non-root user
- [ ] Nginx security headers enabled
- [ ] Rate limiting configured
- [ ] OAuth redirect URIs updated in Google Console

---

## Backup Strategy

### Database Backup

```bash
# MongoDB local backup
mongodump --out=/backup/rankly-$(date +%Y%m%d)

# MongoDB Atlas: Use Atlas backup feature (recommended)
```

### Application Backup

```bash
# Backup codebase
tar -czf rankly-backup-$(date +%Y%m%d).tar.gz /var/www/rankly
```

---

## Monitoring

### Set up PM2 Monitoring

```bash
pm2 install pm2-server-monit
```

Access monitoring dashboard at provided URL.

### Set up Log Rotation

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## Success Indicators

✅ `https://yourdomain.com` loads correctly  
✅ `https://yourdomain.com/health` returns OK  
✅ OAuth login works  
✅ API endpoints respond correctly  
✅ No CORS errors in browser console  
✅ SSL certificate valid (green lock)  

---

## Next Steps

1. Set up monitoring (e.g., UptimeRobot, Pingdom)
2. Configure automated backups
3. Set up error tracking (e.g., Sentry)
4. Configure CDN for static assets
5. Set up CI/CD pipeline

---

**Need Help?** Check logs first:
- `pm2 logs`
- `sudo tail -f /var/log/nginx/rankly-error.log`

