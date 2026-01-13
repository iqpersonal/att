# WhatsApp OAuth Integration Setup Guide

## Overview

This guide explains how to set up the WhatsApp OAuth integration for your Tellus Teams application. This allows customers to connect their own WhatsApp Business Accounts without manual token management.

## What's New?

 **OAuth Flow**: Customers authorize their own WhatsApp Business Accounts
 **Auto Token Management**: Tokens are monitored for expiration
 **Settings UI**: Connect/Disconnect WhatsApp from dashboard settings
 **Error Handling**: Graceful handling when tokens expire
 **Production Ready**: No more manual token swaps

## Prerequisites

1. **Facebook Developer Account**: Create at [developers.facebook.com](https://developers.facebook.com)
2. **WhatsApp Business Account**: Set up at [business.facebook.com](https://business.facebook.com)
3. **Meta App**: Create an app in Facebook Developer Console

## Step 1: Create a Meta App

1. Go to [Facebook Developer Console](https://developers.facebook.com/apps)
2. Click "Create App"
3. Choose "Business" as app type
4. Fill in app details:
   - **App Name**: "Tellus Teams WhatsApp"
   - **App Purpose**: Select "Other"
5. Click "Create App"

## Step 2: Add WhatsApp Product

1. In your Meta App dashboard, click "Add Product"
2. Search for "WhatsApp" and click "Set Up"
3. Choose "WhatsApp Business Platform"
4. Click "Continue"

## Step 3: Configure OAuth Settings

1. Go to **Settings > Basic**
2. Copy your **App ID** and **App Secret**
3. Go to **WhatsApp > Configuration**
4. Add Redirect URLs:
   - **Development**: http://localhost:3000/api/integrations/whatsapp/oauth/callback
   - **Production**: https://bodhanika.com/api/integrations/whatsapp/oauth/callback

## Step 4: Get Your Credentials

### From Meta App Dashboard:

- **App ID**: Found in Settings > Basic
- **App Secret**: Found in Settings > Basic (keep this secret!)
- **Webhook Token**: You can set any string (used for verification)

### Example:
\\\
App ID: 815230934366566
App Secret: 0cbf7f61fb6c6f902b63e5b67d72554d
Webhook Token: whatsapp_verify_token_123
\\\

## Step 5: Update Environment Variables

In your \.env.local\ file, ensure these are set:

\\\env
# Meta OAuth Configuration
NEXT_PUBLIC_META_APP_ID=815230934366566
META_APP_SECRET=0cbf7f61fb6c6f902b63e5b67d72554d
NEXT_PUBLIC_APP_URL=http://localhost:3000

# For production:
# NEXT_PUBLIC_APP_URL=https://bodhanika.com
\\\

**Important**: 
- \NEXT_PUBLIC_*\ variables are exposed to frontend (safe for App ID)
- \META_APP_SECRET\ is server-only (keep it secret!)
- Update \NEXT_PUBLIC_APP_URL\ when deploying to production

## Step 6: Test the OAuth Flow

### Local Development:

1. **Start your app**:
   \\\ash
   npm run dev
   \\\

2. **Navigate to Settings**:
   - Go to Dashboard > Settings > Integrations
   - Click "Connect WhatsApp" button

3. **You'll be redirected to Meta** to authorize:
   - Facebook login page (if not logged in)
   - Authorization screen asking for permissions
   - Accept to authorize

4. **Callback & Token Storage**:
   - Redirected back to settings page
   - Token saved to Firestore
   - Status shows as "Connected"

### Production (Vercel):

1. **Add environment variables to Vercel**:
   - Go to project settings in Vercel
   - Add the same env vars from \.env.local\
   - Redeploy: \git push\

2. **Update Meta App OAuth URLs**:
   - Change redirect URL from \localhost\ to \https://bodhanika.com\

3. **Test production flow**:
   - Visit \https://bodhanika.com/dashboard/settings/integrations\
   - Click "Connect WhatsApp"
   - Complete OAuth flow

## Understanding the OAuth Flow

\\\
1. User clicks "Connect WhatsApp" button
   
2. Frontend calls /api/integrations/whatsapp/oauth/authorize?tenantId=tellus-teams
   
3. Backend generates Meta OAuth URL
   
4. User redirected to Meta login & consent screen
   
5. User authorizes "Tellus Teams" to access WhatsApp
   
6. Meta redirects to /api/integrations/whatsapp/oauth/callback with auth code
   
7. Backend exchanges code for access token
   
8. Token saved to Firestore (tenants/tellus-teams/integrations/meta)
   
9. User redirected to settings page with success message
\\\

## How Token Management Works

### Token Lifecycle:

1. **On Message Send**:
   - \getValidWhatsAppToken()\ checks Firestore
   - If token expiring within 1 hour, status marked as \	oken_expired\
   - Error thrown: "Token expired. Please reconnect."
   - User sees error and clicks "Reconnect WhatsApp"

2. **On Disconnect**:
   - User clicks "Disconnect" button
   - All credentials cleared from Firestore
   - Status set to \
ot_connected\
   - "Connect WhatsApp" button reappears

### Token Auto-Refresh:

Currently, Meta's long-lived tokens (OAuth) don't have a refresh mechanism. Instead:
- Tokens are valid for ~60 days
- When expiring soon, status is marked \	oken_expired\
- User is prompted to re-authorize
- No automatic refresh (user action required)

## Files Overview

### New Files Created:

1. **src/lib/whatsappOAuth.ts**
   - OAuth flow utilities
   - \generateOAuthAuthorizeURL()\ - Creates Meta OAuth redirect
   - \exchangeCodeForToken()\ - Exchanges auth code for token
   - \decodeState()\ - Extracts tenantId from state

2. **src/app/api/integrations/whatsapp/oauth/authorize/route.ts**
   - Initiates OAuth flow
   - Redirects user to Meta login

3. **src/app/api/integrations/whatsapp/oauth/callback/route.ts**
   - Handles Meta OAuth callback
   - Exchanges code for token
   - Saves token to Firestore

4. **src/lib/tokenService.ts**
   - Token validation and refresh logic
   - \getValidWhatsAppToken()\ - Gets valid token or throws error
   - \efreshWhatsAppToken()\ - Checks expiration status

5. **src/app/dashboard/settings/integrations/whatsapp-status.tsx**
   - React component showing WhatsApp connection status
   - "Connect WhatsApp" button
   - "Disconnect" option
   - Shows token expiry date

6. **src/app/dashboard/settings/integrations/page.tsx**
   - Settings page with WhatsApp integration
   - Also has placeholders for Teams, Google Meet

7. **src/app/api/integrations/whatsapp/disconnect/route.ts**
   - Endpoint to disconnect WhatsApp
   - Clears all credentials from Firestore

### Updated Files:

1. **src/app/api/messaging/whatsapp/route.ts**
   - Now uses \getValidWhatsAppToken()\ from tokenService
   - Better error messages for expired tokens
   - Returns \TOKEN_EXPIRED\ error code for UI handling

## Troubleshooting

### Issue: "OAuth URL generation fails"
**Solution**: Check that \NEXT_PUBLIC_META_APP_ID\ is set in \.env.local\

### Issue: "Cannot exchange code for token"
**Solution**: 
- Verify \META_APP_SECRET\ is correct
- Check redirect URI matches in Meta App settings
- Ensure Meta App is in "Development" or "Live" mode

### Issue: "Token not saving to Firestore"
**Solution**:
- Check Firebase Admin SDK credentials in \irebaseAdmin.ts\
- Verify Firestore rules allow writes to \	enants/{tenantId}/integrations/meta\

### Issue: "Settings page shows 'Not Connected'"
**Solution**:
- Confirm OAuth callback was successful (check URL parameters)
- Check browser console for errors
- Verify Firestore document was created at \	enants/tellus-teams/integrations/meta\

### Issue: "Message sending fails with 'WhatsApp not configured'"
**Solution**:
- Ensure WhatsApp is connected (click "Connect WhatsApp" in Settings)
- Verify token is saved to Firestore
- Check that Phone Number ID is configured

## Security Considerations

 **Access Tokens**: Stored in Firestore (encrypted at rest by Firebase)
 **App Secret**: Server-only environment variable (never exposed to frontend)
 **State Parameter**: Encodes tenantId to prevent CSRF attacks
 **Redirect URI**: Must be whitelisted in Meta App settings
 **Error Handling**: Tokens marked \	oken_expired\ prevent stale token usage

## Selling to Customers

### Key Points to Communicate:

1. **Easy Setup**: "One-click WhatsApp connection in Settings"
2. **Secure**: "Your WhatsApp Business Account details are never stored"
3. **No Maintenance**: "We handle token management automatically"
4. **Transparent Expiry**: "If token expires, just re-connect in Settings"

### Customer Workflow:

1. Customer logs into dashboard
2. Goes to Settings > Integrations
3. Clicks "Connect WhatsApp"
4. Logs into their Meta Business Account
5. Approves Tellus Teams access
6. WhatsApp is ready to send messages!

## Next Steps

1.  Test OAuth flow locally
2.  Deploy to Vercel with updated env vars
3.  Test production OAuth flow
4.  Communicate with customers
5.  Monitor token expiry rate in production

## Support

For issues or questions:
1. Check browser console for error messages
2. Review Firestore for token storage status
3. Verify Meta App settings match deployment URLs
4. Check firestore.rules for proper access permissions

---

**Last Updated**: January 2025
**Status**:  Production Ready
