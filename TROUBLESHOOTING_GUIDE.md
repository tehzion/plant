# Troubleshooting Guide: resolving 500 Errors and Loading Issues

## 🚨 Issue 1: "Internal Server Error (500)"

**Symptom:** The app says "Disease detection API failed, using local fallback".
**Cause:** The backend server on Render is missing the API keys we just sanitized from the code.

### ✅ Solution: Add Keys to Render

1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click on your web service (`plant-2-uvev`).
3. Click on the **"Environment"** tab in the sidebar.
4. Click **"Add Environment Variable"**.
5. Add these two exact keys:

   - **Key:** `OPENAI_API_KEY`
   - **Value:** `sk-proj...` (The long key starting with sk-proj)

   - **Key:** `PLANTNET_API_KEY`
   - **Value:** `2b10...` (The key starting with 2b10)

   *(Note: You can find these values in your local `server/.env` file if you need to copy them again, or ask me to provide them securely one time).*

6. Click **"Save Changes"**. Render will automatically redeploy.

---

## ⚠️ Issue 2: "Failed to load module script... MIME type of 'text/html'"

**Symptom:** You see red errors in the console and the screen might be white or broken.
**Cause:** This happens when your browser tries to load "old" code that was just replaced by a "new" deployment. The old files don't exist anymore, so the server sends an error page (HTML) instead of the Javascript code.

### ✅ Solution: Hard Refresh

1. **Wait** for the deployment (triggered by the steps above) to finish.
2. **Hard Refresh** your browser:
   - **Windows:** Press `Ctrl` + `F5` (or `Ctrl` + `Shift` + `R`).
   - **Mac:** Press `Cmd` + `Shift` + `R`.
   - **Mobile:** Close the tab completely and open it again, or clear browsing data for the site.

---

## 📝 Verify Formatting of Results

Once the 500 error is fixed, your new Scan Results will show a new feature:

- **Source Check:** Look at the result card. It will now explicitly say **"PlantNet: [Species Name] (Confidence%)"** in a small green badge. This confirms the new dual-api code is working correctly.
