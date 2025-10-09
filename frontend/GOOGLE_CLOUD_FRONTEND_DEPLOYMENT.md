# Google Cloud Frontend Deployment Guide - KardexCare

## Overview
This guide provides two deployment options for your Next.js frontend on Google Cloud Platform:

1. **Firebase Hosting** (Recommended) - Static export with CDN
2. **Cloud Run** - Server-side rendering with containerization

## Architecture Options

### Option 1: Firebase Hosting (Recommended)
- **Static export** of Next.js app
- **Global CDN** for fast loading
- **Automatic SSL** certificates
- **Cost-effective** for static content
- **Easy custom domain** setup

### Option 2: Cloud Run
- **Server-side rendering** (SSR)
- **Dynamic content** support
- **Containerized** deployment
- **Auto-scaling** based on traffic

## Prerequisites

### 1. Install Required Tools
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Install Google Cloud CLI (if not already installed)
# Download from: https://cloud.google.com/sdk/docs/install

# Authenticate
firebase login
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 2. Enable Required APIs
```bash
gcloud services enable firebase.googleapis.com
gcloud services enable firebasehosting.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

## Option 1: Firebase Hosting Deployment (Recommended)

### Step 1: Initialize Firebase
```bash
cd frontend
firebase init hosting

# Select your project
# Choose 'out' as your public directory
# Configure as single-page app: Yes
# Set up automatic builds: No (we'll use manual deployment)
```

### Step 2: Configure Environment Variables
```bash
# Copy the example file
cp env.production.example .env.production

# Edit .env.production with your values:
NEXT_PUBLIC_API_URL=https://your-backend-cloud-run-url.run.app
NEXT_PUBLIC_API_BASE_URL=https://your-backend-cloud-run-url.run.app/api
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-nextauth-secret
```

### Step 3: Update Firebase Configuration
Edit `firebase.json` and replace `YOUR_BACKEND_CLOUD_RUN_URL` with your actual backend URL.

### Step 4: Build and Deploy
```bash
# Build for static export
npm run build:export

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Or use the combined script
npm run deploy:firebase
```

### Step 5: Custom Domain (Optional)
```bash
# Add custom domain
firebase hosting:sites:create your-site-name
firebase target:apply hosting production your-site-name
firebase hosting:channel:deploy production --only hosting
```

## Option 2: Cloud Run Deployment (SSR)

### Step 1: Configure for Cloud Run
```bash
# Set environment variables for build
export PROJECT_ID=your-project-id
export BACKEND_URL=your-backend-cloud-run-url.run.app
```

### Step 2: Build and Deploy
```bash
# Deploy using Cloud Build
gcloud builds submit --config cloudbuild-cloudrun.yaml \
  --substitutions _BACKEND_URL=$BACKEND_URL

# Or use the npm script
npm run deploy:cloudrun
```

### Step 3: Configure Custom Domain
```bash
# Map custom domain to Cloud Run
gcloud run domain-mappings create \
  --service kardexcare-frontend \
  --domain your-domain.com \
  --region us-central1
```

## Environment Configuration

### Production Environment Variables
Create `.env.production` from the example:

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://kardexcare-backend-xxx-uc.a.run.app
NEXT_PUBLIC_API_BASE_URL=https://kardexcare-backend-xxx-uc.a.run.app/api

# App Configuration
NEXT_PUBLIC_APP_NAME=KardexCare
NEXT_PUBLIC_ENVIRONMENT=production

# Authentication
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-very-secure-secret-key

# External Services
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
NEXT_PUBLIC_LOCATIONIQ_KEY=your-locationiq-key
```

## CI/CD Pipeline Setup

### Firebase Hosting with GitHub Actions
Create `.github/workflows/deploy-frontend.yml`:

```yaml
name: Deploy Frontend to Firebase

on:
  push:
    branches: [ main ]
    paths: [ 'frontend/**' ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      
      - name: Build
        run: |
          cd frontend
          npm run build:export
        env:
          NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
      
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: your-project-id
          entryPoint: './frontend'
```

### Cloud Build Trigger
```bash
# Create build trigger for automatic deployments
gcloud builds triggers create github \
    --repo-name=kardex-frontend \
    --repo-owner=YOUR_GITHUB_USERNAME \
    --branch-pattern="^main$" \
    --build-config=frontend/cloudbuild.yaml \
    --include-logs-with-status
```

## Performance Optimizations

### 1. Next.js Optimizations
Your `next.config.js` already includes:
- **Code splitting** for better performance
- **Image optimization** with WebP/AVIF
- **Bundle analysis** and tree shaking
- **Compression** enabled

### 2. Firebase Hosting Optimizations
- **Automatic CDN** distribution
- **Brotli compression** enabled
- **HTTP/2** support
- **Cache headers** configured

### 3. Additional Optimizations
```javascript
// Add to next.config.js for better performance
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
```

## Security Configuration

### 1. Content Security Policy
Add to `next.config.js`:
```javascript
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      connect-src 'self' https://your-backend-url.run.app;
    `.replace(/\s{2,}/g, ' ').trim()
  }
];

// Add to headers in next.config.js
async headers() {
  return [
    {
      source: '/(.*)',
      headers: securityHeaders,
    },
  ];
}
```

### 2. Environment Variables Security
- Never commit `.env.production` to version control
- Use Google Secret Manager for sensitive values
- Prefix public variables with `NEXT_PUBLIC_`

## Monitoring and Analytics

### 1. Firebase Performance Monitoring
```bash
# Enable Performance Monitoring
firebase init performance
```

### 2. Google Analytics 4
Add to your app:
```javascript
// pages/_app.js
import { Analytics } from '@vercel/analytics/react';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check build logs
   npm run build:export
   
   # Clear Next.js cache
   rm -rf .next
   npm run build
   ```

2. **API Connection Issues**
   - Verify `NEXT_PUBLIC_API_URL` is correct
   - Check CORS settings on backend
   - Ensure backend is deployed and accessible

3. **Firebase Deployment Issues**
   ```bash
   # Check Firebase project
   firebase projects:list
   
   # Verify hosting configuration
   firebase hosting:sites:list
   
   # Check deployment logs
   firebase deploy --debug
   ```

4. **Environment Variables Not Working**
   - Ensure variables start with `NEXT_PUBLIC_` for client-side
   - Restart development server after changes
   - Check build logs for missing variables

### Useful Commands

```bash
# Local development
npm run dev

# Build and test locally
npm run build
npm run start

# Deploy to Firebase
npm run deploy:firebase

# Deploy to Cloud Run
npm run deploy:cloudrun

# Analyze bundle size
ANALYZE=true npm run build

# Check Firebase hosting status
firebase hosting:sites:list

# View deployment logs
firebase functions:log
```

## Cost Optimization

### Firebase Hosting
- **Free tier**: 10GB storage, 10GB/month transfer
- **Paid tier**: $0.026/GB storage, $0.15/GB transfer
- **Custom domain**: Free SSL certificates

### Cloud Run
- **Pay per request**: $0.40 per million requests
- **Memory**: $0.0000025 per GB-second
- **CPU**: $0.0000100 per vCPU-second

## Comparison: Firebase vs Cloud Run

| Feature | Firebase Hosting | Cloud Run |
|---------|-----------------|-----------|
| **Cost** | Lower for static | Higher for dynamic |
| **Performance** | Faster (CDN) | Good (regional) |
| **Scalability** | Unlimited | Auto-scaling |
| **SSR Support** | No | Yes |
| **Setup Complexity** | Simple | Moderate |
| **Custom Domains** | Easy | Moderate |

## Recommended Architecture

For **KardexCare**, I recommend:

1. **Frontend**: Firebase Hosting (static export)
2. **Backend**: Cloud Run (as already configured)
3. **Database**: Cloud SQL PostgreSQL
4. **File Storage**: Cloud Storage
5. **CDN**: Firebase Hosting's built-in CDN

This provides the best balance of performance, cost, and maintainability.

## Next Steps

1. **Choose deployment method** (Firebase recommended)
2. **Configure environment variables**
3. **Deploy backend first** (dependency for frontend)
4. **Deploy frontend**
5. **Setup custom domain**
6. **Configure monitoring**
7. **Setup CI/CD pipeline**

Your KardexCare frontend will be production-ready with global CDN, automatic scaling, and optimal performance!
