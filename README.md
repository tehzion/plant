# KANB Plant Health Platform

KANB is a plant health, scan history, farm logging, reporting, and myGAP support platform for Southeast Asian crops including rice, vegetables, fruits, palm, rubber, and durian.

## Features

- Camera and upload plant scans
- Disease analysis through the backend API
- Treatment, prevention, nutrition, and product guidance
- Scan history and PDF export
- Farm dashboard, daily log, reports, and myGAP support
- PWA support for mobile install and updates

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Root `.env`:

```env
# Optional in local dev. If left blank, Vite proxies /api to localhost:3002.
VITE_API_URL=
VITE_DEV_API_PROXY_TARGET=http://localhost:3002
VITE_ENCRYPTION_KEY=
VITE_SUPABASE_URL=https://aweyluvuvydbwdanodqe.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Supabase is wired for email/password auth and cloud sync. Apply
`supabase/plant_app_schema.sql`
to the Agropeuner project after it is active, then add the publishable key to
your local `.env` and production environment. Do not put a Supabase service role
or secret key in any `VITE_*` frontend variable.

Backend `server/.env`:

```env
OPENAI_API_KEY=your_openai_api_key_here
PLANTNET_API_KEY=your_plantnet_api_key_here
WOOCOMMERCE_URL=https://your-store-domain
WOOCOMMERCE_CONSUMER_KEY=your_woocommerce_consumer_key
WOOCOMMERCE_CONSUMER_SECRET=your_woocommerce_consumer_secret
PORT=3002
```

### 3. Run frontend

```bash
npm run dev
```

### 4. Run backend

```bash
npm run dev:server
```

Frontend runs on `http://localhost:3000` and the backend on `http://localhost:3002`.

### 5. Test and build

```bash
npm test
npm run build
```

## Production on Render

This repo expects a single root Render web service.

- Root Directory: `.`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Health Check Path: `/api/health`

Required Render environment variables:

```env
NODE_ENV=production
OPENAI_API_KEY=your_openai_api_key_here
PLANTNET_API_KEY=your_plantnet_api_key_here
FRONTEND_URL=https://your-public-domain
VITE_SUPABASE_URL=https://aweyluvuvydbwdanodqe.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
WOOCOMMERCE_URL=https://your-store-domain
WOOCOMMERCE_CONSUMER_KEY=your_woocommerce_consumer_key
WOOCOMMERCE_CONSUMER_SECRET=your_woocommerce_consumer_secret
```

Use the included [render.yaml](/C:/Users/yl/OneDrive/Desktop/Plant/render.yaml) as the deployment source of truth.

## Notes

- Do not put OpenAI keys in `VITE_*` frontend variables.
- The app no longer uses simulated diagnosis fallback when the backend fails.
- The production server serves the built frontend from `dist/`.
