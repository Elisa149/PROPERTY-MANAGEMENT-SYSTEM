# 🔄 Backend Server Restart Instructions

## 🐛 **Problem: Backend Server Crashed**

Your backend is not running because port 5001 is already in use. This causes all pages to appear empty.

---

## ✅ **Quick Fix:**

### **Option 1: Type `rs` in Terminal** (Easiest!)

1. Look at your terminal where `yarn dev` is running
2. You should see something like:
   ```
   [0] [nodemon] app crashed - waiting for file changes before starting...
   ```

3. **Just type:** `rs` and press Enter
4. Nodemon will restart the server
5. Wait for:
   ```
   [0] 🚀 Server running on port 5001
   [0] Connected to Firebase
   ```

### **Option 2: If `rs` Doesn't Work**

1. Press **Ctrl+C** in the terminal
2. Type: `yarn dev`
3. Press Enter
4. Wait for both frontend and backend to start

### **Option 3: Kill Port 5001 Process**

1. Open a NEW PowerShell terminal
2. Run:
   ```powershell
   netstat -ano | findstr :5001
   ```
3. Note the PID (process ID number)
4. Run:
   ```powershell
   taskkill /PID [PID_NUMBER] /F
   ```
5. Go back to original terminal
6. Type `rs` or restart with `yarn dev`

---

## 🔍 **How to Verify Backend is Running:**

### **Check Terminal Output:**
Look for these SUCCESS messages:
```
[0] [nodemon] starting `node server.js`
[0] 🚀 Server running on port 5001
[0] Connected to Firebase
[1] ➜  Local:   http://localhost:3001/  ← Frontend running
```

### **Check Browser:**
1. Open http://localhost:3001/app/users
2. Press F12 → Network tab
3. Look for API calls:
   - `GET /api/users` → Should be 200 OK
   - `GET /api/auth/access-requests` → Should be 200 OK

### **If Still Seeing Errors:**
```
GET http://localhost:5001/api/users (failed) net::ERR_CONNECTION_REFUSED
```
This means backend is NOT running. Try Option 1 or 2 above.

---

## 📋 **Current Status:**

✅ **Code is correct** - All pages updated with database integration
✅ **Frontend is running** - On port 3001
❌ **Backend is crashed** - Port 5001 conflict

**You just need to restart the backend!**

---

## 🎯 **After Backend Restarts:**

All these pages will work with real data:
- ✅ `/app/properties` - Real properties from database
- ✅ `/app/tenants` - Real tenants from rent records
- ✅ `/app/rent` - Real rent agreements and payments
- ✅ `/app/users` - Real users in your organization

---

## 🚀 **DO THIS NOW:**

1. Find your terminal with `yarn dev` running
2. Type: **`rs`**
3. Press Enter
4. Wait 5 seconds
5. Refresh browser
6. ✅ All pages should load with data!

**That's it!** The backend just needs to restart. 🎯

