# 🏢 Properties Page - Real Database Integration

## ✅ **STATUS: ALREADY USING REAL DATA**

The Properties page at `http://localhost:3001/app/properties` is **already configured** to fetch and display real data from your Firestore database.

---

## 📊 **How It Works:**

### **Data Fetching:**
```javascript
// Using React Query to fetch properties
const {
  data: propertiesData,
  isLoading,
  error,
} = useQuery('properties', propertiesAPI.getAll);

// API call to backend
propertiesAPI.getAll() → GET /api/properties
                      ↓
              Backend with RBAC
                      ↓
         Returns properties from Firestore
```

### **RBAC Protection:**
```javascript
// Backend route (properties.js line 104)
router.get('/', 
  verifyTokenWithRBAC, 
  requireOrganization, 
  requireAnyPermission([
    'properties:read:organization',  // Org admins see all
    'properties:read:assigned'       // Managers see assigned
  ]), 
  async (req, res) => {
    // Filters properties based on user's role
    const propertiesSnapshot = await filterPropertiesByAccess(
      userId, 
      organizationId, 
      permissions
    );
    
    return res.json({ properties });
  }
);
```

---

## 🎯 **What Gets Displayed:**

### **For Organization Administrators:**
- ✅ ALL properties in their organization
- ✅ Full details for each property
- ✅ Can create, edit, delete properties

### **For Property Managers:**
- ✅ Only properties assigned to them
- ✅ Properties where they're listed in `assignedManagers`
- ✅ Properties where they're the `caretakerId`
- ❌ Cannot see unassigned properties

### **For Financial Viewers:**
- ✅ Basic property information (read-only)
- ❌ Cannot create or edit properties

---

## 📋 **Property Card Display:**

Each property card shows:

### **Header:**
- ✅ Property name
- ✅ Status chip (Vacant/Occupied/Maintenance)
- ✅ Menu button (Edit/Delete/Assign)

### **Details:**
- ✅ **Location:** Village, District
- ✅ **Type:** Building/Land + Ownership (Owned/Leasing)
- ✅ **Space Availability:**
  - Total spaces count
  - Occupied vs Available
  - Occupancy percentage
  - Visual indicators (green/yellow)

### **Actions:**
- ✅ Click card → View property details
- ✅ Menu → Edit/Delete/Assign tenants

---

## 🔍 **Debug Information Added:**

I've added console logging to help diagnose any issues:

```javascript
console.log('🏢 PropertiesPage - API Response:', propertiesData);
console.log('🏢 PropertiesPage - Properties array:', properties);
console.log('🏢 PropertiesPage - Properties count:', properties.length);
```

**Check browser console (F12) to see:**
- How many properties are loaded
- The structure of property data
- Any errors in fetching

---

## 🐛 **If Page Appears Empty:**

### **Possible Reasons:**

#### **1. No Properties in Database**
**Check:** Browser console shows `Properties count: 0`

**Solution:**
```
Click "Add Property" button → Create your first property
```

#### **2. Permission Issue**
**Check:** Console shows error or 403 Forbidden in Network tab

**Solution:**
- Verify you're logged in
- Check your role has `properties:read` permission
- Org admin or Property Manager should work

#### **3. Backend Not Running**
**Check:** Network tab shows failed API calls

**Current Status:** 
- Backend is trying to start but port 5001 is in use
- Process 28752 was killed
- Nodemon should restart automatically

**Solution:**
```powershell
# In the terminal with yarn dev running
# Look for:
[0] [nodemon] starting `node server.js`
[0] 🚀 Server running on port 5001

# If still showing "app crashed":
# Type: rs
# This forces nodemon to restart
```

#### **4. Wrong Organization**
**Check:** You're assigned to an organization with properties

**Solution:**
- Verify your user profile has `organizationId`
- Check you're in the same organization as the properties

---

## 📝 **Property Data Structure:**

### **From Database:**
```javascript
{
  id: "property-uuid",
  name: "Sunset Apartments",
  type: "building",
  organizationId: "org-uuid",
  location: {
    village: "Kampala",
    parish: "Central",
    subCounty: "Kampala Central",
    county: "Kampala",
    district: "Kampala",
    landmarks: "Near Main Road"
  },
  ownershipType: "owned",
  establishmentDate: "2024-01-15",
  caretakerName: "John Doe",
  caretakerPhone: "0700123456",
  buildingDetails: {
    buildingType: "apartment",
    numberOfFloors: 3,
    floors: [
      {
        floorNumber: 0,
        floorName: "Ground Floor",
        spaces: [
          {
            spaceId: "space-1",
            spaceName: "Room A1",
            spaceType: "apartment",
            monthlyRent: 500000,
            status: "vacant"
          }
        ]
      }
    ],
    totalRentableSpaces: 12
  },
  status: "vacant",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

## ✅ **Verification Steps:**

### **Step 1: Check Backend is Running**
Look at your terminal where `yarn dev` is running:
```
[0] 🚀 Server running on port 5001
```

If you see "app crashed" → Type `rs` to restart

### **Step 2: Check API Response**
1. Open browser at http://localhost:3001/app/properties
2. Press F12 → Network tab
3. Look for `GET /api/properties`
4. Check Status: Should be **200 OK**
5. Check Response: Should have `{ properties: [...] }`

### **Step 3: Check Console Logs**
F12 → Console tab:
```
🏢 PropertiesPage - API Response: {data: {properties: Array(X)}}
🏢 PropertiesPage - Properties array: Array(X)
🏢 PropertiesPage - Properties count: X
```

### **Step 4: Verify Data Display**
- ✅ Property cards show correct names
- ✅ Locations display: "Village, District"
- ✅ Type shows: "Building • Owned" or "Land • Leasing"
- ✅ Space counts are accurate

---

## 🎉 **Current Status:**

✅ **PropertiesPage uses real database data**
✅ **RBAC filtering applied based on user role**
✅ **Debug logging added for troubleshooting**
✅ **Location display fixed** (now shows village, district)
✅ **Space availability calculated from actual data**
✅ **All features use live data, not mock data**

---

## 🚀 **What to Do Now:**

1. **Type `rs` in your terminal** (where yarn dev is running) to restart backend
2. **Wait for:** `[0] 🚀 Server running on port 5001`
3. **Refresh browser** at http://localhost:3001/app/properties
4. **Check console** (F12) for debug messages
5. **If empty:** Create a property using "Add Property" button
6. **If loaded:** See all your properties with real data!

---

The Properties page is ready to go - it just needs the backend server running properly! 🎯

