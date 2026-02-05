# Firebase Deployment Configuration for TellusTeams

## Project Configuration
- **Firebase Project ID**: tellusteams
- **Primary Custom Domain**: bodhanika.com
- **Firebase Default Domains**:
  - tellusteams.web.app
  - tellusteams.firebaseapp.com

## Deployment Domains

### Current Configuration
All deployments go to bodhanika.com (primary custom domain)

### Domain Access
1. **Production (Custom Domain)**: https://bodhanika.com
2. **Firebase Default**: https://tellusteams.web.app
3. **Firebase Alt**: https://tellusteams.firebaseapp.com

## How to Deploy

### Standard Deployment
`ash
firebase deploy
`
This deploys to ALL connected domains including bodhanika.com

### Deploy to Specific Target (if needed)
`ash
firebase deploy --only hosting:default
`

## DNS Configuration for bodhanika.com

To complete the custom domain setup, configure DNS records at your domain registrar:

### Option 1: Using Firebase Hosting Delegate Domain
1. Go to Firebase Console  Hosting
2. Click "Connect domain"
3. Enter: bodhanika.com
4. Firebase will provide A records to add to your DNS

### Option 2: CNAME Method
`
Host: www
Type: CNAME
Value: bodhanika.com.web.app
`

### Option 3: A Records (if provided by Firebase)
`
Type: A
Value: [Firebase provided IP addresses]
`

## Verify Domain Connection

Once DNS is configured:
1. Visit https://bodhanika.com
2. Check Firebase Console  Hosting  Domains
3. Status should show "Connected"

## Environment Variables
Stored in .env.local - no domain configuration needed there

## Configuration Files
- **.firebaserc**: Project and custom domain settings
- **firebase.json**: Hosting rules and rewrites
- **next.config.js**: Next.js build configuration

## Notes
- All deployments via "firebase deploy" go to bodhanika.com
- Firebase maintains SSL certificate automatically
- Redirects from tellusteams.web.app to bodhanika.com can be configured if needed
