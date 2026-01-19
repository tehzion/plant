# 🚀 DEPLOYMENT GUIDE - Plant Disease Detection System

## Current Setup
- **Production Server**: https://plant-2-uvev.onrender.com (Render)
- **Frontend**: Can be deployed to Vercel or Render
- **Status**: Server experiencing 500 errors - fixes applied ✅

---

## 🔧 FIXES APPLIED

### 1. Missing Translation Keys ✅
- Added `feedback.helpful` and related keys
- Both English and Malay translations complete

### 2. Missing Server Function ✅
- Added `logFeedback()` export to `dataCollector.js`
- Updated imports in `server/index.js`

### 3. Environment Configuration ✅
- Created `.env.production` for frontend

---

## 📦 DEPLOYMENT STEPS

### Step 1: Deploy Backend to Render

Your backend is already on Render at: `https://plant-2-uvev.onrender.com`

#### A. Set Environment Variables in Render Dashboard:

1. Go to https://dashboard.render.com
2. Select your service: `plant-2-uvev`
3. Go to "Environment" tab
4. Add these environment variables:

```
OPENAI_API_KEY=sk-proj-...

PLANTNET_API_KEY=2b10...

PORT=3002

NODE_ENV=production

FRONTEND_URL=https://your-frontend-domain.vercel.app
```

#### B. Render Build Settings:

- **Build Command**: `cd server && npm install`
- **Start Command**: `node server/index.js`
- **Root Directory**: Leave blank or use `/`

#### C. Deploy the Fixed Code:

```bash
# From your project root
git add .
git commit -m "Fix: Added logFeedback function and missing translations"
git push origin main
```

Render will automatically deploy when you push to main.

---

### Step 2: Deploy Frontend

You have two options:

#### Option A: Deploy to Vercel (Recommended)

1. **Install Vercel CLI** (if not already):
```bash
npm i -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Deploy**:
```bash
# First time - follow prompts
vercel

# Production deployment
vercel --prod
```

4. **Set Environment Variables in Vercel**:
   - Go to your project settings on Vercel dashboard
   - Navigate to "Environment Variables"
   - Add:
     ```
     VITE_API_URL=https://plant-2-uvev.onrender.com
     ```

#### Option B: Deploy Frontend to Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `npm run preview` or use static site
5. **Environment Variable**: 
   ```
   VITE_API_URL=https://plant-2-uvev.onrender.com
   ```

---

## 🧪 TESTING THE DEPLOYMENT

### 1. Test Backend Health:
```bash
curl https://plant-2-uvev.onrender.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "Plant Analysis API",
  "timestamp": "2026-01-19T..."
}
```

### 2. Test Analysis Endpoint:
Use Postman or curl to test:
```bash
curl -X POST https://plant-2-uvev.onrender.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "treeImage": "data:image/jpeg;base64,...",
    "category": "Rice",
    "language": "en"
  }'
```

### 3. Check Server Logs:
- Go to Render Dashboard
- Select your service
- Click "Logs" tab
- Look for:
  - ✅ "Server running on..."
  - ✅ "Security Headers: Enabled"
  - ❌ Any error messages

---

## 🐛 TROUBLESHOOTING

### Issue: Still getting 500 errors

**Check:**
1. Environment variables are set correctly on Render
2. Server logs for specific error messages
3. OpenAI API key is valid and has credits
4. PlantNet API key is valid

**Common Causes:**
- Missing environment variables
- Invalid API keys
- Rate limiting (too many requests)
- Out of OpenAI credits

### Issue: CORS errors

**Solution:**
The server already has CORS enabled with `origin: '*'`. If you still see CORS errors:
1. Check that the frontend is making requests to the correct URL
2. Verify the server is actually running
3. Check browser console for the exact error

### Issue: Images not uploading

**Check:**
- Image size (should be < 50MB, configured in server)
- Image format (should be base64 encoded)
- Network tab in browser dev tools

---

## 📊 MONITORING

### Health Check Endpoint:
```
GET https://plant-2-uvev.onrender.com/api/health
```

### Render Dashboard:
- Monitor CPU/Memory usage
- Check request logs
- Set up alerts for downtime

### Browser Console:
- Check for fallback messages: "Disease detection API failed, using local fallback"
- This means server is down but fallback is working

---

## 🔄 DEVELOPMENT WORKFLOW

### Local Development:

```bash
# Terminal 1 - Backend
cd server
npm install
npm run dev

# Terminal 2 - Frontend  
npm install
npm run dev
```

### Before Pushing to Production:

```bash
# Test locally first
npm run build
npm run preview

# Check build output
ls -la dist/

# Commit and push
git add .
git commit -m "Your commit message"
git push origin main
```

---

## 📝 ENVIRONMENT FILES REFERENCE

### `.env` (Local Development - Frontend):
```env
VITE_API_URL=http://localhost:3002
```

### `.env.production` (Production - Frontend):
```env
VITE_API_URL=https://plant-2-uvev.onrender.com
```

### `server/.env` (Local Development - Backend):
```env
OPENAI_API_KEY=sk-proj-...
PLANTNET_API_KEY=2b10...
PORT=3002
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### Render Environment Variables (Production - Backend):
```
OPENAI_API_KEY=sk-proj-...
PLANTNET_API_KEY=2b10...
PORT=3002
NODE_ENV=production
FRONTEND_URL=https://your-frontend-url.vercel.app
```

---

## ✅ DEPLOYMENT CHECKLIST

### Pre-Deployment:
- [ ] All code changes committed
- [ ] Tests pass locally
- [ ] Build works: `npm run build`
- [ ] Environment variables documented

### Backend Deployment (Render):
- [ ] Environment variables set in Render dashboard
- [ ] Code pushed to GitHub
- [ ] Render auto-deployed
- [ ] Health check passes: `/api/health`
- [ ] Logs show no errors

### Frontend Deployment:
- [ ] `VITE_API_URL` set to production backend
- [ ] Build successful
- [ ] Deployed to Vercel/Render
- [ ] Can access the site
- [ ] API calls work (check Network tab)

### Post-Deployment:
- [ ] Test plant analysis feature
- [ ] Check all pages load
- [ ] Verify no console errors
- [ ] Test on mobile device
- [ ] Monitor for 24 hours

---

## 🆘 SUPPORT & DEBUGGING

### Render Server Logs:
```bash
# View real-time logs
render logs -f plant-2-uvev

# Or in dashboard:
Dashboard → Services → plant-2-uvev → Logs
```

### Check API Response:
```bash
# Health check
curl https://plant-2-uvev.onrender.com/api/health

# With verbose output
curl -v https://plant-2-uvev.onrender.com/api/health
```

### Frontend Debug:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for messages starting with:
   - "🧠 Image Analysis Cache..."
   - "Disease detection API failed..."
   - Any error messages

---

## 📞 QUICK REFERENCE

| Service | URL | Purpose |
|---------|-----|---------|
| Backend (Render) | https://plant-2-uvev.onrender.com | API Server |
| Health Check | https://plant-2-uvev.onrender.com/api/health | Status |
| Frontend (Dev) | http://localhost:5173 | Local testing |
| Backend (Dev) | http://localhost:3002 | Local API |

---

**Last Updated**: January 19, 2026  
**Status**: ✅ Code fixes applied, ready for deployment  
**Next Step**: Push to GitHub to trigger Render auto-deploy
