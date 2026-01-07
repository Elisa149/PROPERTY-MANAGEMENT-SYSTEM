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

async function fixRentRecordsOrganizationId(organizationId) {
  console.log(`\n🔧 Fixing rent records for Organization ID: ${organizationId}\n`);
  
  try {
    // Get all properties for this organization
    const propertiesSnapshot = await db.collection('properties')
      .where('organizationId', '==', organizationId)
      .get();
    
    const propertyIds = [];
    const propertyMap = {};
    propertiesSnapshot.forEach(doc => {
      propertyIds.push(doc.id);
      propertyMap[doc.id] = doc.data();
    });
    
    console.log(`📋 Found ${propertyIds.length} properties for organization\n`);
    
    // Get all rent records for these properties
    const rentRecordsToFix = [];
    for (let i = 0; i < propertyIds.length; i += 10) {
      const batch = propertyIds.slice(i, i + 10);
      const rentSnapshot = await db.collection('rent')
        .where('propertyId', 'in', batch)
        .get();
      
      rentSnapshot.forEach(doc => {
        const rent = doc.data();
        // Check if organizationId is missing or wrong
        if (!rent.organizationId || rent.organizationId !== organizationId) {
          rentRecordsToFix.push({
            id: doc.id,
            propertyId: rent.propertyId,
            currentOrgId: rent.organizationId,
            tenantName: rent.tenantName,
          });
        }
      });
    }
    
    console.log(`📋 Found ${rentRecordsToFix.length} rent records that need fixing\n`);
    
    if (rentRecordsToFix.length === 0) {
      console.log('✅ All rent records already have the correct organizationId!');
      process.exit(0);
    }
    
    // Update rent records
    const batch = db.batch();
    let updateCount = 0;
    
    for (const rent of rentRecordsToFix) {
      const rentRef = db.collection('rent').doc(rent.id);
      batch.update(rentRef, {
        organizationId: organizationId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      updateCount++;
      console.log(`✅ Will update: ${rent.tenantName || rent.id} (propertyId: ${rent.propertyId})`);
    }
    
    console.log(`\n💾 Committing ${updateCount} updates...`);
    await batch.commit();
    
    console.log(`\n✅ Successfully updated ${updateCount} rent records!`);
    console.log(`   All rent records now have organizationId: ${organizationId}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

const organizationId = process.argv[2] || 'SVRDIbZ3ir7TmWfWWyXh';
const dryRun = process.argv[3] === '--dry-run';

if (dryRun) {
  console.log('🔍 DRY RUN MODE - No changes will be made\n');
}

fixRentRecordsOrganizationId(organizationId);

