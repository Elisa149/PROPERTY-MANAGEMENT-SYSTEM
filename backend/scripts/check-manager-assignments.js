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

async function checkManagerAssignments(managerEmail) {
  console.log(`\n🔍 Checking property assignments for manager: ${managerEmail}\n`);
  
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
    console.log(`   Email: ${managerData.email}`);
    console.log(`   Organization ID: ${organizationId}`);
    console.log(`   Role: ${managerData.roleId}\n`);
    
    // Get all properties in organization
    const propertiesSnapshot = await db.collection('properties')
      .where('organizationId', '==', organizationId)
      .get();
    
    console.log(`📋 Total properties in organization: ${propertiesSnapshot.size}\n`);
    
    // Check which properties the manager is assigned to
    let assignedAsManager = 0;
    let assignedAsCaretaker = 0;
    let notAssigned = 0;
    const assignedProperties = [];
    const unassignedProperties = [];
    
    propertiesSnapshot.forEach(doc => {
      const property = doc.data();
      const isManager = property.assignedManagers?.includes(managerId) || false;
      const isCaretaker = property.caretakerId === managerId;
      
      if (isManager || isCaretaker) {
        assignedProperties.push({
          id: doc.id,
          name: property.name,
          type: property.type,
          isManager,
          isCaretaker,
        });
        if (isManager) assignedAsManager++;
        if (isCaretaker) assignedAsCaretaker++;
      } else {
        unassignedProperties.push({
          id: doc.id,
          name: property.name,
          type: property.type,
        });
        notAssigned++;
      }
    });
    
    console.log(`📊 Assignment Summary:`);
    console.log(`   Assigned as Manager: ${assignedAsManager}`);
    console.log(`   Assigned as Caretaker: ${assignedAsCaretaker}`);
    console.log(`   Not Assigned: ${notAssigned}\n`);
    
    if (assignedProperties.length > 0) {
      console.log(`✅ Assigned Properties (${assignedProperties.length}):`);
      assignedProperties.forEach(prop => {
        const roles = [];
        if (prop.isManager) roles.push('Manager');
        if (prop.isCaretaker) roles.push('Caretaker');
        console.log(`   - ${prop.name} (${prop.type}) - ${roles.join(', ')}`);
      });
    } else {
      console.log(`⚠️  Manager is NOT assigned to any properties!`);
      console.log(`   This is why the dashboard shows 0 for everything.\n`);
    }
    
    if (unassignedProperties.length > 0) {
      console.log(`\n❌ Unassigned Properties (${unassignedProperties.length}):`);
      unassignedProperties.forEach(prop => {
        console.log(`   - ${prop.name} (${prop.type})`);
      });
    }
    
    // Check what filterPropertiesByAccess would return
    console.log(`\n🔍 What filterPropertiesByAccess would return:`);
    if (assignedProperties.length === 0) {
      console.log(`   ⚠️  ZERO properties (manager not assigned to any)`);
      console.log(`   This means:`);
      console.log(`   - Dashboard will show 0 properties`);
      console.log(`   - Dashboard will show 0 payments`);
      console.log(`   - Dashboard will show 0 rent records`);
    } else {
      console.log(`   ✅ ${assignedProperties.length} properties`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

const managerEmail = process.argv[2] || 'manager@propertytest.com';
checkManagerAssignments(managerEmail);

