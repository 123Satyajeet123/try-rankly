# GA4 Google Cloud Console Setup - Complete Guide

## Step-by-Step Instructions

### Part 1: Google Cloud Console Setup

#### 1.1 Create or Select Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "NEW PROJECT" (or select existing project)
4. Enter project name: "Rankly GA4 Integration" (or your preferred name)
5. Click "CREATE"

#### 1.2 Enable Required APIs

1. In the Google Cloud Console, click the hamburger menu (☰) top left
2. Go to "APIs & Services" → "Library"
3. Search for and enable these APIs:
   - **Google Analytics Data API** (click "ENABLE")
   - **Google Analytics Admin API** (click "ENABLE")

#### 1.3 Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose **"External"** (for public use)
3. Click "CREATE"
4. Fill in the required information:
   - **App name**: Rankly GA4
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click "SAVE AND CONTINUE"
6. On "Scopes" page, click "ADD OR REMOVE SCOPES"
7. Add these scopes:
   - `https://www.googleapis.com/auth/analytics.readonly`
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `https://www.googleapis.com/auth/userinfo.email`
8. Click "UPDATE" → "SAVE AND CONTINUE"
9. Add test users (if needed):
   - Add your Google account email
   - Click "SAVE AND CONTINUE"
10. Click "BACK TO DASHBOARD"

#### 1.4 Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "CREATE CREDENTIALS" → "OAuth client ID"
3. If prompted, select "Web application"
4. Fill in the details:
   - **Name**: Rankly GA4 OAuth Client
   - **Authorized JavaScript origins**: 
     - `http://localhost:5000`
   - **Authorized redirect URIs**:
     - `http://localhost:5000/api/auth/ga4/callback`
5. Click "CREATE"
6. **IMPORTANT**: Copy the **Client ID** and **Client Secret** shown in the popup
   - Client ID will look like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`
   - Client Secret will look like: `GOCSPX-xxxxxxxxxxxxxxxxxxxxx`
   - **Save these credentials** - you'll need them for the `.env` file

### Part 2: Backend Environment Variables

#### 2.1 Create `.env` File

Create a file named `.env` in `try-rankly/backend/` directory:

```bash
cd try-rankly/backend
touch .env
```

#### 2.2 Add Required Environment Variables

Open `try-rankly/backend/.env` and add these variables:

```bash
# ============================================
# MongoDB Configuration
# ============================================
MONGODB_URI=mongodb://localhost:27017/rankly

# ============================================
# Server Configuration
# ============================================
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# ============================================
# Existing Google OAuth (User Authentication)
# ============================================
GOOGLE_CLIENT_ID=your-existing-google-client-id
GOOGLE_CLIENT_SECRET=your-existing-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# ============================================
# GA4 OAuth Configuration (Analytics Connection)
# ============================================
# Replace these with the values from Google Cloud Console
GA4_CLIENT_ID=your-ga4-client-id-from-console
GA4_CLIENT_SECRET=your-ga4-client-secret-from-console
GA4_REDIRECT_URI=http://localhost:5000/api/auth/ga4/callback

# ============================================
# JWT & Session Configuration
# ============================================
JWT_SECRET=your-secret-key-here-minimum-32-characters-long

# ============================================
# Other Backend Configuration
# ============================================
# Add your existing backend env vars here...
```

#### 2.3 Replace Placeholder Values

**Replace these specific values:**

1. **GA4_CLIENT_ID**: Use the Client ID from Google Cloud Console (step 1.4)
2. **GA4_CLIENT_SECRET**: Use the Client Secret from Google Cloud Console (step 1.4)
3. **JWT_SECRET**: Generate a secure random string (at least 32 characters)
   - You can generate one using: `openssl rand -base64 32`
4. **MONGODB_URI**: If using MongoDB Atlas instead of local, replace with your Atlas connection string
5. **FRONTEND_URL**: If your frontend runs on a different port, update accordingly

### Part 3: MongoDB Setup

#### 3.1 Local MongoDB (Recommended for Development)

If you have MongoDB installed locally:
- MongoDB should be running on `localhost:27017`
- The database `rankly` will be auto-created

#### 3.2 MongoDB Atlas (Alternative)

If you prefer MongoDB Atlas:
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get connection string
4. Replace `MONGODB_URI` in `.env` with your Atlas connection string

### Part 4: Testing the Setup

#### 4.1 Start Backend Server

```bash
cd try-rankly/backend
npm run dev
```

Expected output:
```
✅ MongoDB connected
🚀 Rankly Backend API running on port 5000
📊 Health check: http://localhost:5000/health
```

#### 4.2 Start Frontend

```bash
cd try-rankly
npm run dev
```

#### 4.3 Test GA4 OAuth Flow

1. Navigate to `http://localhost:3000/agent-analytics`
2. Click "Connect Google Analytics"
3. You should be redirected to Google OAuth consent screen
4. Sign in with your Google account
5. Grant permissions
6. You should be redirected back to property selection
7. Select your GA4 property
8. Dashboard should load with real GA4 data

### Part 5: Troubleshooting

#### Common Issues

**Issue**: "GA4_CLIENT_ID and GA4_REDIRECT_URI must be set"
- **Solution**: Check your `.env` file exists and has the correct variable names

**Issue**: "redirect_uri_mismatch"
- **Solution**: Ensure the redirect URI in Google Cloud Console exactly matches: `http://localhost:5000/api/auth/ga4/callback`

**Issue**: "Access blocked: This app's request is invalid"
- **Solution**: Make sure OAuth consent screen is configured correctly

**Issue**: "MongoDB connection error"
- **Solution**: Start MongoDB: `mongod` or `brew services start mongodb-community`

**Issue**: Port 5000 already in use
- **Solution**: Kill the process: `lsof -ti:5000 | xargs kill` or change PORT in `.env`

### Part 6: Production Deployment

For production deployment, update:

1. **Google Cloud Console**:
   - Add production domain to Authorized JavaScript origins
   - Add production redirect URI: `https://yourdomain.com/api/auth/ga4/callback`

2. **Environment Variables**:
   - Update `FRONTEND_URL` to production URL
   - Update `GA4_REDIRECT_URI` to production URL
   - Use secure `JWT_SECRET` (not the development one)
   - Set `NODE_ENV=production`

## Summary Checklist

- [ ] Google Cloud project created
- [ ] Google Analytics Data API enabled
- [ ] Google Analytics Admin API enabled
- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 credentials created
- [ ] Client ID and Client Secret copied
- [ ] `.env` file created in backend
- [ ] All environment variables added
- [ ] Placeholder values replaced with real credentials
- [ ] MongoDB running (local or Atlas)
- [ ] Backend server starts without errors
- [ ] Frontend connects to backend
- [ ] GA4 OAuth flow works end-to-end

## Quick Reference

**Required Google Cloud URLs:**
- Console: https://console.cloud.google.com/
- OAuth consent screen: https://console.cloud.google.com/apis/credentials/consent
- Credentials: https://console.cloud.google.com/apis/credentials

**Backend Endpoints:**
- Health check: http://localhost:5000/health
- GA4 OAuth start: http://localhost:5000/api/auth/ga4
- GA4 Callback: http://localhost:5000/api/auth/ga4/callback

**Environment File Location:**
- `try-rankly/backend/.env`

