# GA4 OAuth Setup Guide - Using Existing Google Cloud Project

## ✅ You Already Have a Google Cloud Project!

**Your existing project**:
- Project contains OAuth client: `206614702129-lm7o5pimfoncpkjhimocvka7l1t0m9bo.apps.googleusercontent.com`
- Use this **same project** for GA4 OAuth

## 🎯 What You Need to Do

### Step 1: Create a NEW OAuth Client (Not a New Project)

1. **Go to Google Cloud Console Credentials**:
   - Direct link: https://console.cloud.google.com/apis/credentials
   - Or navigate: Console → APIs & Services → Credentials

2. **Make sure you're in the correct project**:
   - Look for the project that contains `206614702129-lm7o5pimfoncpkjhimocvka7l1t0m9bo`
   - The project name is likely something like "rankly" or your custom name

3. **Click "CREATE CREDENTIALS"** → Select **"OAuth client ID"**

4. **If prompted for OAuth consent screen**, click "CONFIGURE CONSENT SCREEN" first:
   - Make sure these scopes are added:
     - `https://www.googleapis.com/auth/analytics.readonly` ✅
     - `https://www.googleapis.com/auth/userinfo.profile` ✅
     - `https://www.googleapis.com/auth/userinfo.email` ✅
   - Save and go back to Credentials

5. **Fill in the OAuth client form**:
   - **Application type**: Web application
   - **Name**: GA4 OAuth Client
   - **Authorized JavaScript origins**: `http://localhost:5000`
   - **Authorized redirect URIs**: `http://localhost:5000/api/auth/ga4/callback`

6. **Click "CREATE"**

7. **Copy the credentials**:
   - You'll see a popup with:
     - **Client ID**: Something like `123456789-abcdef.apps.googleusercontent.com`
     - **Client Secret**: Something like `GOCSPX-xxxxxxxxxxxx`
   - **IMPORTANT**: Copy both values

### Step 2: Enable Required APIs

Even though you have an existing project, you need to enable GA4 APIs:

1. **Go to API Library**: https://console.cloud.google.com/apis/library
2. **Search and enable**:
   - **Google Analytics Data API** → Click "ENABLE"
   - **Google Analytics Admin API** → Click "ENABLE"

### Step 3: Update Your Backend .env File

Your `.env` file is at: `try-rankly/backend/.env`

Replace these placeholder values with the credentials from Step 1:

```bash
# GA4 OAuth Configuration
GA4_CLIENT_ID=your-new-client-id-from-step-1
GA4_CLIENT_SECRET=your-new-client-secret-from-step-1
GA4_REDIRECT_URI=http://localhost:5000/api/auth/ga4/callback
```

**Example**:
```bash
GA4_CLIENT_ID=206614702129-xyz123abc456.apps.googleusercontent.com
GA4_CLIENT_SECRET=GOCSPX-AbCdEfGhIjKlMnOpQrStUvWxYz
GA4_REDIRECT_URI=http://localhost:5000/api/auth/ga4/callback
```

### Step 4: Verify Your Setup

After updating `.env`, verify your backend has these variables:

**User Auth** (existing - don't change):
- `GOOGLE_CLIENT_ID` = Your existing client ID ✅
- `GOOGLE_CLIENT_SECRET` = Your existing client secret ✅
- Used for: User authentication (login/signup)

**GA4 Auth** (new - you just created):
- `GA4_CLIENT_ID` = Your NEW client ID ✅
- `GA4_CLIENT_SECRET` = Your NEW client secret ✅
- Used for: GA4 analytics connection

## 🔄 Summary

**Do NOT create a new project** ✅

**DO create a new OAuth client** ✅

**Why two separate OAuth clients?**
- Different purposes (user auth vs analytics)
- Different redirect URIs (port 3000 vs port 5000)
- Different scopes (profile/email vs analytics.readonly)
- Clean separation, no conflicts

## 📝 Quick Reference

**Your Setup**:
- Project: Existing project (contains `206614702129-lm7o5pimfoncpkjhimocvka7l1t0m9bo`)
- User Auth Client: `206614702129-lm7o5pimfoncpkjhimocvka7l1t0m9bo.apps.googleusercontent.com` ✅ (existing)
- GA4 Auth Client: Create new one ✅ (to be created)

**Google Cloud Console Links**:
- Credentials: https://console.cloud.google.com/apis/credentials
- API Library: https://console.cloud.google.com/apis/library
- OAuth Consent Screen: https://console.cloud.google.com/apis/credentials/consent

## ⚠️ Important Notes

1. **Same Project**: Use your existing Google Cloud project
2. **New Client**: Create a new OAuth client ID (different from user auth)
3. **Different Redirect URIs**: 
   - User auth: `http://localhost:3000/api/auth/google/callback`
   - GA4 auth: `http://localhost:5000/api/auth/ga4/callback`
4. **Enable GA4 APIs**: Make sure Analytics Data API and Admin API are enabled

## ✅ Checklist

- [ ] Found your existing Google Cloud project
- [ ] Enabled Google Analytics Data API
- [ ] Enabled Google Analytics Admin API
- [ ] Created new OAuth client for GA4
- [ ] Added redirect URI: `http://localhost:5000/api/auth/ga4/callback`
- [ ] Copied new Client ID and Secret
- [ ] Updated `GA4_CLIENT_ID` in `.env`
- [ ] Updated `GA4_CLIENT_SECRET` in `.env`
- [ ] Verified `.env` has both user auth and GA4 auth credentials

## 🚀 After Setup

Once you've added the credentials to `.env`:

1. Start backend: `cd try-rankly/backend && npm run dev`
2. Start frontend: `cd try-rankly && npm run dev`
3. Test: Navigate to `http://localhost:3000/agent-analytics`
4. Click "Connect Google Analytics"
5. You should see Google OAuth consent screen
6. After consent, select your GA4 property
7. Dashboard loads with real GA4 data! 🎉

