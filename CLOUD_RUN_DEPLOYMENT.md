# CLOUD RUN DEPLOYMENT GUIDE

## Current Status
Your Next.js app has been built successfully and is ready to deploy.

## EASIEST SOLUTION: Deploy to Render (FREE)

Render is the easiest way to deploy your Next.js app with full server support.

### Steps:
1. Go to https://render.com
2. Sign up with GitHub
3. Create New Service  Select "Web Service"
4. Connect your GitHub repo
5. Configure:
   - **Name**: tellusteams
   - **Build Command**: npm install && npm run build
   - **Start Command**: npm start
   - **Environment Variables**: Copy all from .env.local
6. Click "Create Web Service"
7. Wait for deployment (2-3 minutes)
8. Connect domain:
   - Go to Settings  Custom Domain
   - Add: bodhanika.com
   - Update DNS records at your registrar with CNAME provided

Cost: FREE (with option to upgrade later)

---

## Alternative: Google Cloud Run (if you want to stay on GCP)

### Prerequisites:
1. Install Google Cloud SDK from: https://cloud.google.com/sdk/docs/install-windows
2. Run: gcloud init
3. Select project: tellusteams

### Deploy Commands:
\\\ash
cd C:\\Users\\iqbal\\Desktop\\Projects\\att

# Build Docker image
gcloud builds submit --tag gcr.io/tellusteams/nextapp

# Deploy to Cloud Run
gcloud run deploy tellusteams-app --image gcr.io/tellusteams/nextapp --platform managed --region us-central1 --allow-unauthenticated --set-env-vars NEXTAUTH_SECRET=<your-secret>

# Map custom domain
gcloud run services add-iam-policy-binding tellusteams-app --region=us-central1 --member=serviceAccount:service-<PROJECT_ID>@gcp-sa-cloud-run-invoker.iam.gserviceaccount.com --role=roles/run.invoker

gcloud beta run domain-mappings create --service tellusteams-app --domain bodhanika.com --region us-central1
\\\

Cost: \.20/million requests + compute time

---

## RECOMMENDED: Use Render (Easiest)

Render is the simplest solution and works perfectly for Next.js apps with:
- Zero configuration needed
- Automatic SSL certificates
- GitHub integration
- Free tier available
- Easy custom domain setup

