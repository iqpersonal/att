# WhatsApp OAuth Integration - Visual Testing Guide

## Quick Start Testing (15 minutes)

### Step 1: Start Development Server
\\\ash
cd c:\Users\iqbal\Desktop\Projects\att
npm run dev
\\\
Expected: Server starts on \http://localhost:3000\

### Step 2: Navigate to Settings
1. Open \http://localhost:3000\ in browser
2. Log in with your Tellus Teams account
3. Click "Settings" in left sidebar
4. Click on Settings menu item

Expected: You're on Dashboard Settings page

### Step 3: Find Integrations
Click on "Integrations" in the navigation

Expected: You see WhatsApp section with a big green button saying "Connect WhatsApp"

### Step 4: Start OAuth Flow
1. Click "Connect WhatsApp" button
2. You'll be redirected to Meta login

Expected: 
- Meta login page appears
- URL changes to facebook.com

### Step 5: Log In to Meta
1. Enter your Meta Business Account credentials
2. Click "Continue"

Expected: Authorization consent screen appears

### Step 6: Approve Integration
1. Review permissions requested
2. Click "Allow" or "Continue"

Expected: You're redirected back to dashboard

### Step 7: Verify Connection
After redirect, you should see:
-  Green checkmark icon
- Status: "WhatsApp Connected"
- Phone Number ID displayed
- Token expiry date shown
- "Disconnect" button instead of "Connect"

Expected: Connection successful!

### Step 8: Test Message Sending
1. Go to "Chat Center" in sidebar
2. Open a chat
3. Send a test message
4. Message should send successfully

Expected:
- Message appears in chat
- Message saves to Firestore
- No token errors in console

### Step 9: Test Disconnect
1. Go back to Settings > Integrations
2. Click "Disconnect" button
3. Confirm disconnection

Expected:
- WhatsApp status changes to "Not Connected"
- "Connect WhatsApp" button reappears
- Credentials removed from Firestore

## Detailed Testing Scenarios

### Scenario 1: Fresh Connection
**Goal**: Verify OAuth flow works from start to finish

**Steps**:
1. Start with disconnected state
2. Click "Connect WhatsApp"
3. Complete Meta authorization
4. Verify connection shown in UI
5. Check Firestore has token saved

**Expected Results**:
\\\
Firestore path: tenants/tellus-teams/integrations/meta
Should contain:
{
  accessToken: "EAAX...",
  connectedAt: 1234567890,
  expiresAt: 1234567890 + 60days,
  status: "connected",
  source: "oauth"
}
\\\

### Scenario 2: Message Sending with Valid Token
**Goal**: Verify messages send successfully with fresh token

**Steps**:
1. Ensure WhatsApp is connected
2. Go to Chat Center
3. Send test message
4. Observe response

**Expected Results**:
- Message sent successfully
- No errors in console
- Message appears in chat UI
- Console shows: \[\] Message sent successfully\

### Scenario 3: Connection Status Display
**Goal**: Verify UI correctly shows connection state

**Steps**:
1. Connected state:
   - Check for green checkmark
   - Check Phone Number ID displayed
   - Check expiry date shown
   - Verify "Disconnect" button visible

2. Disconnected state:
   - Check for gray icon
   - Check "Not Connected" text
   - Verify "Connect WhatsApp" button visible

3. Expired state:
   - Manually update Firestore: status = "token_expired"
   - Refresh page
   - Check for yellow alert icon
   - Check "Token Expired" message
   - Verify "Disconnect" button shows

**Expected Results**: UI reflects actual state in Firestore

### Scenario 4: Error Recovery
**Goal**: Verify error handling works properly

**Test Case 4a: Missing Environment Variable**
1. Temporarily remove \NEXT_PUBLIC_META_APP_ID\ from .env.local
2. Try to connect WhatsApp
3. Expected: Error message about missing configuration

**Test Case 4b: Failed Token Exchange**
1. Use invalid redirect URI in Meta App settings
2. Try to complete OAuth flow
3. Expected: Error redirects to settings with ?status=error

**Test Case 4c: Expired Token Sending**
1. Manually update Firestore token expiresAt to past date
2. Try to send message
3. Expected: TOKEN_EXPIRED error returned

## Browser Console Debugging

### What to Look For:

**Successful OAuth**:
\\\
[whatsappOAuth.ts] Token retrieved and validated
[TokenService] Token retrieved successfully
[\] Message sent successfully
\\\

**Token Issues**:
\\\
[TokenService] Token expiring soon, marking as token_expired
[TokenService] Token expired. Please reconnect WhatsApp account.
[\] Configuration error: WhatsApp not configured
\\\

**OAuth Errors**:
\\\
[OAuth Callback] Error: Failed to exchange code
[OAuth Callback] Error: No WhatsApp config found
\\\

### Enable Extra Logging (Optional)

In \src/lib/tokenService.ts\, uncomment detailed logging:
\\\	ypescript
console.log('[TokenService] Full config:', data);
console.log('[TokenService] Time now:', now);
console.log('[TokenService] Expires at:', data.expiresAt);
console.log('[TokenService] Seconds until expiry:', data.expiresAt - now);
\\\

## Firebase Console Verification

### Check Token Storage:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: "tellusteams"
3. Go to Firestore Database
4. Navigate to: \	enants > tellus-teams > integrations > meta\
5. Click on "meta" document
6. Should see:
   - \ccessToken\: Your Meta access token (starts with EAA...)
   - \connectedAt\: Unix timestamp
   - \expiresAt\: Unix timestamp (60 days from now)
   - \status\: "connected"
   - \source\: "oauth"

### Verify Token Age:

\\\javascript
// In browser console:
const expiresAt = 1704067890; // From Firestore
const now = Math.floor(Date.now() / 1000);
const secondsUntilExpiry = expiresAt - now;
const daysUntilExpiry = secondsUntilExpiry / (24 * 60 * 60);
console.log(\Token expires in \ days\);
\\\

## Production Testing (After Vercel Deploy)

### Prerequisites:
1. Push code to GitHub
2. Vercel auto-deploys
3. Update Vercel environment variables:
   - \NEXT_PUBLIC_META_APP_ID\
   - \META_APP_SECRET\
   - \NEXT_PUBLIC_APP_URL=https://bodhanika.com\
4. Redeploy: Push a new commit or redeploy in Vercel dashboard

### Testing Steps:

1. Visit \https://bodhanika.com/dashboard/settings/integrations\
2. Click "Connect WhatsApp"
3. Complete OAuth flow (same as local)
4. Verify connection works
5. Send test message to verify token is valid
6. Check Firestore shows production token

### Success Indicators:

 OAuth redirect works
 Meta authorization completes
 Redirected back to production URL
 Connection shown in settings
 Token saved to Firestore
 Messages send successfully
 No console errors

## Common Issues & Solutions

### Issue 1: Redirect Loop
**Symptom**: Stuck refreshing between authorize and callback
**Cause**: Redirect URI mismatch in Meta App settings
**Solution**: 
1. Go to Meta App settings
2. Check redirect URI matches exactly:
   - Local: \http://localhost:3000/api/integrations/whatsapp/oauth/callback\
   - Prod: \https://bodhanika.com/api/integrations/whatsapp/oauth/callback\

### Issue 2: "App Not Set Up"
**Symptom**: Error at Meta login page
**Cause**: WhatsApp product not added to Meta App
**Solution**: Go to Meta App > Add Product > WhatsApp

### Issue 3: Token Not Saving
**Symptom**: Connected but no token in Firestore
**Cause**: Firestore rules or Admin SDK issue
**Solution**:
1. Check \src/lib/firebaseAdmin.ts\ has correct credentials
2. Check Firestore rules allow \	enants/{tenantId}/integrations/*\ writes
3. Check browser console for Firebase errors

### Issue 4: Messages Won't Send
**Symptom**: TOKEN_EXPIRED error every time
**Cause**: Token actually expired or invalid
**Solution**:
1. Disconnect WhatsApp
2. Reconnect WhatsApp (get fresh token)
3. Try sending again

## Test Results Template

Use this to track your testing:

\\\markdown
## OAuth Testing Results - [Date]

### Environment
- OS: Windows
- Browser: Chrome
- Node version: v20.x

### Test Execution

#### Local Development
- [ ] Dev server starts
- [ ] Settings page loads
- [ ] "Connect WhatsApp" button visible
- [ ] OAuth flow starts
- [ ] Meta login completes
- [ ] Authorization granted
- [ ] Redirected back successfully
- [ ] Connection status shows "Connected"
- [ ] Token displays with expiry date
- [ ] Message sends successfully
- [ ] Disconnect works

#### Production
- [ ] Vercel deploy successful
- [ ] Production URL accessible
- [ ] Same OAuth flow works
- [ ] Token saves to Firestore
- [ ] Messages send successfully

### Issues Found
- [ ] None
- [ ] [List any issues]

### Status
 **READY FOR RELEASE** /  **NEEDS FIXES**

Tested by: _______________
Date: _______________
\\\

## Next Steps After Testing

1.  If all tests pass:
   - Send announcement to customers
   - Update documentation
   - Monitor OAuth success rate

2.  If tests fail:
   - Check troubleshooting guide
   - Review error logs
   - Fix issues and retest

---

**Testing Time**: 30 minutes
**Success Rate Target**: 100%
**Last Updated**: January 2025
