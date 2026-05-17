<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/045242e3-0236-4a5a-967e-da25a2348a1f

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## Phone (Same Wi‑Fi)

Run:

`npm run dev -- --host 0.0.0.0 --port 5173`

Then open:

`http://<your-mac-ip>:5173`

## Deploy (Netlify)

This project is Firebase-free (no Auth / no Firestore / no billing required).

1. Push this folder to a GitHub repo (recommended).
   - Netlify “drag-and-drop” deploys do **not** run Functions, so `/api/*` won’t work.
2. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. In Netlify → Site settings → Environment variables, add:
   - `GEMINI_API_KEY` (optional, required for Vision Scan)
