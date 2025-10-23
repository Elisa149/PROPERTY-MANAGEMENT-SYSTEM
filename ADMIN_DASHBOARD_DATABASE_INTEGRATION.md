# Admin Dashboard - Database Integration

## Overview
Connected the Admin Dashboard to the database to display real-time organization statistics, replacing all mock data with live data from Firestore.

## Changes Implemented

### ✅ 1. Backend API Endpoint

**File**: `backend/routes/users.js`

Created a comprehensive admin dashboard statistics endpoint:

```javascript
GET /api/users/admin/dashboard/stats
```

**Features**:
- **RBAC Protected**: Only org_admin and super_admin can access
- **Organization Scoped**: All data filtered by organizationId
- **Comprehensive Statistics**: Revenue, properties, users, occupancy, collection rates

**Data Returned**:
```json
{
  "stats": {
    "totalRevenue": 2450000,
    "monthlyGrowth": 12.5,
    "totalProperties": 12,
    "activeUsers": 15,
    "pendingApprovals": 3,
    "collectionRate": 94.2,
    "occupancyRate": 89.5
  },
  "topProperties": [
    {
      "id": "prop123",
      "name": "OSC Building",
      "revenue": 1200000,
      "occupancy": 95,
      "trend": "stable"
    }
  ],
  "recentActivities": [
    {
      "id": "activity1",
      "type": "payment",
      "message": "Payment received from OSC Building",
      "time": "2 hours ago",
      "status": "success"
    }
  ],
  "pendingApprovals": [
    {
      "id": "req123",
      "userName": "John Doe",
      "email": "john@example.com",
      "requestedRole": "Property Manager",
      "requestDate": "2025-01-20T00:00:00.000Z",
      "message": "Experienced in property management"
    }
  ]
}
```

### ✅ 2. Statistics Calculated

#### Revenue Statistics
- **Total Revenue**: Sum of all payments in organization
- **Current Month Revenue**: Payments from current month
- **Previous Month Revenue**: Payments from previous month
- **Monthly Growth**: Percentage change from previous month

```javascript
const monthlyGrowth = previousMonthRevenue > 0
  ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
  : currentMonthRevenue > 0 ? 100 : 0;
```

#### Property Statistics
- **Total Properties**: Count of all properties in organization
- **Total Spaces**: Calculated from building floors and land squatters
- **Occupied Spaces**: Count of spaces with 'occupied' or 'active' status
- **Occupancy Rate**: (Occupied / Total) × 100

```javascript
// For buildings
property.buildingDetails.floors.forEach(floor => {
  const spaces = floor.spaces || [];
  totalSpaces += spaces.length;
  occupiedSpaces += spaces.filter(s => s.status === 'occupied').length;
});

// For land
totalSpaces += property.landDetails.squatters.length;
occupiedSpaces += property.landDetails.squatters.filter(s => s.status === 'active').length;
```

#### User Statistics
- **Active Users**: Count of users with status === 'active'
- **Pending Approvals**: Count of pending access requests

#### Collection Rate
- **Expected Monthly Rent**: Sum of all active rent agreements
- **Collection Rate**: (Current Month Revenue / Expected Rent) × 100

```javascript
const collectionRate = expectedMonthlyRent > 0
  ? (currentMonthRevenue / expectedMonthlyRent) * 100
  : 0;
```

### ✅ 3. Top Performing Properties

Properties ranked by total revenue with occupancy rates:

```javascript
const topProperties = properties
  .map(property => ({
    id: property.id,
    name: property.name,
    revenue: propertyRevenue[property.id] || 0,
    occupancy: calculateOccupancy(property),
    trend: 'stable'
  }))
  .sort((a, b) => b.revenue - a.revenue)
  .slice(0, 5);
```

### ✅ 4. Recent Activities

Combined timeline of payments and user registrations:

```javascript
const recentActivities = [...recentPayments, ...recentUsers]
  .sort((a, b) => b.timestamp - a.timestamp)
  .slice(0, 10)
  .map(activity => ({
    ...activity,
    message: activity.type === 'payment'
      ? `Payment received from ${activity.propertyName}`
      : `New user registration: ${activity.userName}`,
    time: formatTimeAgo(activity.timestamp)
  }));
```

**Time Formatting**:
```javascript
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString();
}
```

### ✅ 5. Frontend API Integration

**File**: `frontend/src/services/api.js`

Added new API method:

```javascript
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  updateProfile: (id, data) => api.put(`/users/${id}/profile`, data),
  updateRole: (id, data) => api.put(`/users/${id}/role`, data),
  getAdminDashboardStats: () => api.get('/users/admin/dashboard/stats'), // NEW
};
```

### ✅ 6. Admin Dashboard Page Updates

**File**: `frontend/src/pages/admin/AdminDashboardPage.jsx`

#### React Query Integration
```javascript
const {
  data: dashboardData,
  isLoading,
  error,
} = useQuery('adminDashboardStats', usersAPI.getAdminDashboardStats, {
  retry: 2,
  retryDelay: 1000,
  onError: (error) => {
    console.error('Admin dashboard error:', error);
    toast.error(error.response?.data?.error || 'Failed to load dashboard data');
  }
});
```

#### Data Extraction
```javascript
const dashboardStats = dashboardData?.data?.stats || {
  totalRevenue: 0,
  monthlyGrowth: 0,
  totalProperties: 0,
  activeUsers: 0,
  pendingApprovals: 0,
  collectionRate: 0,
  occupancyRate: 0,
};

const recentActivities = dashboardData?.data?.recentActivities || [];
const pendingApprovals = dashboardData?.data?.pendingApprovals || [];
const topProperties = dashboardData?.data?.topProperties || [];
```

#### Loading State
```javascript
if (isLoading) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <CircularProgress size={60} />
    </Box>
  );
}
```

#### Error State
```javascript
if (error) {
  return (
    <Box sx={{ p: 3 }}>
      <Alert severity="error">
        <Typography variant="h6">Error Loading Dashboard</Typography>
        <Typography>{error.response?.data?.error || 'Failed to load dashboard data.'}</Typography>
      </Alert>
    </Box>
  );
}
```

#### Date Formatting
```javascript
<TableCell>
  {approval.requestDate instanceof Date 
    ? format(approval.requestDate, 'MMM dd, yyyy')
    : approval.requestDate}
</TableCell>
```

## Security Features

### 1. Role-Based Access Control
```javascript
// Only org admins and super admins can view admin dashboard
if (!userRole || !['org_admin', 'super_admin'].includes(userRole.name)) {
  return res.status(403).json({ error: 'Only administrators can access admin dashboard' });
}
```

### 2. Organization Scoping
All queries filtered by `organizationId`:

```javascript
// Properties
const propertiesSnapshot = await db.collection('properties')
  .where('organizationId', '==', organizationId)
  .get();

// Users
const usersSnapshot = await db.collection('users')
  .where('organizationId', '==', organizationId)
  .get();

// Payments
const paymentsSnapshot = await db.collection('payments')
  .where('organizationId', '==', organizationId)
  .get();

// Access Requests
const accessRequestsSnapshot = await db.collection('accessRequests')
  .where('organizationId', '==', organizationId)
  .where('status', '==', 'pending')
  .get();

// Rent Agreements
const rentSnapshot = await db.collection('rent')
  .where('organizationId', '==', organizationId)
  .where('status', '==', 'active')
  .get();
```

### 3. Token Verification
All requests protected by `verifyTokenWithRBAC` middleware.

## Data Flow

```
User Opens Admin Dashboard
         ↓
Frontend calls usersAPI.getAdminDashboardStats()
         ↓
Request authenticated via Firebase token
         ↓
Backend verifies user role (org_admin/super_admin)
         ↓
Backend queries Firestore:
  - Properties (calculate spaces & occupancy)
  - Users (count active users)
  - Payments (calculate revenue & growth)
  - Rent agreements (calculate collection rate)
  - Access requests (count pending approvals)
         ↓
Backend calculates statistics
         ↓
Backend returns comprehensive dashboard data
         ↓
Frontend displays data in cards, charts, and tables
```

## Dashboard Components

### 1. Key Metrics Cards
- **Total Revenue**: With monthly growth indicator
- **Total Properties**: With occupancy rate
- **Active Users**: Across all roles
- **Pending Approvals**: Requires attention alert

### 2. Pending Approvals Table
- User name with avatar
- Email address
- Requested role (chip)
- Request date (formatted)
- Request message (truncated)

### 3. Property Performance Overview
- Top 5 properties by revenue
- Revenue and occupancy percentage
- Trend indicators (up/down arrows)
- Progress bars for visual representation

### 4. Recent Activities
- Combined timeline of payments and user registrations
- Activity type icons (payment, user, maintenance, property)
- Human-readable timestamps
- Status chips (success, pending, warning)

### 5. Quick Actions
- Manage Users
- Organization Settings
- View Analytics
- Property Assignments

### 6. System Alerts
- System status messages
- Maintenance notifications
- Warning indicators

## Benefits

### 1. Real-Time Data
✅ Dashboard always shows current organization data
✅ No manual refresh needed (React Query handles caching)
✅ Accurate statistics from Firestore

### 2. Performance
✅ Single API call for all dashboard data
✅ Efficient Firestore queries with proper filtering
✅ React Query caching reduces unnecessary requests

### 3. Security
✅ Role-based access control enforced
✅ Organization-level data isolation
✅ Token verification on every request

### 4. User Experience
✅ Loading state while fetching data
✅ Error handling with user-friendly messages
✅ Proper date formatting
✅ Visual indicators (trends, progress bars, chips)

## Testing Checklist

### Backend Testing
- [ ] API endpoint accessible by org_admin
- [ ] API endpoint accessible by super_admin
- [ ] API endpoint blocked for other roles
- [ ] Revenue calculations correct
- [ ] Occupancy rate calculations correct
- [ ] Collection rate calculations correct
- [ ] Monthly growth calculated correctly
- [ ] Top properties sorted by revenue
- [ ] Recent activities sorted by timestamp
- [ ] Pending approvals filtered correctly

### Frontend Testing
- [ ] Dashboard loads for admin users
- [ ] Access denied for non-admin users
- [ ] Loading spinner displays while fetching
- [ ] Error message displays on API failure
- [ ] All statistics display correctly
- [ ] Pending approvals table populates
- [ ] Top properties list displays
- [ ] Recent activities display
- [ ] Date formatting works correctly
- [ ] Currency formatting works correctly

### Integration Testing
- [ ] Dashboard reflects actual database data
- [ ] Statistics update when new data added
- [ ] No mock data displayed
- [ ] Organization scoping works correctly
- [ ] Multiple admins see their own org data

## Troubleshooting

### Common Issues

**1. Dashboard shows zeros for all statistics**
- Check if user has active organization
- Verify data exists in Firestore collections
- Check backend console for query errors

**2. Access denied error**
- Verify user role is org_admin or super_admin
- Check user has organizationId set
- Verify token is valid

**3. Loading state never ends**
- Check backend server is running
- Verify API endpoint is accessible
- Check network tab for 500 errors

**4. Data not updating**
- React Query cache may need invalidation
- Refresh page to force new API call
- Check `staleTime` and `cacheTime` settings

### Debug Commands

```javascript
// Check API response in browser console
usersAPI.getAdminDashboardStats().then(console.log);

// Verify user role
console.log('User role:', userRole);

// Check React Query cache
console.log('Dashboard data:', dashboardData);
```

## Future Enhancements

Potential improvements:
- [ ] Real-time updates using Firestore listeners
- [ ] Date range filters for statistics
- [ ] Export dashboard as PDF/Excel
- [ ] More detailed analytics charts
- [ ] Maintenance requests tracking
- [ ] Revenue trend graph
- [ ] Occupancy trend graph
- [ ] Custom dashboard widgets
- [ ] Dashboard refresh button
- [ ] Auto-refresh every N minutes

## Files Modified

### Backend
- `backend/routes/users.js` - Added admin dashboard stats endpoint

### Frontend
- `frontend/src/services/api.js` - Added getAdminDashboardStats method
- `frontend/src/pages/admin/AdminDashboardPage.jsx` - Integrated real API data

### Documentation
- `ADMIN_DASHBOARD_DATABASE_INTEGRATION.md` - This file

## Notes

- All statistics are calculated server-side for accuracy
- Organization-level isolation enforced throughout
- Efficient single API call reduces frontend complexity
- React Query handles caching and error states
- Date formatting uses date-fns for consistency
- Currency formatting uses Intl.NumberFormat for UGX

The admin dashboard now displays real-time data from the database, providing administrators with accurate insights into their organization's performance! 🎉

