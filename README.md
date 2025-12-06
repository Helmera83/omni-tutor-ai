<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1xT7UYnMNUcT51PVrwiSewXKejFNUCvR_

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.local.example` to `.env.local` and set your `GEMINI_API_KEY`:
   ```bash
   cp .env.local.example .env.local
   # Then edit .env.local and add your Gemini API key from https://ai.google.dev/
   ```
3. Run the app:
   `npm run dev`

## Deploy to Vercel

For deployment instructions and troubleshooting, see the [Deployment Guide](DEPLOYMENT.md).

**Quick Deploy:**
1. Set `GEMINI_API_KEY` environment variable in Vercel Dashboard
2. Deploy from GitHub repository
3. Verify all features work with your API key
