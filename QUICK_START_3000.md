# 🚀 Quick Start Guide - Port 3000

## Step 1: Create Environment Files

### Backend .env file (`backend/.env`):
```env
# Temporary Firebase Configuration
FIREBASE_PROJECT_ID=demo-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB\nDemo-Key-Replace-With-Real\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=demo-service-account@demo.iam.gserviceaccount.com

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Security
JWT_SECRET=demo-secret-key-change-this
```

### Frontend .env file (`frontend/.env`):
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyDemo-Replace-With-Real
VITE_FIREBASE_AUTH_DOMAIN=demo.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=demo-project-id
VITE_FIREBASE_STORAGE_BUCKET=demo.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:demo

# API Configuration
VITE_API_BASE_URL=http://localhost:5000/api
```

## Step 2: Start the Servers
Run: `yarn dev`

## Step 3: Access Your App
🚀 **http://localhost:3000** - Your Property Management System
🔐 **http://localhost:3000/login** - Login Page
📝 **http://localhost:3000/register** - Registration Page
