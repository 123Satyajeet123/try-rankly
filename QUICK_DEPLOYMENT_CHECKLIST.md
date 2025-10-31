# Quick Deployment Checklist

## Before You Start

- [ ] Linux server (Ubuntu 20.04+ recommended)
- [ ] Domain name configured with DNS
- [ ] SSH access to server
- [ ] Google OAuth credentials ready

---

## Step-by-Step Quick Deploy

### 1. Server Preparation (5 minutes)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y

# Install MongoDB (if local) OR use MongoDB Atlas (recommended)
```

### 2. Deploy Code (5 minutes)

```bash
# Clone to /var/www/rankly
cd /var/www
sudo git clone <your-repo-url> rankly
sudo chown -R $USER:$USER /var/www/rankly
cd /var/www/rankly

# Run deployment script
./deploy.sh
```

### 3. Configure Environment (10 minutes)

**Backend .env:**
```bash
cd backend
nano .env
```

Set these:
- `MONGODB_URI` (your MongoDB connection string)
- `FRONTEND_URL=https://yourdomain.com`
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- `GA4_CLIENT_ID` and `GA4_CLIENT_SECRET`
- `JWT_SECRET` (generate: `openssl rand -base64 32`)
- `OPENROUTER_API_KEY`

**Frontend .env.production.local:**
```bash
cd /var/www/rankly
nano .env.production.local
```

Set:
- `NEXT_PUBLIC_API_URL=https://yourdomain.com/api`

### 4. Build & Restart (2 minutes)

```bash
cd /var/www/rankly
npm run build
pm2 restart all
```

### 5. Configure Nginx (5 minutes)

```bash
# Copy nginx config
sudo cp nginx.conf /etc/nginx/sites-available/rankly

# Edit and replace 'yourdomain.com' with your domain
sudo nano /etc/nginx/sites-available/rankly

# Enable site
sudo ln -s /etc/nginx/sites-available/rankly /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 6. SSL Certificate (5 minutes)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 7. Update Google OAuth (5 minutes)

1. Go to https://console.cloud.google.com/apis/credentials
2. Edit OAuth client
3. Add redirect URIs:
   - `https://yourdomain.com/api/auth/google/callback`
   - `https://yourdomain.com/api/auth/ga4/callback`
4. Save

### 8. Firewall (2 minutes)

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Verify Deployment

```bash
# Check backend health
curl https://yourdomain.com/health

# Check PM2
pm2 status

# Check logs
pm2 logs

# Check nginx
sudo systemctl status nginx
```

Visit: `https://yourdomain.com`

---

## Common Issues & Quick Fixes

### Issue: CORS Errors
**Fix:** Check `FRONTEND_URL` in backend `.env` matches your domain

### Issue: 502 Bad Gateway
**Fix:** 
```bash
pm2 status  # Check if backend is running
pm2 logs rankly-backend  # Check errors
```

### Issue: SSL Certificate Error
**Fix:**
```bash
sudo certbot renew --dry-run
```

### Issue: MongoDB Connection Failed
**Fix:** Verify connection string in `.env`, test:
```bash
node -e "require('mongoose').connect('your-uri').then(() => console.log('OK')).catch(e => console.error(e))"
```

---

## Post-Deployment

- [ ] Test user registration/login
- [ ] Test OAuth flows
- [ ] Test API endpoints
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Set up log rotation

---

**Total Time: ~40 minutes**

For detailed instructions, see `DEPLOYMENT_GUIDE.md`

