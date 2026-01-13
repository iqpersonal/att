# Meta Token Refresh System - Setup Instructions

## What Was Implemented

### 1.  Automatic Daily Token Refresh
- **Cloud Function**: efreshMetaTokensDaily runs every day at 2 AM UTC
- **Check**: Scans all tenant Meta tokens
- **Refresh**: Automatically refreshes tokens expiring within 7 days
- **Fallback**: Keeps token history (last 5 versions) for rollback if needed

### 2.  Manual Refresh Endpoint
- **Endpoint**: POST /api/integrations/meta
- **Purpose**: Admins can manually trigger token refresh
- **Authentication**: Requires NextAuth session
- **Response**: New token expiry and version info

### 3.  Token Status Dashboard
- **Component**: MetaTokenStatus.tsx
- **Display**: Shows token expiry countdown, refresh history, version
- **Auto-refresh**: Checks status every minute
- **Actions**: Manual refresh button with loading state

### 4.  Audit Logging
- **Storage**: tenants/{tenantId}/integrations/meta/refreshLog/
- **Logs**: Every refresh attempt (success/failure), who triggered it, timestamp, expiry changes
- **History**: Last 5 token versions stored for rollback capability

## Configuration Required

### Step 1: Add Meta App Credentials to functions/.env

The System User token is already set. Now add your Meta App ID & Secret:

\\\ash
# Replace with your actual Meta App ID and Secret
META_APP_ID=your_meta_app_id_here
META_APP_SECRET=your_meta_app_secret_here
META_SYSTEM_USER_TOKEN=EAALlcr5AuWYBQZAr2ADI9E4NC6GgKFthMXmEsZBZBoqzZBWXrJ48kZBOO7vL3cd8UgSMxn4xbbmFUZBOitxM7xJRXIy1BlX0XWWZCZALIk1fJYzs3ECkIOSoJNWN94MoHtng2IhKmQFFSaDIPej1UR94ZCc47248jG0FfhXWDd3ZARANwOGpt12D7DcjqnaMvcRaMMYgZDZD
\\\

**Where to find these:**
- Meta App ID: Facebook App Dashboard  Settings  Basic
- Meta App Secret: Facebook App Dashboard  Settings  Basic (Show Secret)

### Step 2: Initialize Firestore Schema for First Tenant

Your tenant Meta config needs expiresAt field. Add to Firestore:

\\\
tenants/tellus-teams/integrations/meta
   accessToken: "your_whatsapp_token"
   expiresAt: 1708123456 (Unix timestamp, ~60 days from now)
   refreshedAt: 1705531456
   tokenVersion: 1
   tokenHistory: []
   phoneNumberId: "786617204538778"
   wabaId: "25425371247051012"
   facebookPageId: "your_page_id"
\\\

### Step 3: Deploy Cloud Functions

After setting META_APP_ID and META_APP_SECRET:

\\\ash
cd functions
npm run build
firebase deploy --only functions:refreshMetaTokensDaily
\\\

### Step 4: Use Token Status Component in Dashboard

Import and add to your dashboard page:

\\\	sx
import { MetaTokenStatus } from '@/components/MetaTokenStatus';

export default function AdminDashboard() {
  return (
    <div>
      <MetaTokenStatus tenantId="tellus-teams" />
      {/* rest of dashboard */}
    </div>
  );
}
\\\

## How It Works

### Automatic Refresh (Daily at 2 AM UTC)
1. Cloud Function checks all tenants
2. For tokens expiring within 7 days:
   - Calls Meta API with App ID/Secret to refresh token
   - Stores old token in history
   - Updates expiresAt timestamp
   - Logs refresh event in Firestore

### Manual Refresh (Admin Dashboard)
1. Admin clicks "Refresh Token" button
2. API calls refreshMetaTokensDaily logic
3. Shows success/failure with new expiry
4. Updates dashboard in real-time

### Token History & Rollback
- Last 5 token versions kept in tokenHistory array
- If new token fails, admin can manually rollback
- Each version stores: token, expiresAt, createdAt

## API Endpoints

### GET /api/integrations/meta
Get current token status:
\\\json
{
  "isConfigured": true,
  "expiresAt": 1708123456,
  "expiry": {
    "daysRemaining": 45,
    "formatted": "45 days",
    "isExpired": false
  },
  "lastRefreshed": 1705531456,
  "tokenVersion": 2,
  "hasHistory": true
}
\\\

### POST /api/integrations/meta
Manually refresh token:
\\\json
{
  "success": true,
  "expiresAt": 1708123456,
  "expiry": {
    "daysRemaining": 60,
    "formatted": "60 days",
    "isExpired": false
  },
  "tokenVersion": 3
}
\\\

## Environment Variables Summary

| Variable | Where | Value | Required |
|----------|-------|-------|----------|
| META_SYSTEM_USER_TOKEN | functions/.env | Your token (non-expiring) |  Yes (Set) |
| META_APP_ID | functions/.env | Meta App ID |  Yes (TODO) |
| META_APP_SECRET | functions/.env | Meta App Secret |  Yes (TODO) |
| NEXT_PUBLIC_FIREBASE_PROJECT_ID | .env.local | tellusteams |  Yes |

## Files Created/Modified

### New Files
- src/app/api/integrations/meta/route.ts - Token refresh API
- src/lib/metaTokenService.ts - Token utility functions
- src/components/MetaTokenStatus.tsx - Dashboard component
- functions/.env - Cloud Functions environment

### Modified Files
- functions/src/index.ts - Added refreshMetaTokensDaily Cloud Function

## Testing

### Test Manual Refresh
\\\ash
curl -X POST http://localhost:3000/api/integrations/meta \\
  -H "Content-Type: application/json" \\
  -d '{"tenantId":"tellus-teams"}'
\\\

### Test Status Check
\\\ash
curl http://localhost:3000/api/integrations/meta?tenantId=tellus-teams
\\\

### View Refresh Logs in Firestore
\\\
tenants/tellus-teams/integrations/meta/refreshLog/{timestamp}
   status: "success"
   timestamp: 1705531456
   oldExpiryDays: 7
   newExpiryDays: 60
   tokenVersion: 3
   autoRefreshed: true
\\\

## Next Steps

1. **Get Meta App Credentials**: [Facebook Developer Console](https://developers.facebook.com/apps/)
2. **Update functions/.env**: Add META_APP_ID and META_APP_SECRET
3. **Update Firestore**: Add expiresAt to your tenant's Meta config
4. **Deploy**: \irebase deploy --only functions:refreshMetaTokensDaily\
5. **Add Component**: Import MetaTokenStatus in admin dashboard
6. **Test**: Verify token refresh works manually and automatically

---
**System User Token Status**:  Non-expiring (Valid indefinitely)
**WhatsApp Token Refresh**:  Waiting for Meta App ID/Secret configuration
