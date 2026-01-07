# 📝 Update Role Display Names

## Issue
Your roles in the database are showing technical names (like `org_admin`, `property_manager`) instead of user-friendly names (like "Organization Administrator", "Property Manager").

## Solution
Run the provided script to add `displayName` to all existing roles in Firestore.

---

## 🚀 How to Fix:

### **Step 1: Run the Update Script**

Open a terminal in the `backend` folder and run:

```bash
cd backend
node scripts/update-role-display-names.js
```

### **Expected Output:**
```
🔍 Fetching all roles from Firestore...
📋 Found 4 roles to update

🔄 Updating role "org_admin" → displayName: "Organization Administrator"
🔄 Updating role "property_manager" → displayName: "Property Manager"
🔄 Updating role "financial_viewer" → displayName: "Financial Viewer"

💾 Committing 3 updates to Firestore...
✅ All roles updated successfully!

📊 Summary:
   Total roles: 4
   Updated: 3
   Already had displayName: 1

🎉 Role display names update complete!
```

---

## 📋 What the Script Does:

1. ✅ Connects to your Firestore database
2. ✅ Fetches all roles
3. ✅ Checks which roles are missing `displayName`
4. ✅ Adds friendly display names:
   - `super_admin` → "Super Administrator"
   - `org_admin` → "Organization Administrator"
   - `property_manager` → "Property Manager"
   - `financial_viewer` → "Financial Viewer"
   - `caretaker` → "Caretaker"
5. ✅ Saves updates to Firestore
6. ✅ Skips roles that already have displayName

---

## 🔄 After Running the Script:

### **Refresh Your Browser:**
Once the script completes, refresh the User Management page:

```
http://localhost:3001/app/user-management
```

### **You Should Now See:**

**Before:**
```
User                    Role
────────────────────────────────
Test Admin             org_admin              ❌
John Manager           property_manager       ❌
Jane Viewer            financial_viewer       ❌
```

**After:**
```
User                    Role
────────────────────────────────────────
Test Admin             Organization Administrator  ✅
John Manager           Property Manager           ✅
Jane Viewer            Financial Viewer           ✅
```

---

## 🎯 Verify in Edit Role Dialog:

1. Click Edit button on any user
2. **Current Role** should show: "Organization Administrator"
3. **Select New Role** dropdown should show:
   - Super Administrator
   - Organization Administrator
   - Property Manager
   - Financial Viewer

All with friendly names! ✅

---

## 🛡️ Safe to Run:

- ✅ Only adds `displayName` field
- ✅ Doesn't modify existing data
- ✅ Uses Firestore batch operations
- ✅ Can be run multiple times safely
- ✅ Skips roles that already have displayName

---

## 🐛 Troubleshooting:

### **Script fails to connect:**
- Ensure `fam-rent-sys-firebase-adminsdk-fbsvc-074bdb4833.json` exists in backend folder
- Check Firebase credentials are valid

### **No roles found:**
- Verify roles exist in Firestore console
- Check collection name is "roles"

### **Still seeing technical names:**
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
- Clear browser cache
- Check browser console for errors

---

## ✅ Expected Result:

After running this script and refreshing:
- ✅ All users show friendly role names
- ✅ Edit Role dialog shows "Organization Administrator" not "org_admin"
- ✅ Role dropdown has user-friendly names
- ✅ Professional appearance throughout the UI

---

## 📁 Files:

- **Script:** `backend/scripts/update-role-display-names.js`
- **Instructions:** `UPDATE_ROLES_INSTRUCTIONS.md` (this file)

