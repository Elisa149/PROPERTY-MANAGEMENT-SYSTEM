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

async function checkRentRecordsOrganizationId(organizationId) {
  console.log(`\n🔍 Checking rent records for Organization ID: ${organizationId}\n`);
  
  try {
    // Get all properties for this organization
    const propertiesSnapshot = await db.collection('properties')
      .where('organizationId', '==', organizationId)
      .get();
    
    const propertyIds = [];
    propertiesSnapshot.forEach(doc => {
      propertyIds.push(doc.id);
    });
    
    console.log(`📋 Found ${propertyIds.length} properties for organization`);
    console.log(`   Property IDs: ${propertyIds.join(', ')}\n`);
    
    // Get all rent records for these properties
    const rentRecords = [];
    for (let i = 0; i < propertyIds.length; i += 10) {
      const batch = propertyIds.slice(i, i + 10);
      const rentSnapshot = await db.collection('rent')
        .where('propertyId', 'in', batch)
        .get();
      
      rentSnapshot.forEach(doc => {
        const rent = doc.data();
        rentRecords.push({
          id: doc.id,
          propertyId: rent.propertyId,
          organizationId: rent.organizationId,
          tenantName: rent.tenantName,
        });
      });
    }
    
    console.log(`📋 Found ${rentRecords.length} rent records for these properties\n`);
    
    // Check which ones have organizationId
    let withOrgId = 0;
    let withoutOrgId = 0;
    
    rentRecords.forEach(rent => {
      if (rent.organizationId === organizationId) {
        withOrgId++;
        console.log(`✅ ${rent.tenantName || rent.id} - Has correct organizationId`);
      } else if (!rent.organizationId) {
        withoutOrgId++;
        console.log(`⚠️  ${rent.tenantName || rent.id} - MISSING organizationId (propertyId: ${rent.propertyId})`);
      } else {
        withoutOrgId++;
        console.log(`❌ ${rent.tenantName || rent.id} - Has WRONG organizationId: ${rent.organizationId}`);
      }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total rent records: ${rentRecords.length}`);
    console.log(`   With correct organizationId: ${withOrgId}`);
    console.log(`   Missing/Wrong organizationId: ${withoutOrgId}`);
    
    if (withoutOrgId > 0) {
      console.log(`\n⚠️  WARNING: ${withoutOrgId} rent records are missing or have incorrect organizationId!`);
      console.log(`   These records won't be visible when querying by organizationId.`);
      console.log(`   They need to be updated to include organizationId: ${organizationId}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

const organizationId = process.argv[2] || 'SVRDIbZ3ir7TmWfWWyXh';
checkRentRecordsOrganizationId(organizationId);

