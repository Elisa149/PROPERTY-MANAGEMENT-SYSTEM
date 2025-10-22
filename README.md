# Property Management System

A comprehensive web application for managing rental properties, tracking rent payments, and monitoring tenant information. Built with Node.js, React, Firebase, and Material-UI.

## Features

- 🏠 **Property Management**: Add, edit, and manage your rental properties
- 💰 **Rent Tracking**: Track monthly rent amounts and lease agreements  
- 📊 **Payment Monitoring**: Record and monitor rent payments with detailed history
- 👤 **User Authentication**: Secure login with Firebase Authentication (Email/Password and Google)
- 📈 **Dashboard Analytics**: Overview of collection rates, recent payments, and property statistics
- 📱 **Responsive Design**: Mobile-friendly interface built with Material-UI
- 🔒 **Secure Backend**: Node.js/Express API with Firebase Admin SDK

## Tech Stack

### Frontend
- **React** - UI framework
- **Vite** - Build tool and development server
- **Material-UI (MUI)** - Component library and design system
- **React Router** - Client-side routing
- **React Query** - Data fetching and caching
- **React Hook Form** - Form management
- **Firebase SDK** - Authentication

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **Firebase Admin SDK** - Authentication and Firestore database
- **Joi** - Data validation
- **CORS, Helmet** - Security middleware

### Database
- **Firebase Firestore** - NoSQL document database

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Yarn package manager
- Firebase project with Firestore and Authentication enabled

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd property-management-system
   ```

2. **Install dependencies**
   ```bash
   yarn setup
   ```

3. **Firebase Configuration**
   
   Create a Firebase project at [Firebase Console](https://console.firebase.google.com):
   - Enable Firestore Database
   - Enable Authentication (Email/Password and Google providers)
   - Create a service account and download the private key
   
   **Backend Configuration:**
   ```bash
   cd backend
   cp env-template.txt .env
   ```
   
   Edit `.env` with your Firebase credentials:
   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----"
   FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   JWT_SECRET=your-secret-key
   ```
   
   **Frontend Configuration:**
   ```bash
   cd frontend
   cp env-template.txt .env
   ```
   
   Edit `.env` with your Firebase web app config:
   ```
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
   VITE_API_BASE_URL=http://localhost:5000/api
   ```

4. **Start the development servers**
   ```bash
   # Start both frontend and backend
   yarn dev
   
   # Or start individually:
   # Backend only:
   cd backend && yarn dev
   
   # Frontend only:
   cd frontend && yarn dev
   ```

5. **Open your browser**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

## Project Structure

```
property-management-system/
├── backend/                 # Node.js/Express API
│   ├── routes/             # API route handlers
│   ├── middleware/         # Authentication middleware
│   ├── server.js           # Express server setup
│   └── package.json        # Backend dependencies
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React context providers
│   │   ├── pages/          # Main application pages
│   │   ├── services/       # API service layer
│   │   └── config/         # Configuration files
│   ├── public/             # Static assets
│   └── package.json        # Frontend dependencies
└── package.json            # Root package.json with workspace scripts
```

## API Endpoints

### Authentication
- `POST /api/auth/verify` - Verify Firebase token
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Properties
- `GET /api/properties` - Get all properties
- `POST /api/properties` - Create new property
- `GET /api/properties/:id` - Get specific property
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property
- `GET /api/properties/:id/stats` - Get property statistics

### Rent Management
- `GET /api/rent` - Get all rent records
- `POST /api/rent` - Create new rent record
- `PUT /api/rent/:id` - Update rent record
- `DELETE /api/rent/:id` - Delete rent record
- `GET /api/rent/property/:propertyId` - Get rent records for property

### Payments
- `GET /api/payments` - Get all payments (with filters)
- `POST /api/payments` - Record new payment
- `PUT /api/payments/:id` - Update payment
- `DELETE /api/payments/:id` - Delete payment
- `GET /api/payments/dashboard/summary` - Get dashboard summary

## Development

### Available Scripts

```bash
# Install all dependencies (root, frontend, backend)
yarn setup

# Start both frontend and backend in development mode
yarn dev

# Build frontend for production
yarn build

# Start production server
yarn start
```

### Environment Variables

**Backend (.env):**
- `FIREBASE_PROJECT_ID` - Your Firebase project ID
- `FIREBASE_PRIVATE_KEY` - Firebase service account private key
- `FIREBASE_CLIENT_EMAIL` - Firebase service account email
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `FRONTEND_URL` - Frontend URL for CORS
- `JWT_SECRET` - Secret key for JWT tokens

**Frontend (.env):**
- `VITE_FIREBASE_API_KEY` - Firebase web app API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID` - Firebase web app ID
- `VITE_API_BASE_URL` - Backend API base URL

## Firebase Security Rules

Add these Firestore security rules to ensure data privacy:

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
        resource.data.userId == request.auth.uid;
    }
    
    // Rent records - users can only access rent for their properties
    match /rent/{rentId} {
      allow read, write: if request.auth != null &&
        exists(/databases/$(database)/documents/properties/$(resource.data.propertyId)) &&
        get(/databases/$(database)/documents/properties/$(resource.data.propertyId)).data.userId == request.auth.uid;
    }
    
    // Payments - users can only access payments for their properties
    match /payments/{paymentId} {
      allow read, write: if request.auth != null &&
        exists(/databases/$(database)/documents/properties/$(resource.data.propertyId)) &&
        get(/databases/$(database)/documents/properties/$(resource.data.propertyId)).data.userId == request.auth.uid;
    }
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions:

1. Check the [Issues](../../issues) page
2. Create a new issue if your problem isn't already reported
3. Provide detailed information about your environment and the issue

---

**Happy Property Managing! 🏠💼**
