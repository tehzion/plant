# 🚀 How to Start Your Plant Disease Detector App

## Quick Start Guide

Your app has **TWO parts** that need to run simultaneously:
1. **Backend Server** (Port 3001) - Handles AI analysis
2. **Frontend App** (Port 3000) - User interface

---

## Method 1: Using Two Terminal Windows (Recommended)

### Terminal 1 - Start Backend Server
```bash
cd server
npm start
```

You should see:
```
🌿 Plant Detector API is now active!
📍 URL: http://localhost:3001
🔗 Allowed Origin: http://localhost:3000
🔑 OpenAI Key: ✅ Configured
```

### Terminal 2 - Start Frontend App
```bash
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

---

## Method 2: Using VS Code Split Terminal

1. Open VS Code
2. Press **Ctrl+`** (or **Cmd+`** on Mac) to open terminal
3. Click the **Split Terminal** button (or press **Ctrl+Shift+5**)
4. In **Left Terminal**: `cd server && npm start`
5. In **Right Terminal**: `npm run dev`

---

## Troubleshooting

### ❌ Error: "404 Not Found"
**Problem:** Backend server is not running
**Solution:** Start the backend server (see Terminal 1 above)

### ❌ Error: "CORS Error"
**Problem:** Frontend/Backend URL mismatch
**Solution:** Check that:
- Frontend runs on `http://localhost:3000`
- Backend runs on `http://localhost:3001`
- `.env` files are configured correctly

### ❌ Error: "OpenAI API Key Missing"
**Problem:** API key not configured
**Solution:** Make sure `server/.env` has your OpenAI API key

---

## Checking if Servers are Running

### Backend Health Check
Open browser: `http://localhost:3001/api/health`

Should show:
```json
{
  "status": "ok",
  "message": "Plant Detector API is running"
}
```

### Frontend Check
Open browser: `http://localhost:3000`

Should show your app interface

---

## Development Tips

- **Auto-reload Backend:** Use `npm run dev` in the server folder (uses --watch flag)
- **Auto-reload Frontend:** Vite automatically reloads on file changes
- **View Logs:** Check terminal output for errors
- **Stop Servers:** Press `Ctrl+C` in each terminal

---

## Environment Variables

### Frontend (`.env`)
```
VITE_API_URL=http://localhost:3001
```

### Backend (`server/.env`)
```
OPENAI_API_KEY=sk-proj-...
PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

---

## Common Issues Fixed ✅

✅ CORS Error - Fixed
✅ JSX Warning - Fixed
✅ 404 Error - Backend needs to run

**Last Updated:** January 2025
