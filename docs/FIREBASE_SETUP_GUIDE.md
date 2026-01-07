# 🔥 Firebase Setup Guide - Property Management System

## Step 1: Create Firebase Project

1. **Go to Firebase Console**: https://console.firebase.google.com
2. **Click "Create a project"**
3. **Project name**: `property-management-system` (or your preferred name)
4. **Enable Google Analytics**: Optional (recommended)
5. **Click "Create project"**

## Step 2: Enable Authentication

1. **In Firebase Console**, go to **Authentication** → **Get started**
2. **Go to "Sign-in method" tab**
3. **Enable these providers**:
   - ✅ **Email/Password** → Enable → Save
   - ✅ **Google** → Enable → Save
4. **For Google Sign-in**: Add your domain `localhost` for testing

## Step 3: Create Firestore Database

1. **In Firebase Console**, go to **Firestore Database** → **Create database**
2. **Start in production mode** (we'll add security rules later)
3. **Choose location**: Select closest to your location
4. **Click "Done"**

## Step 4: Register Web App

1. **In Firebase Console**, click **⚙️ Settings** → **Project settings**
2. **Scroll down** → Click **"</> Web app"**
3. **App nickname**: `property-management-frontend`
4. **✅ Check "Also set up Firebase Hosting"** (optional)
5. **Click "Register app"**
6. **📋 COPY THE CONFIG** - You'll need this next!

The config looks like:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef..."
};
```

## Step 5: Create Service Account (Backend)

1. **In Firebase Console** → **⚙️ Settings** → **Project settings**
2. **Go to "Service accounts" tab**
3. **Click "Generate new private key"**
4. **Download the JSON file** - Keep it safe!
5. **Open the JSON file** - You'll need these values:
   - `project_id`
   - `private_key` 
   - `client_email`

## Step 6: Create Environment Files

### Frontend Configuration (`frontend/.env`)
```env
# Replace with your actual Firebase web config
VITE_FIREBASE_API_KEY=AIzaSyC...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef...

# API Configuration
VITE_API_BASE_URL=http://localhost:5000/api
```

### Backend Configuration (`backend/.env`)
```env
# Firebase Admin Configuration (from service account JSON)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_ACTUAL_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Security (generate a random string)
JWT_SECRET=your-random-jwt-secret-here
```

## Step 7: Add Firestore Security Rules

In Firebase Console → Firestore Database → Rules, replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Properties - users can only access their own properties
    match /properties/{propertyId} {
      allow read, write: if request.auth != null && 
        (resource == null || resource.data.userId == request.auth.uid);
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // Rent records - users can only access rent for their properties
    match /rent/{rentId} {
      allow read, write: if request.auth != null &&
        exists(/databases/$(database)/documents/properties/$(resource.data.propertyId)) &&
        get(/databases/$(database)/documents/properties/$(resource.data.propertyId)).data.userId == request.auth.uid;
      allow create: if request.auth != null &&
        exists(/databases/$(database)/documents/properties/$(request.resource.data.propertyId)) &&
        get(/databases/$(database)/documents/properties/$(request.resource.data.propertyId)).data.userId == request.auth.uid;
    }
    
    // Payments - users can only access payments for their properties
    match /payments/{paymentId} {
      allow read, write: if request.auth != null &&
        exists(/databases/$(database)/documents/properties/$(resource.data.propertyId)) &&
        get(/databases/$(database)/documents/properties/$(resource.data.propertyId)).data.userId == request.auth.uid;
      allow create: if request.auth != null &&
        exists(/databases/$(database)/documents/properties/$(request.resource.data.propertyId)) &&
        get(/databases/$(database)/documents/properties/$(request.resource.data.propertyId)).data.userId == request.auth.uid;
    }
  }
}
```

## Step 8: Test Your Setup

1. **Create the `.env` files** with your actual Firebase config
2. **Restart servers**: `yarn dev`
3. **Visit**: http://localhost:3000
4. **Try to register** a new account
5. **Try to login** with email/password
6. **Try Google Sign-in**

## 🎯 Quick Checklist

- [ ] Firebase project created
- [ ] Authentication enabled (Email/Password + Google)
- [ ] Firestore Database created
- [ ] Web app registered and config copied
- [ ] Service account JSON downloaded
- [ ] `frontend/.env` created with web config
- [ ] `backend/.env` created with service account config
- [ ] Firestore security rules added
- [ ] Servers restarted
- [ ] Authentication tested

## 🚨 Important Notes

- **Keep your service account JSON file secure** - Don't share it publicly
- **The private key** in backend `.env` should be the actual key from the JSON file
- **For production**, use environment variables instead of `.env` files
- **Test thoroughly** - Try registration, login, and Google sign-in

## 🎉 Success!

Once configured, you'll have:
- ✅ User registration and login working
- ✅ Google Sign-in working  
- ✅ Secure user data storage
- ✅ Property management with user isolation
- ✅ Full authentication system

Need help with any step? Let me know! 🚀
