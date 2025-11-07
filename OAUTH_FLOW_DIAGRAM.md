# OAuth Flow Diagrams

Visual representation of how Google Authentication and GA4 integration work in production.

## User Authentication Flow (Google OAuth)

```
┌─────────────┐
│   Browser   │
│  (Frontend) │
└──────┬──────┘
       │
       │ 1. User clicks "Sign in with Google"
       │
       ▼
┌─────────────────────────────────────┐
│  Frontend: /api/auth/google/route   │
│  Redirects to backend OAuth endpoint│
└──────┬──────────────────────────────┘
       │
       │ 2. Redirect to backend
       │
       ▼
┌─────────────────────────────────────┐
│  Backend: /api/auth/google          │
│  (passport-google-oauth20)          │
└──────┬──────────────────────────────┘
       │
       │ 3. Redirect to Google OAuth
       │    Uses: GOOGLE_CLIENT_ID
       │    Redirect: GOOGLE_CALLBACK_URL
       │
       ▼
┌─────────────────────────────────────┐
│  Google OAuth Consent Screen        │
│  - User selects account             │
│  - Grants permissions               │
└──────┬──────────────────────────────┘
       │
       │ 4. User authorizes
       │
       ▼
┌─────────────────────────────────────┐
│  Backend: /api/auth/google/callback │
│  - Receives authorization code      │
│  - Exchanges for tokens             │
│  - Creates/updates user in MongoDB  │
│  - Generates JWT token              │
└──────┬──────────────────────────────┘
       │
       │ 5. Redirect with JWT token
       │
       ▼
┌─────────────────────────────────────┐
│  Frontend: /onboarding?token=xxx    │
│  - User is authenticated            │
│  - Can access protected routes      │
└─────────────────────────────────────┘
```

### Environment Variables Used:
- `GOOGLE_CLIENT_ID` - OAuth client ID from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - OAuth client secret
- `GOOGLE_CALLBACK_URL` - Must match Google Console redirect URI

---

## GA4 Integration Flow (Google Analytics OAuth)

```
┌─────────────┐
│   Browser   │
│  (Frontend) │
└──────┬──────┘
       │
       │ 1. User clicks "Connect Google Analytics"
       │
       ▼
┌─────────────────────────────────────┐
│  Frontend: Agent Analytics Page     │
│  Calls: initiateGA4OAuth()          │
└──────┬──────────────────────────────┘
       │
       │ 2. Redirect to backend
       │
       ▼
┌─────────────────────────────────────┐
│  Backend: /api/auth/ga4             │
│  - Generates PKCE code verifier     │
│  - Stores in session                │
│  - Builds OAuth URL                 │
└──────┬──────────────────────────────┘
       │
       │ 3. Redirect to Google OAuth
       │    Uses: GA4_CLIENT_ID
       │    Redirect: GA4_REDIRECT_URI
       │    Scopes: analytics.readonly
       │
       ▼
┌─────────────────────────────────────┐
│  Google OAuth Consent Screen        │
│  - User selects account             │
│  - Grants Analytics access          │
└──────┬──────────────────────────────┘
       │
       │ 4. User authorizes
       │
       ▼
┌─────────────────────────────────────┐
│  Backend: /api/auth/ga4/callback    │
│  - Receives authorization code      │
│  - Exchanges code for tokens        │
│  - Gets user info                   │
│  - Saves to GAConnection (MongoDB)  │
│  - Sets ga4_session cookie          │
└──────┬──────────────────────────────┘
       │
       │ 5. Redirect to frontend
       │
       ▼
┌─────────────────────────────────────┐
│  Frontend: /agent-analytics         │
│  ?oauth_complete=true               │
│  - GA4 connected                    │
│  - Can fetch GA4 properties         │
└─────────────────────────────────────┘
```

### Environment Variables Used:
- `GA4_CLIENT_ID` - OAuth client ID from Google Cloud Console
- `GA4_CLIENT_SECRET` - OAuth client secret
- `GA4_REDIRECT_URI` - Must match Google Console redirect URI

---

## Google Cloud Console Configuration

```
┌─────────────────────────────────────────────┐
│      Google Cloud Console                   │
│      (Your Production Project)              │
└─────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐      ┌───────────────┐
│ OAuth Client 1│      │ OAuth Client 2│
│ (User Auth)   │      │ (GA4)         │
├───────────────┤      ├───────────────┤
│ Name:         │      │ Name:         │
│ User Auth     │      │ GA4 Integration│
│               │      │               │
│ Client ID:    │      │ Client ID:    │
│ → GOOGLE_     │      │ → GA4_        │
│   CLIENT_ID   │      │   CLIENT_ID   │
│               │      │               │
│ Client Secret:│      │ Client Secret:│
│ → GOOGLE_     │      │ → GA4_        │
│   CLIENT_     │      │   CLIENT_     │
│   SECRET      │      │   SECRET      │
│               │      │               │
│ Redirect URI: │      │ Redirect URI: │
│ /api/auth/    │      │ /api/auth/    │
│ google/       │      │ ga4/callback  │
│ callback      │      │               │
└───────────────┘      └───────────────┘
```

---

## Environment Variables Mapping

### Backend (.env)
```
┌─────────────────────────────────────────────┐
│           backend/.env                      │
├─────────────────────────────────────────────┤
│                                             │
│  # User Authentication                      │
│  GOOGLE_CLIENT_ID=xxx.apps.google...       │
│  GOOGLE_CLIENT_SECRET=xxx                  │
│  GOOGLE_CALLBACK_URL=https://.../callback  │
│                                             │
│  # GA4 Integration                          │
│  GA4_CLIENT_ID=yyy.apps.google...          │
│  GA4_CLIENT_SECRET=yyy                     │
│  GA4_REDIRECT_URI=https://.../callback     │
│                                             │
│  # Frontend                                 │
│  FRONTEND_URL=https://yourdomain.com       │
│                                             │
└─────────────────────────────────────────────┘
```

### Frontend (.env.production.local)
```
┌─────────────────────────────────────────────┐
│      .env.production.local                  │
├─────────────────────────────────────────────┤
│                                             │
│  NEXT_PUBLIC_API_URL=https://.../api       │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Critical URL Matching

All of these must match **exactly**:

```
┌─────────────────────────────────────────────┐
│  Google Cloud Console                       │
│  (OAuth Client 1 - User Auth)              │
│  Redirect URI:                              │
│  https://yourdomain.com/api/auth/google/    │
│           callback                          │
└─────────────────────────────────────────────┘
                    │
                    │ MUST MATCH
                    │
                    ▼
┌─────────────────────────────────────────────┐
│  backend/.env                               │
│  GOOGLE_CALLBACK_URL=                       │
│  https://yourdomain.com/api/auth/google/    │
│           callback                          │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Google Cloud Console                       │
│  (OAuth Client 2 - GA4)                    │
│  Redirect URI:                              │
│  https://yourdomain.com/api/auth/ga4/       │
│           callback                          │
└─────────────────────────────────────────────┘
                    │
                    │ MUST MATCH
                    │
                    ▼
┌─────────────────────────────────────────────┐
│  backend/.env                               │
│  GA4_REDIRECT_URI=                          │
│  https://yourdomain.com/api/auth/ga4/       │
│           callback                          │
└─────────────────────────────────────────────┘
```

**Important**: URLs are case-sensitive and must match exactly, including:
- Protocol (`https://`)
- Domain (no typos)
- Path (exact path)
- No trailing slashes

---

## API Endpoints Summary

### User Authentication
- **Initiate**: `GET /api/auth/google`
- **Callback**: `GET /api/auth/google/callback`
- **Backend Route**: `backend/src/routes/auth.js`

### GA4 Integration
- **Initiate**: `GET /api/auth/ga4`
- **Callback**: `GET /api/auth/ga4/callback`
- **Backend Route**: `backend/src/routes/ga4Auth.js`

---

## Data Storage

### User Authentication
- **Model**: `User` (MongoDB)
- **Fields**: `googleId`, `email`, `access`, `lastLogin`
- **Session**: JWT token stored in browser

### GA4 Integration
- **Model**: `GAConnection` (MongoDB)
- **Fields**: `userId`, `email`, `accessToken`, `refreshToken`, `accessTokenExpiry`
- **Session**: `ga4_session` cookie (httpOnly, secure)

---

## Troubleshooting Flow

```
Error: redirect_uri_mismatch
    │
    ├─→ Check Google Console redirect URI
    ├─→ Check .env redirect URI
    └─→ Verify they match exactly

Error: invalid_client
    │
    ├─→ Check Client ID in .env
    ├─→ Check Client Secret in .env
    └─→ Verify from correct Google project

Error: CORS
    │
    ├─→ Check FRONTEND_URL in .env
    ├─→ Check ALLOWED_ORIGINS
    └─→ Verify frontend domain matches
```

---

For detailed setup instructions, see:
- [GOOGLE_CLOUD_PRODUCTION_SETUP.md](./GOOGLE_CLOUD_PRODUCTION_SETUP.md)
- [PRODUCTION_SETUP_CHECKLIST.md](./PRODUCTION_SETUP_CHECKLIST.md)

