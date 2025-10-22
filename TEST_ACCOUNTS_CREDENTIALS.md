# 🔐 TEST ACCOUNTS - LOGIN CREDENTIALS

## 📋 **COMPLETE LIST OF TEST ACCOUNTS**

All accounts created for testing the RBAC (Role-Based Access Control) system with different permission levels.

---

## 🎖️ **1. SUPER ADMINISTRATOR**

### **Account Details:**
- **Email**: `superadmin@propertytest.com`
- **Password**: `SuperAdmin123!`
- **Role**: Super Administrator
- **Level**: 10/10

### **Access & Permissions:**
- ✅ Full system access across ALL organizations
- ✅ Create/manage all organizations
- ✅ Manage users across all organizations
- ✅ Access ALL properties (all organizations)
- ✅ View ALL financial data
- ✅ System configuration and settings
- ✅ Global reports and analytics

### **Navigation Items:**
- Dashboard
- Properties (all organizations)
- Properties Overview
- All Spaces
- All Tenants
- Rent Management
- Payments (all)
- Financial Analytics
- User Management
- Admin Dashboard
- Organization Settings
- Property Assignments
- System Admin (super admin only)
- Profile

---

## 🏢 **2. ORGANIZATION ADMINISTRATOR**

### **Account Details:**
- **Email**: `admin@propertytest.com`
- **Password**: `TestAdmin123!`
- **Role**: Organization Administrator
- **Level**: 9/10

### **Access & Permissions:**
- ✅ Full access within their organization
- ✅ Create/edit/delete organization properties
- ✅ Manage all tenants in organization
- ✅ View all organization financial data
- ✅ Invite staff and assign roles
- ✅ Access organization reports
- ✅ Configure organization settings
- ✅ Assign properties to staff

### **Navigation Items:**
- Dashboard
- Properties
- Properties Overview
- All Spaces
- All Tenants
- Rent Management
- Payments
- Financial Analytics
- User Management (approve/reject users, assign roles)
- Admin Dashboard
- Organization Settings
- Property Assignments
- Profile

---

## 🏠 **3. PROPERTY MANAGER**

### **Account Details:**
- **Email**: `manager@propertytest.com`
- **Password**: `Manager123!`
- **Role**: Property Manager
- **Level**: 6/10

### **Access & Permissions:**
- ✅ Manage assigned properties only
- ✅ Edit assigned properties (details, status, maintenance)
- ✅ Add/edit tenants for assigned properties
- ✅ Record and track payments for assigned properties
- ✅ Handle maintenance requests
- ✅ Manage space assignments
- ✅ Generate property reports
- ❌ Cannot create new properties (org admin only)
- ❌ Cannot access unassigned properties
- ❌ Cannot manage users or assign roles

### **Navigation Items:**
- Dashboard
- Properties (assigned only)
- Properties Overview (assigned only)
- All Spaces (assigned only)
- All Tenants (assigned only)
- Rent Management
- Payments (assigned properties only)
- Profile

---

## 📊 **4. FINANCIAL VIEWER**

### **Account Details:**
- **Email**: `finance@propertytest.com`
- **Password**: `Finance123!`
- **Role**: Financial Viewer
- **Level**: 4/10

### **Access & Permissions:**
- ✅ View all financial data (payments, reports)
- ✅ View basic property information
- ✅ Access financial analytics and reports
- ✅ View payment history and trends
- ✅ Export financial reports
- ❌ Cannot edit properties
- ❌ Cannot manage tenants
- ❌ Cannot record payments (view only)
- ❌ Cannot manage users

### **Navigation Items:**
- Dashboard
- Properties Overview (read-only, basic info)
- Payments (read-only)
- Financial Analytics
- Profile

---

## 🧪 **TESTING GUIDE**

### **How to Test Each Role:**

1. **🌐 Open Application**:
   ```
   http://localhost:3000/login
   ```

2. **🔐 Login with Account**:
   - Copy email from the list above
   - Copy password from the list above
   - Click "Sign In"

3. **✅ Verify Access**:
   - Check sidebar navigation items
   - Verify permissions match role description
   - Try accessing different pages
   - Test create/edit/delete actions

### **Expected Behavior:**

#### **Super Admin** (`superadmin@propertytest.com`):
- Should see ALL navigation items including "System Admin"
- Can access properties from all organizations
- Can create organizations and manage all users

#### **Org Admin** (`admin@propertytest.com`):
- Should see "User Management" in sidebar
- Can approve/reject new user access requests
- Can assign roles to users in their organization
- Can access "Admin Dashboard" and "Organization Settings"

#### **Property Manager** (`manager@propertytest.com`):
- Should see limited navigation (no admin pages)
- Can only see properties assigned to them
- Can edit assigned properties and manage tenants
- Can record payments for assigned properties

#### **Financial Viewer** (`finance@propertytest.com`):
- Should see minimal navigation
- All pages are READ-ONLY
- Cannot edit properties or record payments
- Can view financial analytics and reports

---

## 🔄 **ROLE ASSIGNMENT WORKFLOW**

### **For New Users (After Registration):**

1. **👤 New User Registers/Logs In**:
   - User creates account or logs in with Google
   - System creates basic profile with status: `pending`

2. **📋 Pending Approval Page**:
   - User sees "Account Setup Required" dialog
   - Must submit access request to organization

3. **📨 Admin Approval**:
   - Org Admin logs in (`admin@propertytest.com`)
   - Navigates to "User Management"
   - Reviews pending access requests
   - Assigns appropriate role
   - Approves or rejects request

4. **✅ User Activated**:
   - User logs out and logs back in
   - System loads role and permissions
   - User can now access system with assigned role

---

## 📊 **ROLE COMPARISON TABLE**

| Feature | Super Admin | Org Admin | Property Manager | Financial Viewer |
|---------|-------------|-----------|------------------|------------------|
| **Create Properties** | ✅ All Orgs | ✅ Own Org | ❌ | ❌ |
| **Edit Properties** | ✅ All | ✅ All | ✅ Assigned | ❌ |
| **Delete Properties** | ✅ | ✅ | ❌ | ❌ |
| **Manage Tenants** | ✅ | ✅ | ✅ Assigned | ❌ |
| **Record Payments** | ✅ | ✅ | ✅ Assigned | ❌ |
| **View Payments** | ✅ All | ✅ Org | ✅ Assigned | ✅ All |
| **Financial Reports** | ✅ All | ✅ Org | ✅ Assigned | ✅ All |
| **Manage Users** | ✅ All | ✅ Org | ❌ | ❌ |
| **Assign Roles** | ✅ | ✅ | ❌ | ❌ |
| **System Config** | ✅ | ❌ | ❌ | ❌ |
| **Multi-Org Access** | ✅ | ❌ | ❌ | ❌ |

---

## 🚨 **IMPORTANT NOTES**

### **Security:**
- ⚠️ These are **TEST ACCOUNTS ONLY** - DO NOT use in production!
- 🔒 Change all passwords before deploying to production
- 🔐 Use strong, unique passwords for production accounts
- 📝 Keep credentials secure and don't share publicly

### **Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

### **First-Time Login:**
- If account doesn't exist, you may need to create it first
- Use the registration page and then have an admin approve it
- Or create accounts directly in Firebase Authentication console

---

## 🎯 **QUICK REFERENCE**

### **Copy-Paste Credentials:**

```
Super Admin:
superadmin@propertytest.com
SuperAdmin123!

Org Admin:
admin@propertytest.com
TestAdmin123!

Property Manager:
manager@propertytest.com
Manager123!

Financial Viewer:
finance@propertytest.com
Finance123!
```

---

## 🔗 **RELATED DOCUMENTATION**

- **RBAC System Design**: `RBAC_SYSTEM_DESIGN.md`
- **Simplified RBAC Structure**: `SIMPLIFIED_RBAC_STRUCTURE.md`
- **Manual Role Assignment**: `MANUAL_ROLE_ASSIGNMENT_WORKFLOW.md`
- **RBAC Implementation Summary**: `RBAC_IMPLEMENTATION_SUMMARY.md`

---

## 🆘 **TROUBLESHOOTING**

### **Can't Login?**
1. Check if account exists in Firebase Authentication
2. Verify password is correct (case-sensitive)
3. Try password reset if needed
4. Check backend server is running (`cd backend && npm start`)
5. Check frontend server is running (`cd frontend && yarn dev`)

### **Don't See Expected Pages?**
1. Check user's role in Firebase Firestore (`users` collection)
2. Verify role has correct permissions in `roles` collection
3. Check browser console for permission errors
4. Try logout and login again to refresh permissions

### **Role Not Assigned?**
1. Login as org admin (`admin@propertytest.com`)
2. Navigate to "User Management"
3. Find pending access request
4. Assign appropriate role and approve
5. User must logout and login again

---

**✅ You now have complete access to all test accounts for comprehensive RBAC testing!**

🎉 **Happy Testing!**


