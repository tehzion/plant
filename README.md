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
VITE_AUTH_EMAIL_REDIRECT_URL=https://plant-2-uvev.onrender.com/login
```

Supabase is wired for email/password auth and cloud sync. Apply
`supabase/plant_app_schema.sql`
to the Agropeuner project after it is active, then add the publishable key to
your local `.env` and production environment. Do not put a Supabase service role
or secret key in any `VITE_*` frontend variable.

The schema also seeds `disease_product_rules`, a public-read curated mapping used
by product recommendations to connect crop disease aliases to WooCommerce tags,
active ingredients, and caution notes.
Consultation CTA clicks are captured in `consultation_leads` before opening
WhatsApp, using an insert-only browser policy so lead lists are not exposed.
New Supabase Storage uploads use the private `scan-images` bucket: the database
stores object paths and the app generates short-lived signed URLs for display.
Legacy public/base64 image values remain readable for old records.

Production Supabase Auth checklist:

- Enable email confirmations for email/password sign-up.
- Set Site URL to the production app URL and add redirect URLs for production plus local dev.
- Set `VITE_AUTH_EMAIL_REDIRECT_URL` to the production login URL.
- Raise password requirements and enable leaked password protection if your Supabase plan supports it.
- Use custom SMTP for production auth emails when the app is public.

Backend `server/.env`:

```env
OPENAI_API_KEY=your_openai_api_key_here
PLANTNET_API_KEY=your_plantnet_api_key_here
WOOCOMMERCE_URL=https://your-store-domain
WOOCOMMERCE_CONSUMER_KEY=your_woocommerce_consumer_key
WOOCOMMERCE_CONSUMER_SECRET=your_woocommerce_consumer_secret
SUPABASE_URL=https://aweyluvuvydbwdanodqe.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
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
FRONTEND_URLS=https://www.mojosense.app,https://mojosense.app
VITE_SUPABASE_URL=https://aweyluvuvydbwdanodqe.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
VITE_AUTH_EMAIL_REDIRECT_URL=https://your-public-domain/login
WOOCOMMERCE_URL=https://your-store-domain
WOOCOMMERCE_CONSUMER_KEY=your_woocommerce_consumer_key
WOOCOMMERCE_CONSUMER_SECRET=your_woocommerce_consumer_secret
```

Use the included [render.yaml](./render.yaml) as the deployment source of truth.
The included GitHub Actions keep-warm workflow pings `/api/health` every 10
minutes and can be pointed at another deployment with the `RENDER_HEALTH_URL`
repository variable. Render Free web services can still cold-start or sleep;
upgrade the Render service for production-grade no-sleep reliability.

## Notes

- Do not put OpenAI keys in `VITE_*` frontend variables.
- Revoke any token pasted into chat, terminals, or logs. Create fresh fine-grained GitHub tokens only when needed, with a short expiration and minimum repo permissions.
- The app no longer uses simulated diagnosis fallback when the backend fails.
- The production server serves the built frontend from `dist/`.
