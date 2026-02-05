# VERCEL DEPLOYMENT SETUP

## Step 1: Sign up on Vercel
Go to https://vercel.com/signup

Choose one of:
- Sign up with GitHub
- Sign up with Email

## Step 2: Connect Your GitHub Repository
1. Click "New Project"
2. Select "Import Git Repository"
3. Paste your GitHub URL or select from list
4. Click "Import"

## Step 3: Configure Environment Variables
In Vercel Dashboard, go to: Settings  Environment Variables

Add these variables from your .env.local:

Required for Authentication:
- NEXTAUTH_SECRET = (generate a new one if needed)
- NEXTAUTH_URL = https://bodhanika.com (or your Vercel URL initially)

Firebase Config (these are public, from firebase.json):
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID

Other APIs (if applicable):
- NEXT_PUBLIC_META_PIXEL_ID
- META_APP_ID
- META_APP_SECRET
- etc.

## Step 4: Deploy
1. Click "Deploy"
2. Wait for build to complete (usually 2-3 minutes)
3. Your app will be live at: https://<project>.vercel.app

## Step 5: Connect Custom Domain
1. Go to Settings  Domains
2. Add "bodhanika.com"
3. Vercel will show DNS instructions
4. Update DNS at your domain registrar
5. Wait 5-30 minutes for propagation

## Your App URLs
- Vercel Preview: https://<project>.vercel.app
- Custom Domain: https://bodhanika.com (after DNS setup)

## Auto-Deploy
Every time you push to GitHub main branch, Vercel auto-deploys!

