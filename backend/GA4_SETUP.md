# GA4 Traffic Analytics Backend Setup

## Environment Variables

Add the following environment variables to your `.env` file:

```bash
# GA4 OAuth (separate from user auth)
GA4_CLIENT_ID=your-ga4-client-id-here
GA4_CLIENT_SECRET=your-ga4-client-secret-here
GA4_REDIRECT_URI=http://localhost:5000/api/auth/ga4/callback

# Frontend URL (for OAuth redirects)
FRONTEND_URL=http://localhost:3000
```

## Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Google Analytics Data API
   - Google Analytics Admin API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure OAuth consent screen (if not already done)
6. Create OAuth client with:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:5000/api/auth/ga4/callback`
   - Scopes:
     - `https://www.googleapis.com/auth/analytics.readonly`
     - `https://www.googleapis.com/auth/userinfo.profile`
     - `https://www.googleapis.com/auth/userinfo.email`
7. Copy the Client ID and Client Secret to your `.env` file

## MongoDB Setup

The GA4 integration uses MongoDB to store connection data. Make sure your `MONGODB_URI` is configured in your `.env`:

```bash
MONGODB_URI=mongodb://localhost:27017/rankly
```

The system will automatically create the `GAConnection` collection.

## API Endpoints

### GA4 OAuth Flow

- `GET /api/auth/ga4` - Initiate GA4 OAuth flow
- `GET /api/auth/ga4/callback` - Handle OAuth callback

### GA4 Property Management

- `GET /api/ga4/accounts-properties` - Fetch available GA4 accounts and properties
- `POST /api/ga4/save-property` - Save selected GA4 property
- `GET /api/ga4/connection-status` - Check GA4 connection status
- `POST /api/ga4/disconnect` - Disconnect GA4 connection

### GA4 Data Endpoints

- `GET /api/ga4/data` - Fetch basic GA4 metrics
- `GET /api/ga4/llm-platforms` - Fetch LLM platform traffic data
- `GET /api/ga4/llm-platform-trends` - Fetch LLM platform trend data
- `GET /api/ga4/platform-split` - Fetch platform split data
- `GET /api/ga4/geo` - Fetch geographic data
- `GET /api/ga4/devices` - Fetch device data
- `GET /api/ga4/pages` - Fetch pages data
- `GET /api/ga4/conversion-events` - Fetch conversion events data

## Testing the Integration

1. Start the backend server:
   ```bash
   npm run dev
   ```

2. Initiate GA4 OAuth:
   - Navigate to: `http://localhost:5000/api/auth/ga4`
   - Complete Google OAuth consent
   - Should redirect to: `http://localhost:3000/agent-analytics?oauth_complete=true`

3. Verify MongoDB:
   - Check that a `GAConnection` document was created with `isActive: false`

4. Complete property selection (via frontend):
   - Call `GET /api/ga4/accounts-properties` to fetch available properties
   - Call `POST /api/ga4/save-property` with `{ accountId, propertyId }`
   - Verify `GAConnection` document updated with `isActive: true`

5. Test data fetching:
   - Call any GA4 data endpoint
   - Verify real GA4 data is returned

## Key Features

### Complete Separation from User Auth

- **Different OAuth Endpoints**: `/api/auth/google` (user) vs `/api/auth/ga4` (analytics)
- **Different Credentials**: `GOOGLE_CLIENT_ID` vs `GA4_CLIENT_ID`
- **Different Scopes**: User auth vs Analytics read-only
- **Different Sessions**: JWT tokens vs `ga4_session` cookie
- **Different Models**: `User` collection vs `GAConnection` collection

### Session Management

- GA4 sessions stored in `ga4_session` cookie (30-day expiry)
- Session contains: userId, accessToken, refreshToken, property info
- Sessions are automatically refreshed when tokens expire

### Token Refresh

- Access tokens automatically refreshed when expiring (< 5 minutes remaining)
- Refresh tokens used to obtain new access tokens
- Updated tokens saved to both MongoDB and session cookie

## Notes

- GA4 OAuth is completely separate from user authentication
- Users can be authenticated without connecting GA4
- GA4 connection is optional and specific to Agent Analytics tab
- No conflicts between authentication flows

