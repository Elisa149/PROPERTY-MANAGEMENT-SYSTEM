const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
    const fs = require('fs');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        })
      });
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    process.exit(1);
  }
}

const db = admin.firestore();

async function assignManagerToProperties(managerEmail, assignToAll = true) {
  console.log(`\n🔧 Assigning manager to properties\n`);
  console.log(`Manager: ${managerEmail}`);
  console.log(`Assign to all: ${assignToAll}\n`);
  
  try {
    // Find manager user
    const usersSnapshot = await db.collection('users')
      .where('email', '==', managerEmail)
      .get();
    
    if (usersSnapshot.empty) {
      console.log(`❌ Manager with email ${managerEmail} not found`);
      process.exit(1);
    }
    
    const managerDoc = usersSnapshot.docs[0];
    const managerData = managerDoc.data();
    const managerId = managerDoc.id;
    const organizationId = managerData.organizationId;
    
    console.log(`✅ Manager found:`);
    console.log(`   ID: ${managerId}`);
    console.log(`   Organization ID: ${organizationId}\n`);
    
    // Get all properties in organization
    const propertiesSnapshot = await db.collection('properties')
      .where('organizationId', '==', organizationId)
      .get();
    
    console.log(`📋 Found ${propertiesSnapshot.size} properties in organization\n`);
    
    if (propertiesSnapshot.size === 0) {
      console.log('⚠️  No properties found to assign');
      process.exit(0);
    }
    
    // Update properties
    const batch = db.batch();
    let updateCount = 0;
    
    propertiesSnapshot.forEach(doc => {
      const property = doc.data();
      const propertyRef = db.collection('properties').doc(doc.id);
      
      // Check if already assigned
      const isAlreadyManager = property.assignedManagers?.includes(managerId) || false;
      
      if (!isAlreadyManager) {
        // Add manager to assignedManagers array
        const currentManagers = property.assignedManagers || [];
        const updatedManagers = [...currentManagers, managerId];
        
        batch.update(propertyRef, {
          assignedManagers: updatedManagers,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        updateCount++;
        console.log(`✅ Will assign to: ${property.name || doc.id}`);
      } else {
        console.log(`⏭️  Already assigned: ${property.name || doc.id}`);
      }
    });
    
    if (updateCount === 0) {
      console.log('\n✅ Manager is already assigned to all properties!');
      process.exit(0);
    }
    
    console.log(`\n💾 Committing ${updateCount} updates...`);
    await batch.commit();
    
    console.log(`\n✅ Successfully assigned manager to ${updateCount} properties!`);
    console.log(`   Manager can now see all properties and their data in the dashboard.`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

const managerEmail = process.argv[2] || 'manager@propertytest.com';
const assignToAll = process.argv[3] !== '--selected';
assignManagerToProperties(managerEmail, assignToAll);

