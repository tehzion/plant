# Troubleshooting Guide

## Render exits with status 1

### Likely cause

Render is using the old backend-only setup instead of the current root deployment model.

### Fix

Set the service to:

- Root Directory: `.`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Health Check Path: `/api/health`

Do not use `cd server && npm install` as the Render build command for this repo anymore.

## API returns 500

### Likely cause

One or more required server environment variables are missing.

### Fix

Set these in Render:

```env
NODE_ENV=production
OPENAI_API_KEY=your_openai_api_key_here
PLANTNET_API_KEY=your_plantnet_api_key_here
FRONTEND_URL=https://your-public-domain
```

## Browser shows old chunks or MIME type errors

### Likely cause

The browser is still using files from an older deployment.

### Fix

- Hard refresh the page
- Close and reopen the tab on mobile
- Reopen the PWA if installed

## Verify recovery

After fixing deployment:

1. Open `/api/health`
2. Load the homepage
3. Run a scan
4. Open a result
5. Export a PDF
