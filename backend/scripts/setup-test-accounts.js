/**
 * Script to set up test accounts with proper roles and organizations
 * Run this script to initialize test accounts for RBAC testing
 */

const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

const db = admin.firestore();
const auth = admin.auth();

// Test organization details
const TEST_ORG = {
  id: 'test-org-1',
  name: 'Test Property Management Organization',
  description: 'Primary test organization for RBAC testing',
  status: 'active',
  settings: {
    currency: 'UGX',
    timezone: 'Africa/Kampala',
    locale: 'en-UG',
  },
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
};

// System organization for super admin
const SYSTEM_ORG = {
  id: 'system',
  name: 'System Administration',
  description: 'System-level organization for super administrators',
  status: 'active',
  settings: {
    currency: 'UGX',
    timezone: 'Africa/Kampala',
    locale: 'en-UG',
  },
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
};

// Test accounts to set up
const TEST_ACCOUNTS = [
  {
    email: 'superadmin@propertytest.com',
    password: 'SuperAdmin123!',
    displayName: 'Super Administrator',
    roleId: 'super_admin',
    organizationId: 'system',
    status: 'active',
  },
  {
    email: 'admin@propertytest.com',
    password: 'TestAdmin123!',
    displayName: 'Test Administrator',
    roleId: 'org_admin',
    organizationId: TEST_ORG.id,
    status: 'active',
  },
  {
    email: 'manager@propertytest.com',
    password: 'Manager123!',
    displayName: 'Test Property Manager',
    roleId: 'property_manager',
    organizationId: TEST_ORG.id,
    status: 'active',
  },
  {
    email: 'finance@propertytest.com',
    password: 'Finance123!',
    displayName: 'Test Financial Viewer',
    roleId: 'financial_viewer',
    organizationId: TEST_ORG.id,
    status: 'active',
  },
];

async function setupTestAccounts() {
  console.log('🚀 Starting test account setup...\n');

  try {
    // Step 1: Create organizations
    console.log('📁 Creating organizations...');
    
    await db.collection('organizations').doc(SYSTEM_ORG.id).set(SYSTEM_ORG);
    console.log('✅ Created system organization');
    
    await db.collection('organizations').doc(TEST_ORG.id).set(TEST_ORG);
    console.log('✅ Created test organization\n');

    // Step 2: Get roles from database
    console.log('📋 Fetching roles...');
    const rolesSnapshot = await db.collection('roles').get();
    const roles = {};
    rolesSnapshot.forEach(doc => {
      roles[doc.id] = doc.data();
    });
    console.log(`✅ Found ${Object.keys(roles).length} roles\n`);

    // Step 3: Create or update user accounts
    console.log('👥 Setting up user accounts...');
    
    for (const account of TEST_ACCOUNTS) {
      try {
        // Try to get existing user
        let userRecord;
        try {
          userRecord = await auth.getUserByEmail(account.email);
          console.log(`  ℹ️  User ${account.email} already exists in Auth`);
        } catch (error) {
          if (error.code === 'auth/user-not-found') {
            // Create new user in Firebase Auth
            userRecord = await auth.createUser({
              email: account.email,
              password: account.password,
              displayName: account.displayName,
              emailVerified: true,
            });
            console.log(`  ✅ Created Auth user: ${account.email}`);
          } else {
            throw error;
          }
        }

        // Get role data
        const role = roles[account.roleId];
        if (!role) {
          console.error(`  ❌ Role ${account.roleId} not found!`);
          continue;
        }

        // Create/update user profile in Firestore
        const userProfile = {
          uid: userRecord.uid,
          email: account.email,
          displayName: account.displayName,
          organizationId: account.organizationId,
          roleId: account.roleId,
          permissions: role.permissions || [],
          status: account.status,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection('users').doc(userRecord.uid).set(userProfile, { merge: true });
        console.log(`  ✅ Updated Firestore profile: ${account.email} (${account.roleId})`);
        console.log(`     - Organization: ${account.organizationId}`);
        console.log(`     - Permissions: ${(role.permissions || []).length} permissions`);

      } catch (error) {
        console.error(`  ❌ Error setting up ${account.email}:`, error.message);
      }
    }

    console.log('\n✅ Test account setup completed!\n');
    console.log('📋 Test Accounts Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    TEST_ACCOUNTS.forEach(account => {
      console.log(`\n🔐 ${account.displayName}`);
      console.log(`   Email: ${account.email}`);
      console.log(`   Password: ${account.password}`);
      console.log(`   Role: ${account.roleId}`);
      console.log(`   Organization: ${account.organizationId}`);
    });
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🎉 You can now login with any of these accounts!\n');

  } catch (error) {
    console.error('❌ Error during setup:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the setup
setupTestAccounts();

