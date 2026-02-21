# Property Manager Permissions Update

## Summary

**Date:** January 10, 2026  
**Change:** Enabled all property managers to make changes to ALL properties under their organization

---

## What Changed

### Previous Behavior
Property managers could:
- ✅ **VIEW** all properties in their organization
- ❌ **EDIT/DELETE** only properties specifically assigned to them

### New Behavior
Property managers can now:
- ✅ **VIEW** all properties in their organization
- ✅ **CREATE** new properties in their organization
- ✅ **EDIT** all properties in their organization
- ✅ **DELETE** all properties in their organization
- ✅ **Manage tenants** for all properties
- ✅ **Record payments** for all properties
- ✅ **View reports** for all properties

---

## Technical Details

### Permission Changes

The `property_manager` role permissions were updated from **`:assigned`** scope to **`:organization`** scope:

#### Before:
```javascript
property_manager: [
  'properties:create:organization',
  'properties:read:assigned',      // ❌ Limited to assigned
  'properties:update:assigned',    // ❌ Limited to assigned
  'tenants:create:assigned',       // ❌ Limited to assigned
  'tenants:read:assigned',         // ❌ Limited to assigned
  'tenants:update:assigned',       // ❌ Limited to assigned
  'payments:create:assigned',      // ❌ Limited to assigned
  'payments:read:assigned',        // ❌ Limited to assigned
  'reports:read:assigned',         // ❌ Limited to assigned
  'maintenance:create:assigned',
  'maintenance:update:assigned',
]
```

#### After:
```javascript
property_manager: [
  'properties:create:organization',
  'properties:read:organization',    // ✅ Full organization access
  'properties:update:organization',  // ✅ Full organization access
  'properties:delete:organization',  // ✅ NEW: Can delete properties
  'tenants:create:organization',     // ✅ Full organization access
  'tenants:read:organization',       // ✅ Full organization access
  'tenants:update:organization',     // ✅ Full organization access
  'payments:create:organization',    // ✅ Full organization access
  'payments:read:organization',      // ✅ Full organization access
  'reports:read:organization',       // ✅ Full organization access
  'maintenance:create:assigned',
  'maintenance:update:assigned',
]
```

### Files Modified

1. **`backend/models/rbac-schemas.js`**
   - Updated `ROLE_PERMISSIONS.property_manager` array
   - Updated `SYSTEM_ROLES.PROPERTY_MANAGER.description`

2. **`backend/middleware/rbac.js`**
   - Updated comments to reflect new behavior
   - No code logic changes needed (automatically handles :organization scope)

3. **`backend/scripts/update-property-manager-permissions.js`** (NEW)
   - Script to update existing roles in Firestore database

---

## How to Apply These Changes

### Step 1: Restart Backend Server

The code changes are already in place. Restart your backend server:

```bash
# In the backend directory
cd S:\proSYS\PROPERTY-MANAGEMENT-SYSTEM\backend

# Stop the current server (Ctrl+C if running)

# Restart the server
npm start
# or
node server.js
# or if using the batch file
start.bat
```

### Step 2: Update Existing Roles in Database

Run the update script to modify existing `property_manager` roles in Firestore:

```bash
# In the backend directory
cd S:\proSYS\PROPERTY-MANAGEMENT-SYSTEM\backend

# Run the update script
node scripts/update-property-manager-permissions.js
```

**Expected Output:**
```
🔍 Fetching all property_manager roles from Firestore...

📋 Found X property_manager role(s) to update

💾 Committing X update(s) to Firestore...
✅ All property_manager roles updated successfully!

📊 Summary:
   Total property_manager roles: X
   Updated: X

🎯 What changed:
   • Properties: :assigned → :organization scope
   • Tenants: :assigned → :organization scope
   • Payments: :assigned → :organization scope
   • Reports: :assigned → :organization scope
   • Added: properties:delete:organization permission

💡 Impact:
   Property managers can now manage ALL properties in their organization,
   not just the ones specifically assigned to them.
```

### Step 3: Users Need to Re-login

For the changes to take effect for existing users:
1. Property managers must **log out** of the application
2. **Log back in** to get the updated permissions
3. They will now have full access to all organization properties

---

## Security Considerations

### Organization Isolation Still Enforced
- Property managers can ONLY access properties in **their own organization**
- They CANNOT access properties from other organizations
- Super admins and org admins maintain their elevated access levels

### Role Hierarchy Preserved
```
Super Admin (Level 10) → Org Admin (Level 9) → Property Manager (Level 6) → Financial Viewer (Level 4)
```

### What Property Managers CANNOT Do
- ❌ Access other organizations' data
- ❌ Manage users or roles (admin-only)
- ❌ Change organization settings (admin-only)
- ❌ View super admin functions

---

## Benefits

### For Property Managers
- 🚀 **Faster workflow** - No need to wait for property assignment
- 🔄 **Flexibility** - Can help with any property in emergencies
- 📊 **Better oversight** - Can view and manage all properties
- 👥 **Team collaboration** - Any manager can handle any property

### For Organizations
- ⚡ **Reduced bottlenecks** - Multiple managers can work on same properties
- 🎯 **Simplified management** - No need to assign properties individually
- 🔧 **Easier maintenance** - Any available manager can handle issues
- 📈 **Improved efficiency** - Better resource utilization

---

## Rollback Plan

If you need to revert these changes:

### 1. Restore Previous Permissions

Edit `backend/models/rbac-schemas.js` and change back to:

```javascript
property_manager: [
  'properties:create:organization',
  'properties:read:assigned',
  'properties:update:assigned',
  'tenants:create:assigned',
  'tenants:read:assigned', 
  'tenants:update:assigned',
  'payments:create:assigned',
  'payments:read:assigned',
  'reports:read:assigned',
  'maintenance:create:assigned',
  'maintenance:update:assigned',
],
```

### 2. Restart Backend Server

### 3. Run Update Script Again
The same script will update roles back to the old permissions.

---

## Testing Checklist

After applying changes, verify:

- [ ] Backend server restarts without errors
- [ ] Update script runs successfully
- [ ] Property managers can log in
- [ ] Property managers can view all organization properties
- [ ] Property managers can edit any property
- [ ] Property managers can create new properties
- [ ] Property managers can delete properties (if needed)
- [ ] Property managers CANNOT access other organizations' properties
- [ ] Org admins still have full access
- [ ] Financial viewers still have read-only access

---

## Support

If you encounter any issues:

1. Check backend server logs for errors
2. Verify user has logged out and back in
3. Check that user's organization is correctly set
4. Verify the update script ran successfully
5. Review Firestore roles collection for updated permissions

---

## Related Documentation

- `docs/RBAC_SYSTEM_DESIGN.md` - Overall RBAC architecture
- `docs/RBAC_IMPLEMENTATION_SUMMARY.md` - Implementation details
- `docs/SIMPLIFIED_RBAC_STRUCTURE.md` - Role structure overview

