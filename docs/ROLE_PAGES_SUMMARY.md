# 📋 Pages Available by Role

This document lists all pages available in the sidebar for each role in the organization.

---

## 🎖️ **Super Administrator** (Level 10)
**Full system access across all organizations**

### Sidebar Pages:
1. ✅ **Dashboard** - System overview
2. ✅ **Properties** - All properties across all organizations
3. ✅ **Properties Overview** - Collection data & analytics
4. ✅ **All Spaces** - View all rentable spaces
5. ✅ **Tenants** - All tenants across organizations
6. ✅ **Rent Management** - Manage rent agreements
7. ✅ **Payments** - All payments across organizations
8. ✅ **Analytics & Reports** - Financial reports & insights
9. ✅ **User Management** - Manage team & roles (organization level)
10. ✅ **Admin Dashboard** - Admin overview & controls
11. ✅ **Organization Settings** - Settings & configuration
12. ✅ **Property Assignments** - Assign staff to properties
13. ✅ **System Dashboard** - System-wide overview
14. ✅ **Organizations** - Manage all organizations
15. ✅ **Global Users** - Manage users across all orgs
16. ✅ **Global Analytics** - Cross-organization analytics
17. ✅ **System Settings** - System-wide configuration
18. ✅ **Global Rent Records** - All rent records by organization
19. ✅ **Profile** - User profile settings

---

## 🏢 **Organization Administrator** (Level 9)
**Full access within organization**

### Sidebar Pages:
1. ✅ **Dashboard** - Organization overview
2. ✅ **Properties** - All organization properties
3. ✅ **Properties Overview** - Collection data & analytics
4. ✅ **All Spaces** - View all rentable spaces
5. ✅ **Tenants** - All organization tenants
6. ✅ **Rent Management** - Manage rent agreements
7. ✅ **Payments** - All organization payments
8. ✅ **Analytics & Reports** - Financial reports & insights
9. ✅ **User Management** - Manage team & roles
10. ✅ **Admin Dashboard** - Admin overview & controls
11. ✅ **Organization Settings** - Settings & configuration
12. ✅ **Property Assignments** - Assign staff to properties
13. ✅ **Profile** - User profile settings

### Permissions:
- ✅ Create, read, update, delete properties
- ✅ Create, read, update tenants
- ✅ Create, read payments
- ✅ Create, read, update users
- ✅ Read reports

---

## 🏠 **Property Manager** (Level 6)
**Manages assigned properties and handles on-site maintenance**

### Sidebar Pages:
1. ✅ **Dashboard** - Overview of assigned properties
2. ✅ **Properties** - Assigned properties only
3. ✅ **Properties Overview** - Collection data & analytics (assigned properties)
4. ✅ **All Spaces** - View rentable spaces (assigned properties)
5. ✅ **Tenants** - Tenants for assigned properties
6. ✅ **Rent Management** - Manage rent agreements (assigned properties)
7. ✅ **Payments** - Payments for assigned properties
8. ✅ **Profile** - User profile settings

### Permissions:
- ✅ Create properties
- ✅ Read, update assigned properties
- ✅ Create, read, update tenants (assigned properties)
- ✅ Create, read payments (assigned properties)
- ✅ Read reports (assigned properties)
- ✅ Create, update maintenance requests

---

## 📊 **Financial Viewer** (Level 4)
**Access to financial data and basic property information**

### Sidebar Pages:
1. ✅ **Dashboard** - Financial overview
2. ✅ **Properties** - View all organization properties (read-only)
3. ✅ **Properties Overview** - Collection data & analytics
4. ✅ **Payments** - View all organization payments
5. ✅ **Analytics & Reports** - Financial reports & insights
6. ✅ **Profile** - User profile settings

### Permissions:
- ✅ Read properties (organization level, read-only)
- ✅ Read payments (organization level)
- ✅ Read reports (organization level)

---

## 📝 **Notes:**

### Pages NOT in Sidebar (but accessible via direct URL):
- **Create Property** (`/app/properties/new`) - Requires `properties:create:organization`
- **Property Details** (`/app/properties/:id`) - Based on property access
- **Space Assignment** (`/app/properties/:id/spaces`) - Based on property access

### Access Control:
- All pages are protected by `RoleGuard` components
- Super Admins bypass all permission checks
- Each page checks for appropriate permissions before rendering
- Pages show error messages if user lacks required permissions

---

## 🔧 **How to Add New Pages:**

1. **Add the route** in `App.jsx`
2. **Add sidebar item** in `Sidebar.jsx` with appropriate permission checks
3. **Protect the route** with `RoleGuard` if needed
4. **Update this document** with the new page

---

## ✅ **Current Status:**
- ✅ All role-based pages are visible in sidebar
- ✅ All routes are properly protected
- ✅ Permission checks are working correctly
- ✅ Super Admin bypass is implemented

