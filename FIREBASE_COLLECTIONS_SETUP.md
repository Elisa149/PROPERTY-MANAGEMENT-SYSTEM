# 🔥 Firebase Collections Setup Guide

## 📊 Database Structure for Property Management System

### **Required Collections:**

1. **`users`** - User profile data
2. **`properties`** - Property information
3. **`rent`** - Rent agreements and tenant info
4. **`payments`** - Payment records and history

## 🚀 **Auto-Setup Method (Recommended)**

The easiest way is to let the system create collections automatically:

1. **Go to your app**: http://localhost:3000
2. **Create your first property** using the "Add Property" button
3. **Firestore will auto-create collections** when you save data
4. **Indexes will be created** when you trigger complex queries

## 🛠️ **Manual Setup (Alternative)**

### **Step 1: Create Collections in Firebase Console**

1. **Go to**: [Firebase Console](https://console.firebase.google.com)
2. **Select**: `fam-rent-sys` project
3. **Go to**: Firestore Database
4. **Click**: "Start collection"

**Create these collections with sample documents:**

#### **Collection: `users`**
```json
{
  "uid": "sample-user-id",
  "email": "user@example.com", 
  "displayName": "John Doe",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### **Collection: `properties`**
```json
{
  "id": "property-1",
  "userId": "sample-user-id",
  "name": "Sample Property",
  "address": "123 Main St, City, State",
  "type": "apartment",
  "bedrooms": 2,
  "bathrooms": 1,
  "squareFootage": 900,
  "monthlyRent": 1500,
  "deposit": 1500,
  "status": "vacant",
  "description": "Beautiful apartment",
  "amenities": ["parking", "pool"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### **Collection: `rent`**
```json
{
  "id": "rent-1",
  "userId": "sample-user-id",
  "propertyId": "property-1",
  "tenantName": "Jane Smith",
  "tenantEmail": "jane@example.com",
  "tenantPhone": "+1-555-0123",
  "monthlyAmount": 1500,
  "leaseStart": "2024-01-01T00:00:00.000Z",
  "leaseEnd": "2024-12-31T00:00:00.000Z",
  "deposit": 1500,
  "paymentDueDate": 1,
  "status": "active",
  "notes": "Good tenant",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### **Collection: `payments`**
```json
{
  "id": "payment-1",
  "userId": "sample-user-id",
  "propertyId": "property-1", 
  "rentId": "rent-1",
  "amount": 1500,
  "paymentDate": "2024-01-01T00:00:00.000Z",
  "paymentMethod": "bank_transfer",
  "transactionId": "TXN123456",
  "notes": "On time payment",
  "lateFee": 0,
  "status": "completed",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### **Step 2: Create Required Indexes**

Go to Firestore Database → Indexes → Create Index:

#### **Properties Collection Indexes:**
```
Collection: properties
Fields: userId (Ascending), createdAt (Descending)
```

#### **Rent Collection Indexes:**
```
Collection: rent  
Fields: userId (Ascending), createdAt (Descending)
```

#### **Payments Collection Indexes:**
```
Collection: payments
Fields: userId (Ascending), paymentDate (Descending)
```

```
Collection: payments
Fields: propertyId (Ascending), paymentDate (Descending)  
```

## 🔧 **Quick Fix for Current Errors**

The error shows Firestore needs an index. **Click this direct link**:

https://console.firebase.google.com/v1/r/project/fam-rent-sys/firestore/indexes?create_composite=Ck9wcm9qZWN0cy9mYW0tcmVudC1zeXMvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3Byb3BlcnRpZXMvaW5kZXhlcy9fEAEaCgoGdXNlcklkEAEaDQoJY3JlYXRlZEF0EAIaDAoIX19uYW1lX18QAg

1. **Click "Create Index"**
2. **Wait 2-3 minutes** for index to build
3. **Refresh your app** - properties will load!

## ⚡ **Automatic Collection Creation**

**Easiest approach**: Just start using your app!

1. **Create a property** → `properties` collection auto-created
2. **Add rent agreement** → `rent` collection auto-created  
3. **Record payment** → `payments` collection auto-created
4. **Indexes created** → As needed when queries are made

Firebase will create everything automatically as you use the features! 🚀



