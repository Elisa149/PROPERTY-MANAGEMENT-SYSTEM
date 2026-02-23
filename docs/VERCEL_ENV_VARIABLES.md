# Environment Variables for Vercel

Your app can run **entirely on Vercel**: the Express backend is exported as a serverless function and the frontend is built into `public/`. One deployment serves both.

---

## 1. Vercel – set in Vercel Dashboard

In your Vercel project: **Settings → Environment Variables**. Add these for **Production** (and optionally Preview/Development).

**When frontend + backend are both on Vercel:** leave `VITE_API_BASE_URL` unset (the app uses same-origin `/api`). Set all Firebase and backend vars below in the same project.

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Only if backend is elsewhere. When backend is on Vercel too, leave **empty** (uses `/api`). | `https://your-backend.railway.app/api` |
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key | From Firebase Console → Project settings → Web app |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | `your-project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket | `your-project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID | From Firebase Console |
| `VITE_FIREBASE_APP_ID` | Firebase Web App ID | From Firebase Console |
| `VITE_FIREBASE_MEASUREMENT_ID` | Optional – Firebase Analytics | From Firebase Console |

- Only variables starting with **`VITE_`** are available in the frontend (Vite embeds them at build time).
- After adding or changing env vars in Vercel, **redeploy** the project so the new values are used.

---

## 2. Backend env vars (same Vercel project when full-stack on Vercel)

When you deploy **both** frontend and backend on Vercel, add these in the **same Vercel project** so the serverless Express app can use them. If you deploy the backend elsewhere (e.g. Railway), set these there instead.

| Variable | Description |
|----------|-------------|
| `FIREBASE_PROJECT_ID` | Same as in frontend |
| `FIREBASE_PRIVATE_KEY` | Service account private key (full string; keep newlines as `\n` or paste multiline). |
| `FIREBASE_CLIENT_EMAIL` | Service account email, e.g. `firebase-adminsdk-xxx@project.iam.gserviceaccount.com` |
| `PORT` | Usually set by host (e.g. Railway/Render). Default in code: `5001` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | Your Vercel app URL for CORS, e.g. `https://your-app.vercel.app` |
| `JWT_SECRET` | Secret used to sign JWTs (use a long random string in production) |

- CORS already allows `*.vercel.app` in `backend/server.js`.
- If you deploy the backend **separately** (e.g. Railway), add these env vars there and set `VITE_API_BASE_URL` on Vercel to that backend URL + `/api`.

---

## 3. Quick checklist for Vercel (full-stack on one project)

1. In Vercel → **Settings → Environment Variables**, add:
   - All `VITE_FIREBASE_*` variables (and optionally `VITE_API_BASE_URL` only if backend is elsewhere).
   - Backend vars: `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `JWT_SECRET`.
2. Connect your repo and set **Root Directory** to the repo root (leave empty or `.`).
3. Deploy. Vercel will run `yarn install`, build the frontend into `public/`, and run the Express app as a serverless function. The same URL serves the app and `/api/*`.

---

## 4. Where to get Firebase values

- **Firebase Console** → your project → **Project settings** (gear) → **General** → “Your apps” → Web app.
- **Backend (service account):** Firebase Console → Project settings → **Service accounts** → Generate new private key. Use `project_id`, `private_key`, and `client_email` from the JSON for `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, and `FIREBASE_CLIENT_EMAIL`.
