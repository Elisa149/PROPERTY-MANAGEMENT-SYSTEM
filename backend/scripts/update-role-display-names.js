/**
 * Script to update existing roles with displayName field
 * Run this once to add displayName to all roles in Firestore
 */

const admin = require('firebase-admin');
const serviceAccount = require('../fam-rent-sys-firebase-adminsdk-fbsvc-074bdb4833.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Role name to displayName mapping
const roleDisplayNames = {
  'super_admin': 'Super Administrator',
  'org_admin': 'Organization Administrator',
  'property_manager': 'Property Manager',
  'financial_viewer': 'Financial Viewer',
  'caretaker': 'Caretaker'
};

async function updateRoleDisplayNames() {
  try {
    console.log('🔍 Fetching all roles from Firestore...');
    
    const rolesSnapshot = await db.collection('roles').get();
    
    if (rolesSnapshot.empty) {
      console.log('⚠️  No roles found in database');
      return;
    }

    console.log(`📋 Found ${rolesSnapshot.size} roles to update\n`);

    const batch = db.batch();
    let updateCount = 0;

    rolesSnapshot.forEach((doc) => {
      const roleData = doc.data();
      const roleName = roleData.name;
      
      // Check if displayName already exists
      if (roleData.displayName) {
        console.log(`✓ Role "${roleName}" already has displayName: "${roleData.displayName}"`);
        return;
      }

      // Get displayName from mapping
      const displayName = roleDisplayNames[roleName] || 
                         roleName.split('_').map(word => 
                           word.charAt(0).toUpperCase() + word.slice(1)
                         ).join(' ');

      // Add update to batch
      batch.update(doc.ref, {
        displayName: displayName,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`🔄 Updating role "${roleName}" → displayName: "${displayName}"`);
      updateCount++;
    });

    if (updateCount > 0) {
      console.log(`\n💾 Committing ${updateCount} updates to Firestore...`);
      await batch.commit();
      console.log('✅ All roles updated successfully!');
    } else {
      console.log('\n✅ All roles already have displayName. No updates needed.');
    }

    console.log('\n📊 Summary:');
    console.log(`   Total roles: ${rolesSnapshot.size}`);
    console.log(`   Updated: ${updateCount}`);
    console.log(`   Already had displayName: ${rolesSnapshot.size - updateCount}`);

  } catch (error) {
    console.error('❌ Error updating roles:', error);
    process.exit(1);
  }
}

// Run the update
updateRoleDisplayNames()
  .then(() => {
    console.log('\n🎉 Role display names update complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

