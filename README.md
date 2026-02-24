# Property Management System

A comprehensive web application for managing rental properties, tracking rent payments, and monitoring tenant information. Built with React and Firebase — no backend server required.

## Features

- **Property Management** — Add, edit, and manage buildings and land properties with floors, spaces, and squatter areas
- **Tenant Management** — Assign tenants to spaces, track lease dates, and renew leases
- **Rent & Invoices** — Create monthly invoices for active tenants and track rent agreements
- **Payment Tracking** — Record and monitor rent payments with receipts and export to CSV
- **Dashboard Analytics** — Collection rates, monthly comparisons, and property statistics
- **Role-Based Access Control (RBAC)** — Super Admin, Org Admin, Property Manager, and Financial Viewer roles
- **Multi-Organization Support** — Manage multiple organizations from a single super admin account
- **User Authentication** — Email/password and Google sign-in via Firebase Auth
- **Responsive Design** — Mobile-friendly interface built with Material-UI

## Tech Stack

- **React 18** — UI framework
- **Vite** — Build tool and development server
- **Material-UI (MUI)** — Component library and design system
- **React Router v6** — Client-side routing
- **React Query** — Data fetching and caching
- **Firebase Authentication** — User sign-in
- **Firebase Firestore** — NoSQL database (direct from frontend, no backend)
- **React Hook Form** — Form management
- **date-fns** — Date utilities
- **Recharts** — Analytics charts

## Quick Start

### Prerequisites

- Node.js v18 or higher
- Yarn package manager
- A Firebase project with Firestore and Authentication enabled

### 1. Clone the repository

```bash
git clone <repository-url>
cd property-management-system
```

### 2. Configure Firebase

Create a Firebase project at [Firebase Console](https://console.firebase.google.com):

- Enable **Firestore Database**
- Enable **Authentication** (Email/Password and Google providers)
- Copy your web app config from **Project Settings → Your apps**

Create `frontend/.env` with your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 3. Install dependencies

```bash
cd frontend
yarn install
```

### 4. Start the development server

```bash
yarn dev
```

Open **http://localhost:3000** in your browser.

## Project Structure

```
property-management-system/
├── frontend/                  # The entire application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── contexts/          # AuthContext (Firebase Auth + Firestore profile)
│   │   ├── pages/             # Application pages
│   │   │   └── admin/         # Super admin and org admin pages
│   │   ├── services/
│   │   │   └── api.js         # Firebase SDK service layer (replaces REST API)
│   │   ├── config/
│   │   │   └── firebase.js    # Firebase app initialisation
│   │   └── theme/             # MUI theme and animations
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env                   # Firebase credentials (not committed)
├── docs/                      # Reference documentation
├── firestore.rules            # Firestore security rules
├── package.json               # Root scripts
└── README.md
```

## Available Scripts

Run these from the **root** directory:

```bash
# Start development server
yarn dev

# Build for production
yarn build

# Preview production build locally
yarn preview
```

Or run from `frontend/` directly with the same commands.

## Firestore Collections

The app reads and writes these Firestore collections directly from the frontend:

| Collection | Description |
|---|---|
| `users` | User profiles, organizationId, roleId, status |
| `organizations` | Organization records |
| `roles` | Role definitions with permissions arrays |
| `properties` | Property documents (buildings and land) |
| `rent` | Rent/lease records linking tenants to spaces |
| `payments` | Payment records |
| `invoices` | Monthly invoices |
| `accessRequests` | Pending user access requests |

## Firestore Security Rules

Deploy these rules from the Firebase Console (**Firestore → Rules**) or using the Firebase CLI:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can read their own profile; admins can read all
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        (request.auth.uid == userId ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.keys().hasAny(['roleId']));
    }

    // Authenticated users can read/write their organization's data
    match /properties/{doc} {
      allow read, write: if request.auth != null;
    }
    match /rent/{doc} {
      allow read, write: if request.auth != null;
    }
    match /payments/{doc} {
      allow read, write: if request.auth != null;
    }
    match /invoices/{doc} {
      allow read, write: if request.auth != null;
    }
    match /organizations/{doc} {
      allow read, write: if request.auth != null;
    }
    match /roles/{doc} {
      allow read, write: if request.auth != null;
    }
    match /accessRequests/{doc} {
      allow read, write: if request.auth != null;
    }
    match /invitations/{doc} {
      allow read, write: if request.auth != null;
    }
    match /system/{doc} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## RBAC — Role Levels

| Role | Level | Description |
|---|---|---|
| Super Admin | 10/10 | Full access across all organizations |
| Org Admin | 9/10 | Full access within their organization |
| Property Manager | 6/10 | Manages assigned properties only |
| Financial Viewer | 4/10 | Read-only access to financial data |

New users must sign up and submit an access request. An Org Admin then approves the request and assigns a role.

## Deployment

The app is a pure static site — deploy the contents of `frontend/dist/` to any static host.

### Build

```bash
cd frontend
yarn build
# Output is in frontend/dist/
```

### Netlify

1. Connect your GitHub repo in Netlify
2. Set **Base directory** to `frontend`
3. Set **Build command** to `yarn build`
4. Set **Publish directory** to `dist`
5. Add all `VITE_FIREBASE_*` variables under **Environment variables**

### Vercel

1. Connect your GitHub repo in Vercel
2. Set **Root directory** to `frontend`
3. Framework preset: **Vite**
4. Add all `VITE_FIREBASE_*` variables under **Environment variables**

### Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Set public directory to: frontend/dist
# Configure as SPA: Yes
firebase deploy
```

## License

MIT

---

**Happy Property Managing!**
