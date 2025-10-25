# GA4 Integration - Quick Setup Summary

## 🎯 What You Need to Do

### 1. Google Cloud Console (5 minutes)

**Step 1**: Go to https://console.cloud.google.com/

**Step 2**: Create/Select Project
- Click project dropdown → "NEW PROJECT"
- Name: "Rankly GA4"
- Click "CREATE"

**Step 3**: Enable APIs
- Go to "APIs & Services" → "Library"
- Enable:
  - Google Analytics Data API ✅
  - Google Analytics Admin API ✅

**Step 4**: OAuth Consent Screen
- Go to "APIs & Services" → "OAuth consent screen"
- Choose "External" → "CREATE"
- Fill app name and email
- Add scopes:
  - `https://www.googleapis.com/auth/analytics.readonly`
  - `https://www.googleapis.com/auth/userinfo.profile`
  - `https://www.googleapis.com/auth/userinfo.email`
- Click "SAVE AND CONTINUE" through all steps

**Step 5**: Create OAuth Credentials
- Go to "APIs & Services" → "Credentials"
- Click "CREATE CREDENTIALS" → "OAuth client ID"
- Choose "Web application"
- Fill in:
  - Name: Rankly GA4 OAuth Client
  - Authorized redirect URIs: `http://localhost:5000/api/auth/ga4/callback`
- Click "CREATE"
- **COPY THE CLIENT ID AND CLIENT SECRET** 📋

### 2. Backend Environment Variables (2 minutes)

**Step 1**: Create `.env` file
```bash
cd try-rankly/backend
touch .env
```

**Step 2**: Add these variables to `.env`
```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/rankly

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# GA4 OAuth (use values from Google Cloud Console)
GA4_CLIENT_ID=paste-your-client-id-here
GA4_CLIENT_SECRET=paste-your-client-secret-here
GA4_REDIRECT_URI=http://localhost:5000/api/auth/ga4/callback

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-secret-key-minimum-32-characters
```

**Step 3**: Replace the placeholder values:
- `GA4_CLIENT_ID` → Your Client ID from Google Cloud Console
- `GA4_CLIENT_SECRET` → Your Client Secret from Google Cloud Console
- `JWT_SECRET` → Generate with: `openssl rand -base64 32`

### 3. Start MongoDB (if not running)

**Option A**: Local MongoDB
```bash
# Start MongoDB
mongod
# OR
brew services start mongodb-community
```

**Option B**: MongoDB Atlas
- Go to https://www.mongodb.com/cloud/atlas
- Create free cluster
- Get connection string
- Replace `MONGODB_URI` in `.env`

### 4. Test the Integration

**Terminal 1**: Start Backend
```bash
cd try-rankly/backend
npm run dev
```

**Terminal 2**: Start Frontend
```bash
cd try-rankly
npm run dev
```

**Terminal 3**: Open Browser
```bash
# Navigate to:
http://localhost:3000/agent-analytics

# Click "Connect Google Analytics"
# Complete OAuth flow
# Select GA4 property
# See your dashboard! 🎉
```

## 📋 Environment Variables Summary

### Required for GA4 Integration:
- `GA4_CLIENT_ID` ✅ (from Google Cloud Console)
- `GA4_CLIENT_SECRET` ✅ (from Google Cloud Console)
- `GA4_REDIRECT_URI` ✅ (must match Google Cloud Console)
- `MONGODB_URI` ✅ (local or Atlas)
- `FRONTEND_URL` ✅ (usually http://localhost:3000)
- `JWT_SECRET` ✅ (generate secure random string)

### Your Existing Variables (don't change):
- `GOOGLE_CLIENT_ID` (for user auth - separate from GA4)
- `GOOGLE_CLIENT_SECRET` (for user auth - separate from GA4)
- Any other existing variables

## ⚠️ Important Notes

1. **Separate OAuth Credentials**: GA4 uses different credentials than user authentication
2. **Redirect URI Must Match**: Exact match between `.env` and Google Cloud Console
3. **Port 5000**: Backend must run on port 5000 (or update redirect URI)
4. **MongoDB Required**: GA4 connections are stored in MongoDB

## 🐛 Common Issues & Solutions

**"redirect_uri_mismatch"**
→ Check redirect URI matches exactly in Google Cloud Console

**"GA4_CLIENT_ID must be set"**
→ Check `.env` file exists and has correct variable names

**"MongoDB connection error"**
→ Start MongoDB: `mongod` or `brew services start mongodb-community`

**Port 5000 in use**
→ Kill process: `lsof -ti:5000 | xargs kill`

## 📚 Full Documentation

For detailed step-by-step instructions, see:
- `try-rankly/backend/GA4_SETUP_COMPLETE_GUIDE.md`

## ✅ Checklist

- [ ] Google Cloud project created
- [ ] APIs enabled (Analytics Data & Admin)
- [ ] OAuth consent screen configured
- [ ] OAuth credentials created
- [ ] Client ID and Secret copied
- [ ] `.env` file created
- [ ] Environment variables added
- [ ] MongoDB running
- [ ] Backend starts successfully
- [ ] Frontend connects
- [ ] GA4 OAuth flow works

## 🎉 Success Indicators

✅ Backend starts on port 5000
✅ Frontend connects to backend
✅ "Connect Google Analytics" button redirects to Google
✅ OAuth consent screen appears
✅ After consent, redirected to property selection
✅ Property selection shows your GA4 properties
✅ After selection, dashboard loads with real data

## 💡 Quick Links

- Google Cloud Console: https://console.cloud.google.com/
- MongoDB Atlas: https://www.mongodb.com/cloud/atlas
- Local Backend: http://localhost:5000/health
- Frontend: http://localhost:3000/agent-analytics

