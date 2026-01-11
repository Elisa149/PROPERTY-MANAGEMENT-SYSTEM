/**
 * Script to update property_manager role permissions to organization scope
 * This grants all managers full access to all properties under their organization
 * Run this once to update existing property_manager roles in Firestore
 */

require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`,
  });
}

const db = admin.firestore();

// Updated property_manager permissions with organization scope
const UPDATED_PROPERTY_MANAGER_PERMISSIONS = [
  // Property management (full organization access)
  'properties:create:organization',
  'properties:read:organization',
  'properties:update:organization',
  'properties:delete:organization',
  // Tenant management
  'tenants:create:organization',
  'tenants:read:organization', 
  'tenants:update:organization',
  // Payment management
  'payments:create:organization',
  'payments:read:organization',
  // Reporting
  'reports:read:organization',
  // Maintenance (from caretaker)
  'maintenance:create:assigned',
  'maintenance:update:assigned',
];

async function updatePropertyManagerPermissions() {
  try {
    console.log('🔍 Fetching all property_manager roles from Firestore...\n');
    
    // Find all roles with name 'property_manager'
    const rolesSnapshot = await db.collection('roles')
      .where('name', '==', 'property_manager')
      .get();
    
    if (rolesSnapshot.empty) {
      console.log('⚠️  No property_manager roles found in database');
      console.log('This is normal if you haven\'t created organization-specific roles yet.');
      return;
    }

    console.log(`📋 Found ${rolesSnapshot.size} property_manager role(s) to update\n`);

    const batch = db.batch();
    let updateCount = 0;

    rolesSnapshot.forEach((doc) => {
      const roleData = doc.data();
      const oldPermissions = roleData.permissions || [];
      
      console.log(`📝 Role ID: ${doc.id}`);
      console.log(`   Organization: ${roleData.organizationId || 'N/A'}`);
      console.log(`   Current permissions: ${oldPermissions.length}`);
      console.log(`   Old permissions:`, oldPermissions);
      
      // Update the role with new permissions
      batch.update(doc.ref, {
        permissions: UPDATED_PROPERTY_MANAGER_PERMISSIONS,
        description: 'Manages all organization properties and handles on-site maintenance',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`   ✅ Will update to ${UPDATED_PROPERTY_MANAGER_PERMISSIONS.length} permissions`);
      console.log(`   New permissions:`, UPDATED_PROPERTY_MANAGER_PERMISSIONS);
      console.log('');
      updateCount++;
    });

    if (updateCount > 0) {
      console.log(`💾 Committing ${updateCount} update(s) to Firestore...`);
      await batch.commit();
      console.log('✅ All property_manager roles updated successfully!\n');
    }

    console.log('📊 Summary:');
    console.log(`   Total property_manager roles: ${rolesSnapshot.size}`);
    console.log(`   Updated: ${updateCount}`);
    console.log('');
    console.log('🎯 What changed:');
    console.log('   • Properties: :assigned → :organization scope');
    console.log('   • Tenants: :assigned → :organization scope');
    console.log('   • Payments: :assigned → :organization scope');
    console.log('   • Reports: :assigned → :organization scope');
    console.log('   • Added: properties:delete:organization permission');
    console.log('');
    console.log('💡 Impact:');
    console.log('   Property managers can now manage ALL properties in their organization,');
    console.log('   not just the ones specifically assigned to them.');

  } catch (error) {
    console.error('❌ Error updating roles:', error);
    process.exit(1);
  }
}

// Run the update
updatePropertyManagerPermissions()
  .then(() => {
    console.log('\n🎉 Property manager permissions update complete!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Restart your backend server to load the new permissions');
    console.log('   2. Existing property managers will need to log out and log back in');
    console.log('   3. They will then have full access to all organization properties');
    console.log('');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

