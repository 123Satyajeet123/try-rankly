# 🔒 SSL Certificate Setup with Certbot

Complete guide to set up SSL certificates using Certbot (Let's Encrypt) with Nginx.

## Prerequisites

1. Domain name pointing to your server IP
2. Nginx installed and configured
3. Port 80 and 443 open in firewall

## Step-by-Step Setup

### Step 1: Install Certbot

```bash
# Install Certbot and Nginx plugin
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

### Step 2: Configure Nginx (Initial HTTP Setup)

**Before running Certbot, temporarily modify nginx config:**

```bash
# Edit nginx config
sudo nano /etc/nginx/sites-available/rankly
```

**In the HTTP server block (port 80), comment out the redirect and enable proxying:**

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        # Comment out redirect temporarily for Certbot
        # return 301 https://$server_name$request_uri;
        
        # Enable proxy for Certbot validation
        proxy_pass http://rankly_frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

**Also comment out SSL lines in HTTPS block:**

```nginx
server {
    # listen 443 ssl http2;
    # listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # Comment these out temporarily
    # ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # ... rest of config
}
```

**Or create a simpler HTTP-only config first:**

```bash
# Create temporary HTTP-only config
sudo nano /etc/nginx/sites-available/rankly-http
```

**Paste this (replace yourdomain.com with your domain):**

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # For Let's Encrypt certificate validation
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Proxy to frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy to backend API
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable it
sudo ln -s /etc/nginx/sites-available/rankly-http /etc/nginx/sites-enabled/
# Remove the full config temporarily
sudo rm /etc/nginx/sites-enabled/rankly

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### Step 3: Ensure HTTP is Accessible

```bash
# Make sure port 80 is open
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Test that HTTP works
curl http://yourdomain.com
# Should return HTML or 200 response
```

### Step 4: Run Certbot

```bash
# Replace yourdomain.com with your actual domain
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**Certbot will:**
1. Ask for your email (for renewal notices)
2. Ask to agree to Terms of Service
3. Ask if you want to redirect HTTP to HTTPS (say **Yes**)
4. Automatically configure SSL in your nginx config
5. Test the configuration and reload nginx

### Step 5: Verify SSL Certificate

```bash
# Test certificate
sudo certbot certificates

# Test auto-renewal (dry run)
sudo certbot renew --dry-run

# Check SSL is working
curl https://yourdomain.com
# Should return HTML without certificate errors
```

### Step 6: Replace with Full Nginx Config

**After Certbot successfully sets up SSL:**

```bash
# Certbot modified your nginx config, but you may want the full featured config
# Copy your full nginx.conf with SSL paths already set by Certbot

# The SSL paths should now be:
# ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

# Copy your full config (with all the upstream, rate limiting, etc.)
sudo cp /path/to/your/nginx.conf /etc/nginx/sites-available/rankly

# Make sure SSL certificate paths match what Certbot set up
# They should already be correct in the config

# Test
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

## Automatic Certificate Renewal

Certbot automatically sets up a cron job for renewal. Verify it:

```bash
# Check renewal timer
sudo systemctl status certbot.timer

# View renewal config
sudo cat /etc/cron.d/certbot

# Manual renewal test
sudo certbot renew --dry-run
```

Certificates auto-renew **30 days before expiration** (Let's Encrypt certs last 90 days).

## Alternative: Certbot Standalone (If Nginx Method Fails)

If the Nginx plugin method doesn't work:

```bash
# Stop nginx temporarily
sudo systemctl stop nginx

# Run Certbot in standalone mode
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Start nginx
sudo systemctl start nginx

# Then manually configure nginx to use the certificates:
# ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

## Troubleshooting

### Error: "The server could not connect to the client"

**Fix:** Make sure:
- Domain DNS points to your server IP
- Port 80 is open: `sudo ufw allow 80/tcp`
- Nginx is running: `sudo systemctl status nginx`

### Error: "Unable to find a VirtualHost matching domain"

**Fix:** Ensure your nginx config has `server_name` matching your domain:
```nginx
server_name yourdomain.com www.yourdomain.com;
```

### Certbot can't modify nginx config

**Fix:** Make sure you have the nginx plugin:
```bash
sudo apt install python3-certbot-nginx
```

### Certificate not renewing automatically

**Fix:** Set up auto-renewal:
```bash
# Create renewal hook to reload nginx
sudo nano /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

Add:
```bash
#!/bin/bash
systemctl reload nginx
```

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

### Verify Certificate Files

```bash
# List certificates
sudo certbot certificates

# View certificate details
sudo openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -text -noout

# Check certificate expiration
sudo certbot certificates | grep "Expiry Date"
```

## Quick Commands Reference

```bash
# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Renew certificate
sudo certbot renew

# Test renewal (dry run)
sudo certbot renew --dry-run

# List certificates
sudo certbot certificates

# Revoke certificate
sudo certbot revoke --cert-path /etc/letsencrypt/live/yourdomain.com/cert.pem

# Delete certificate
sudo certbot delete --cert-name yourdomain.com
```

## Final Verification

After setup, verify everything works:

```bash
# Check HTTPS works
curl -I https://yourdomain.com
# Should return 200 OK

# Check redirect from HTTP to HTTPS
curl -I http://yourdomain.com
# Should return 301 redirect to HTTPS

# Check certificate in browser
# Visit https://yourdomain.com
# Click padlock icon → Certificate → Should show valid Let's Encrypt cert
```

## Security Checklist

- [ ] SSL certificate installed and valid
- [ ] HTTP redirects to HTTPS
- [ ] Certificate auto-renewal configured
- [ ] Port 443 open in firewall
- [ ] HSTS header configured (in nginx config)
- [ ] Strong SSL ciphers configured

Your SSL is now set up! 🎉


