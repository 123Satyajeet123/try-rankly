# Google Cloud Production Setup Guide

Complete step-by-step guide for setting up Google Authentication and GA4 in your production Google Cloud project.

## Prerequisites

- ✅ New Google Cloud Project created
- ✅ Production domain name (e.g., `https://yourdomain.com`)
- ✅ Access to Google Cloud Console
- ✅ Access to your production server/environment

---

## Step 1: Enable Required APIs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your **production project**
3. Navigate to **APIs & Services** > **Library**
4. Enable the following APIs:
   - ✅ **Google+ API** (for user authentication)
   - ✅ **Google Analytics Data API** (for GA4 data access)
   - ✅ **Google Analytics Admin API** (for GA4 property management)

### How to Enable APIs:

```
1. Search for "Google Analytics Data API"
2. Click on it
3. Click "Enable"
4. Repeat for "Google Analytics Admin API"
5. Search for "Google+ API" (or "People API")
6. Enable it
```

---

## Step 2: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **External** (unless you have a Google Workspace)
3. Fill in the required information:
   - **App name**: Your app name (e.g., "Rankly")
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Click **Save and Continue**
5. **Scopes** (Step 2):
   - Click **Add or Remove Scopes**
   - Add these scopes:
     - `https://www.googleapis.com/auth/userinfo.profile`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/analytics.readonly`
   - Click **Update** > **Save and Continue**
6. **Test users** (Step 3):
   - Add test users if your app is in testing mode
   - Click **Save and Continue**
7. **Summary** (Step 4):
   - Review and click **Back to Dashboard**

**Important**: If your app is in "Testing" mode, you'll need to add test users. For production, you'll need to submit for verification (or publish if using only Google scopes).

---

## Step 3: Create OAuth 2.0 Credentials for User Authentication

This is for user login (GOOGLE_CLIENT_ID).

1. Go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
3. Select **Web application**
4. Fill in:
   - **Name**: `Rankly User Authentication` (or any descriptive name)
   - **Authorized JavaScript origins**:
     ```
     https://yourdomain.com
     https://www.yourdomain.com  (if using www)
     ```
   - **Authorized redirect URIs**:
     ```
     https://yourdomain.com/api/auth/google/callback
     ```
5. Click **Create**
6. **Copy the credentials**:
   - **Client ID**: `xxxxx.apps.googleusercontent.com`
   - **Client Secret**: `xxxxx`
   - Save these for `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

---

## Step 4: Create OAuth 2.0 Credentials for GA4

This is for Google Analytics integration (GA4_CLIENT_ID).

1. Still in **Credentials**, click **+ CREATE CREDENTIALS** > **OAuth client ID**
2. Select **Web application**
3. Fill in:
   - **Name**: `Rankly GA4 Integration` (or any descriptive name)
   - **Authorized JavaScript origins**:
     ```
     https://yourdomain.com
     https://www.yourdomain.com  (if using www)
     ```
   - **Authorized redirect URIs**:
     ```
     https://yourdomain.com/api/auth/ga4/callback
     ```
4. Click **Create**
5. **Copy the credentials**:
   - **Client ID**: `xxxxx.apps.googleusercontent.com`
   - **Client Secret**: `xxxxx`
   - Save these for `GA4_CLIENT_ID` and `GA4_CLIENT_SECRET`

---

## Step 5: Configure Backend Environment Variables

Update your `backend/.env` file with production values:

```bash
# ============================================
# REQUIRED - Server Configuration
# ============================================
NODE_ENV=production
PORT=5000

# ============================================
# REQUIRED - Database
# ============================================
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/rankly?retryWrites=true&w=majority

# ============================================
# REQUIRED - Frontend URL
# ============================================
FRONTEND_URL=https://yourdomain.com

# ============================================
# REQUIRED - Authentication
# ============================================
# Generate with: openssl rand -base64 32
JWT_SECRET=your-generated-secret-minimum-32-characters-long
JWT_EXPIRES_IN=7d

# ============================================
# REQUIRED - Google OAuth (User Authentication)
# ============================================
# From Step 3
GOOGLE_CLIENT_ID=your-google-client-id-from-step-3.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret-from-step-3
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback

# ============================================
# REQUIRED - Google Analytics 4 OAuth
# ============================================
# From Step 4
GA4_CLIENT_ID=your-ga4-client-id-from-step-4.apps.googleusercontent.com
GA4_CLIENT_SECRET=your-ga4-client-secret-from-step-4
GA4_REDIRECT_URI=https://yourdomain.com/api/auth/ga4/callback

# ============================================
# REQUIRED - OpenRouter API (for LLM calls)
# ============================================
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_REFERER=https://yourdomain.com

# ============================================
# OPTIONAL - Multiple Origins (CORS)
# ============================================
# If you have multiple domains/subdomains
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# ============================================
# OPTIONAL - Cookie Domain (for subdomains)
# ============================================
# If using subdomains, set to: .yourdomain.com
COOKIE_DOMAIN=
```

**Important Notes**:
- Replace `yourdomain.com` with your actual production domain
- Generate a secure `JWT_SECRET` using: `openssl rand -base64 32`
- Use the exact Client IDs and Secrets from Steps 3 and 4
- Ensure all URLs use `https://` (not `http://`)

---

## Step 6: Configure Frontend Environment Variables

Create or update `.env.production.local` in your project root:

```bash
# ============================================
# REQUIRED - API URL
# ============================================
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

**Note**: Replace `yourdomain.com` with your actual production domain.

---

## Step 7: Verify Redirect URI Configuration

### Critical: Redirect URIs must match exactly!

**In Google Cloud Console**, verify both OAuth credentials have:

1. **User Authentication (GOOGLE_CLIENT_ID)**:
   - ✅ Authorized redirect URI: `https://yourdomain.com/api/auth/google/callback`
   - ✅ Authorized JavaScript origin: `https://yourdomain.com`

2. **GA4 Integration (GA4_CLIENT_ID)**:
   - ✅ Authorized redirect URI: `https://yourdomain.com/api/auth/ga4/callback`
   - ✅ Authorized JavaScript origin: `https://yourdomain.com`

**In your backend `.env`**, verify:
- ✅ `GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback`
- ✅ `GA4_REDIRECT_URI=https://yourdomain.com/api/auth/ga4/callback`

**In your frontend**, verify:
- ✅ `NEXT_PUBLIC_API_URL=https://yourdomain.com/api`

**All URLs must match exactly** (including `https://`, no trailing slashes, correct domain).

---

## Step 8: Deploy and Test

### 8.1 Deploy Backend

1. Ensure all environment variables are set in your production environment
2. Restart your backend server
3. Verify backend is running: `curl https://yourdomain.com/api/health`

### 8.2 Deploy Frontend

1. Build your Next.js app: `npm run build`
2. Deploy to your hosting platform
3. Verify frontend is accessible: `https://yourdomain.com`

### 8.3 Test User Authentication

1. Go to `https://yourdomain.com`
2. Click "Sign in with Google"
3. You should be redirected to Google OAuth consent screen
4. After authorization, you should be redirected back to your app
5. Verify you're logged in

**If you get `redirect_uri_mismatch` error**:
- Check that redirect URI in Google Console matches exactly
- Check that `GOOGLE_CALLBACK_URL` in `.env` matches exactly
- URLs are case-sensitive!

### 8.4 Test GA4 Integration

1. Log in to your app
2. Navigate to Agent Analytics section
3. Click "Connect Google Analytics"
4. You should be redirected to Google OAuth consent screen
5. After authorization, you should be redirected back
6. Verify GA4 properties are listed

**If you get `redirect_uri_mismatch` error**:
- Check that redirect URI in Google Console matches exactly
- Check that `GA4_REDIRECT_URI` in `.env` matches exactly

---

## Step 9: Production Checklist

Before going live, verify:

### Google Cloud Console
- [ ] All required APIs are enabled
- [ ] OAuth consent screen is configured
- [ ] User Authentication OAuth credentials created
- [ ] GA4 OAuth credentials created
- [ ] All redirect URIs are correct (no typos, correct domain)
- [ ] All JavaScript origins are correct

### Backend Environment
- [ ] `NODE_ENV=production`
- [ ] `FRONTEND_URL` matches production domain
- [ ] `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are from production project
- [ ] `GA4_CLIENT_ID` and `GA4_CLIENT_SECRET` are from production project
- [ ] `GOOGLE_CALLBACK_URL` matches Google Console redirect URI
- [ ] `GA4_REDIRECT_URI` matches Google Console redirect URI
- [ ] `JWT_SECRET` is strong (32+ characters)
- [ ] `MONGODB_URI` is production database
- [ ] All URLs use `https://` (not `http://`)

### Frontend Environment
- [ ] `NEXT_PUBLIC_API_URL` matches production API endpoint
- [ ] Frontend is built and deployed

### Testing
- [ ] User authentication works
- [ ] GA4 connection works
- [ ] No console errors
- [ ] No CORS errors
- [ ] Cookies are set correctly (check browser DevTools)

---

## Troubleshooting

### Error: `redirect_uri_mismatch`

**Cause**: Redirect URI in Google Console doesn't match the one in your code.

**Fix**:
1. Check Google Cloud Console > Credentials > OAuth 2.0 Client ID
2. Verify redirect URI matches exactly (including `https://`, no trailing slash)
3. Update either Google Console or your `.env` file to match
4. Wait a few minutes for changes to propagate

### Error: `invalid_client`

**Cause**: Client ID or Client Secret is incorrect.

**Fix**:
1. Verify you're using credentials from the correct Google Cloud project
2. Check for typos in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
3. Ensure you're not mixing development and production credentials

### Error: `access_denied`

**Cause**: User denied permission or OAuth consent screen not configured.

**Fix**:
1. Check OAuth consent screen is configured
2. Verify required scopes are added
3. If in testing mode, ensure user is added as a test user

### Error: CORS errors

**Cause**: Frontend origin not allowed in backend CORS configuration.

**Fix**:
1. Check `FRONTEND_URL` in backend `.env`
2. Check `ALLOWED_ORIGINS` if using multiple domains
3. Verify frontend URL matches exactly (including `https://`)

### GA4 Properties Not Showing

**Cause**: User doesn't have access to GA4 properties or API not enabled.

**Fix**:
1. Verify Google Analytics Data API is enabled
2. Verify Google Analytics Admin API is enabled
3. Ensure the Google account has access to GA4 properties
4. Check that the OAuth scopes include `analytics.readonly`

---

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use different OAuth credentials** for development and production
3. **Rotate secrets regularly** (especially `JWT_SECRET`)
4. **Use HTTPS only** in production
5. **Keep OAuth client secrets secure** (never expose in frontend)
6. **Monitor OAuth usage** in Google Cloud Console
7. **Set up alerts** for unusual activity

---

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Analytics Data API](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [Google Analytics Admin API](https://developers.google.com/analytics/devguides/config/admin/v1)

---

## Quick Reference: Environment Variables Summary

### Backend (`backend/.env`)
```bash
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback

GA4_CLIENT_ID=xxx.apps.googleusercontent.com
GA4_CLIENT_SECRET=xxx
GA4_REDIRECT_URI=https://yourdomain.com/api/auth/ga4/callback

FRONTEND_URL=https://yourdomain.com
```

### Frontend (`.env.production.local`)
```bash
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

### Google Cloud Console
- User Auth Redirect URI: `https://yourdomain.com/api/auth/google/callback`
- GA4 Redirect URI: `https://yourdomain.com/api/auth/ga4/callback`
- JavaScript Origins: `https://yourdomain.com`

---

## Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all URLs match exactly
3. Check Google Cloud Console for error details
4. Review backend logs for detailed error messages
5. Check browser console for frontend errors

