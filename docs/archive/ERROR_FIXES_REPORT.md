# Error Fixes Report

## Current production guidance

This repo now uses a single root deployment model:

- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Health Check Path: `/api/health`

## Important corrections

- The app no longer uses simulated diagnosis fallback on backend failure.
- OpenAI keys must stay server-side only.
- Render should not be pointed at `server/` as a standalone web service for the main app.

## Required production environment variables

```env
NODE_ENV=production
OPENAI_API_KEY=your_openai_api_key_here
PLANTNET_API_KEY=your_plantnet_api_key_here
FRONTEND_URL=https://your-public-domain
```

## Verification

Before deploy:

```bash
npm test
npm run build
```

After deploy:

- `GET /api/health`
- load the app
- complete one scan
- open results
- verify dashboard
