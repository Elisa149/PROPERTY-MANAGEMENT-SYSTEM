# Property Management System - Setup Guide

🎉 **Congratulations!** Your property management system has been successfully created.

## Next Steps

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (or use existing)
3. Enable **Firestore Database**
4. Enable **Authentication** with Email/Password and Google providers
5. Create a **Service Account** for backend access

### 2. Backend Configuration

Create `backend/.env` file with your Firebase credentials:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key-here\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Security
JWT_SECRET=your-random-secret-key-here
```

### 3. Frontend Configuration

Create `frontend/.env` file with your Firebase web app config:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# API Configuration
VITE_API_BASE_URL=http://localhost:5000/api
```

### 4. Firestore Security Rules

In Firebase Console > Firestore Database > Rules, paste these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own user profile data
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

### 5. Start Development

Once you have configured the environment files:

```bash
# Start both frontend and backend
yarn dev
```

Or start them separately:

```bash
# Terminal 1 - Backend
cd backend
yarn dev

# Terminal 2 - Frontend  
cd frontend
yarn dev
```

### 6. Access Your Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

## Features Available

✅ **Complete Authentication System**
- Email/Password registration and login
- Google Sign-in integration
- Secure token-based authentication

✅ **Property Management**
- Add, view, edit, delete properties
- Property details with images and amenities
- Property status tracking (vacant, occupied, maintenance)

✅ **Rent Tracking**
- Create rent agreements with tenant information
- Monthly rent amount tracking
- Lease start/end date management

✅ **Payment Monitoring** 
- Record rent payments with multiple payment methods
- Payment history tracking
- Late fee calculations
- Dashboard analytics and collection rates

✅ **Dashboard Analytics**
- Monthly collection summaries
- Property performance metrics
- Recent payment tracking
- Collection rate analysis

✅ **Responsive Design**
- Mobile-friendly Material-UI interface
- Modern, professional design
- Intuitive navigation

## Need Help?

- Check the `README.md` for detailed documentation
- Review the `firestore.rules` file for database security
- All API endpoints are documented in the README

**Happy Property Managing! 🏠💼**
