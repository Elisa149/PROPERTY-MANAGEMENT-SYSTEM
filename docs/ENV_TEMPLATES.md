# 📁 Environment File Templates

## Frontend Environment File Template

**File**: `frontend/.env`

```env
# Firebase Web App Configuration
# Get these values from Firebase Console > Project Settings > Web App Config

VITE_FIREBASE_API_KEY=AIzaSyC_YOUR_API_KEY_HERE
VITE_FIREBASE_AUTH_DOMAIN=your-project-name.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-name
VITE_FIREBASE_STORAGE_BUCKET=your-project-name.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890

# API Configuration (keep this as-is)
VITE_API_BASE_URL=http://localhost:5000/api
```

## Backend Environment File Template

**File**: `backend/.env`

```env
# Firebase Admin SDK Configuration  
# Get these values from Firebase Console > Project Settings > Service Accounts > Generate Private Key

FIREBASE_PROJECT_ID=your-project-name
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\nYOUR_ACTUAL_PRIVATE_KEY_CONTENT_HERE\n...PUT_THE_ENTIRE_PRIVATE_KEY_HERE...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xyz123@your-project-name.iam.gserviceaccount.com

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Security - Generate a random string for production
JWT_SECRET=your-random-jwt-secret-change-in-production
```

## 🔧 How to Fill These Out

### Frontend Configuration:
1. **Go to Firebase Console** → Your Project → ⚙️ Settings → Project Settings
2. **Scroll down to "Your apps"** section  
3. **Click the </> Web App** you created
4. **Copy the config values** from the `firebaseConfig` object
5. **Paste each value** into your `frontend/.env` file

### Backend Configuration:
1. **Go to Firebase Console** → Your Project → ⚙️ Settings → Project Settings
2. **Click "Service accounts" tab**
3. **Click "Generate new private key"** → Download JSON file
4. **Open the downloaded JSON file**
5. **Copy these values to `backend/.env`**:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the quotes and newlines!)
   - `client_email` → `FIREBASE_CLIENT_EMAIL`

## ⚠️ Important Notes

- **Private Key**: Keep the exact format with `\n` for newlines
- **Quotes**: Keep the double quotes around the private key
- **Security**: Never commit these files to Git (they're in .gitignore)
- **Testing**: Use these exact values for local development

## 🎯 Quick Copy-Paste Templates

### Blank Frontend Template:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_BASE_URL=http://localhost:5000/api
```

### Blank Backend Template:
```
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=""
FIREBASE_CLIENT_EMAIL=
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
JWT_SECRET=
```
