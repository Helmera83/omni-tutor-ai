# Deployment Guide for Vercel

This guide will help you deploy the Omni Tutor AI application to Vercel.

## Prerequisites

- A Vercel account (https://vercel.com)
- A Gemini API key from Google AI Studio (https://ai.google.dev)

## Environment Variables

The application requires the following environment variable to be set in Vercel:

### Required Variable

- **GEMINI_API_KEY**: Your Google Gemini API key
  - Get your API key from: https://ai.google.dev/tutorials/setup
  - This is used for all AI-powered features including document analysis, chat, video/audio transcription

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variables:
   - Click "Environment Variables"
   - Add `GEMINI_API_KEY` with your API key value
   - Make sure it's added for all environments (Production, Preview, Development)
6. Click "Deploy"

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Add environment variable
vercel env add GEMINI_API_KEY
# Then paste your API key when prompted
# Select all environments (Production, Preview, Development)

# Deploy to production
vercel --prod
```

## Troubleshooting

### "Failed to analyze document" Error

This error typically occurs when the GEMINI_API_KEY environment variable is not properly configured in Vercel. To fix:

1. Go to your project in Vercel Dashboard
2. Navigate to Settings → Environment Variables
3. Verify that `GEMINI_API_KEY` is set correctly
4. Make sure it's enabled for all environments
5. Redeploy your project

### API Key Not Working

If you're getting API errors:

1. Verify your API key is valid at https://ai.google.dev
2. Check that you've enabled the Gemini API in your Google Cloud project
3. Ensure there are no extra spaces or quotes in the environment variable value
4. Try regenerating your API key

### Build Fails on Vercel

If the build fails:

1. Check the build logs in Vercel Dashboard
2. Ensure all dependencies are listed in package.json
3. Verify that the build works locally with `npm run build`
4. Check that Node.js version is compatible (Node 18+ recommended)

## Verifying Deployment

After deployment, test the following features:

1. Upload a document and generate a study guide
2. Upload a video or audio file
3. Use the chat feature
4. Try web research functionality

All features require the GEMINI_API_KEY to be properly configured.

## Support

For issues specific to:
- Vercel deployment: https://vercel.com/docs
- Gemini API: https://ai.google.dev/docs
- This application: Create an issue on GitHub
