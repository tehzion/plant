# Deployment Guide

## Current deployment model

Use one Render web service from the project root.

- Root Directory: `.`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Health Check Path: `/api/health`

Do not deploy this app as a `server/`-only Render service anymore. The current production setup expects the frontend to build into `dist/` and the Express server in `server/index.js` to serve that output.

## Required Render environment variables

```env
NODE_ENV=production
OPENAI_API_KEY=your_openai_api_key_here
PLANTNET_API_KEY=your_plantnet_api_key_here
FRONTEND_URL=https://your-public-domain
FRONTEND_URLS=https://ai.kanb.coop.my,https://www.mojosense.app,https://mojosense.app
VITE_SUPABASE_URL=https://aweyluvuvydbwdanodqe.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_URL=https://aweyluvuvydbwdanodqe.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SERVICE_ROLE_KEY=server_only_service_role_key_for_admin_dashboard
ADMIN_EMAILS=admin@example.com,owner@example.com
WOOCOMMERCE_URL=https://your-store-domain
WOOCOMMERCE_CONSUMER_KEY=your_woocommerce_consumer_key
WOOCOMMERCE_CONSUMER_SECRET=your_woocommerce_consumer_secret
```

`PORT` is optional on Render because Render injects it automatically.
`SUPABASE_SERVICE_ROLE_KEY` must stay server-only and must never be exposed as
a `VITE_` frontend variable.

## Recommended deploy flow

1. Push the repo to GitHub.
2. Create or update the Render web service using the root config above.
3. Add the environment variables in the Render dashboard.
4. Redeploy.
5. Verify:
   - `GET /api/health`
   - homepage loads
   - scan flow works
   - dashboard loads
   - PDF export works

## Local verification before deploy

```bash
npm test
npm run build
```

## Render blueprint

This repo includes [render.yaml](/C:/Users/yl/OneDrive/Desktop/Plant/render.yaml) so the service configuration can stay consistent with the codebase.
