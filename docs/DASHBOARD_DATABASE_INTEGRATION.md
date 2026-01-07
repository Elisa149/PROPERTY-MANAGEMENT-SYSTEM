# Dashboard Database Integration

## Overview
Updated the dashboard to properly fetch data from the database using RBAC-enabled endpoints.

## Changes Made

### Backend Changes (`backend/routes/payments.js`)

#### 1. Added RBAC Middleware
- Imported RBAC middleware functions:
  - `verifyTokenWithRBAC` - Validates token and loads user permissions
  - `requirePermission` - Ensures user has specific permissions
  - `requireAnyPermission` - Ensures user has at least one permission
  - `requireOrganization` - Ensures user belongs to an organization
  - `filterPropertiesByAccess` - Filters properties based on user access

#### 2. Updated Dashboard Summary Endpoint (`GET /payments/dashboard/summary`)

**Previous Implementation:**
- Used old `verifyToken` middleware
- Queried properties by `userId` 
- Did not respect RBAC permissions
- Did not calculate `totalSpaces`

**New Implementation:**
- Uses `verifyTokenWithRBAC` with proper permission checks
- Queries by `organizationId` instead of `userId`
- Respects RBAC permissions (organization-wide or assigned properties)
- Calculates `totalSpaces` from property structures:
  - For buildings: counts all spaces across all floors
  - For land: counts all squatters
- Calculates expected rent from actual property data:
  - Buildings: sums `monthlyRent` from occupied spaces
  - Land: sums `monthlyPayment` from active squatters

**Response Structure:**
```json
{
  "totalProperties": 5,
  "totalSpaces": 32,
  "thisMonth": {
    "collected": 15000,
    "expected": 20000,
    "payments": 8,
    "collectionRate": 75
  },
  "lastMonth": {
    "collected": 18000,
    "expected": 20000,
    "payments": 10,
    "collectionRate": 90
  },
  "recentPayments": [
    {
      "id": "payment_id",
      "amount": 5000,
      "paymentDate": "2024-10-15T00:00:00.000Z",
      "propertyName": "Building A",
      "tenantName": "John Doe",
      "paymentMethod": "bank_transfer"
    }
  ]
}
```

#### 3. Updated All Payment Routes to Use RBAC

**GET /payments**
- Now uses RBAC authentication
- Filters by organization and accessible properties
- Requires `payments:read:organization` or `payments:read:assigned` permission

**GET /payments/:id**
- Uses RBAC authentication
- Verifies payment belongs to user's organization
- Requires `payments:read:organization` or `payments:read:assigned` permission

**POST /payments**
- Uses RBAC authentication
- Adds `organizationId` to payment records
- Adds `createdBy` field
- Requires `payments:create:organization` or `payments:create:assigned` permission

**PUT /payments/:id**
- Uses RBAC authentication
- Verifies organization ownership
- Adds `updatedBy` field
- Requires `payments:update:organization` or `payments:update:assigned` permission

**DELETE /payments/:id**
- Uses RBAC authentication
- Verifies organization ownership
- Requires `payments:delete:organization` or `payments:delete:assigned` permission

### Frontend Changes
No changes were needed to the frontend as it was already configured to:
- Call `paymentsAPI.getDashboardSummary()` 
- Display `totalSpaces` from the API response
- Handle fallback data when the API fails
- Show properties with their space/squatter counts

## Benefits

1. **Security**: All payment endpoints now use RBAC for proper authorization
2. **Multi-tenancy**: Data is properly scoped to organizations
3. **Accurate Data**: Dashboard shows real-time data from the database
4. **Permission-based Access**: Users only see data they have permission to access
5. **Consistency**: All payment routes follow the same RBAC pattern

## Testing

To test the dashboard integration:

1. **Start the backend server:**
   ```bash
   cd backend
   npm start
   ```

2. **Start the frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Login and navigate to dashboard** - You should see:
   - Total Properties count
   - Total Spaces count (all spaces across all properties)
   - This Month's collection statistics
   - Last Month's collection statistics
   - Recent payments list
   - Property overview with space counts

## Database Structure Requirements

### Payments Collection
```javascript
{
  id: string,
  propertyId: string,
  rentId: string,
  amount: number,
  lateFee: number,
  paymentDate: Timestamp,
  paymentMethod: string,
  organizationId: string,  // NEW FIELD
  createdBy: string,       // NEW FIELD
  updatedBy: string,       // NEW FIELD (for updates)
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Properties Collection (for reference)
```javascript
{
  id: string,
  name: string,
  type: 'building' | 'land',
  organizationId: string,
  
  // For buildings:
  buildingDetails: {
    floors: [{
      floorNumber: number,
      spaces: [{
        spaceId: string,
        spaceName: string,
        monthlyRent: number,
        status: 'vacant' | 'occupied' | 'maintenance'
      }]
    }]
  },
  
  // For land:
  landDetails: {
    squatters: [{
      squatterId: string,
      squatterName: string,
      monthlyPayment: number,
      status: 'active' | 'inactive' | 'disputed'
    }]
  }
}
```

## Notes

- The dashboard automatically falls back to calculating expected rent from properties if payment data is unavailable
- All calculations respect user's permission scope (organization-wide or assigned properties only)
- Expected monthly rent is calculated from occupied spaces and active squatters only
- Collection rate is calculated as: (collected / expected) * 100

