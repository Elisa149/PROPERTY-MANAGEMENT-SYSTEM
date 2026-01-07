const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Initialize Firebase Admin (same way as server.js)
if (!admin.apps.length) {
  try {
    // Try to use service account key if available
    const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
    const fs = require('fs');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      // Use environment variables (same as server.js)
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

async function checkOrganizationData(organizationId) {
  console.log(`\n🔍 Checking data for Organization ID: ${organizationId}\n`);
  console.log('='.repeat(60));

  try {
    // Check Organization document
    const orgDoc = await db.collection('organizations').doc(organizationId).get();
    if (orgDoc.exists) {
      const orgData = orgDoc.data();
      console.log('✅ Organization found:');
      console.log(`   Name: ${orgData.name || 'N/A'}`);
      console.log(`   Created: ${orgData.createdAt?.toDate() || 'N/A'}`);
      console.log(`   Status: ${orgData.status || 'N/A'}`);
    } else {
      console.log('❌ Organization document NOT FOUND');
    }

    // Check Users
    const usersSnapshot = await db.collection('users')
      .where('organizationId', '==', organizationId)
      .get();
    console.log(`\n👥 Users: ${usersSnapshot.size} found`);
    if (usersSnapshot.size > 0) {
      usersSnapshot.forEach(doc => {
        const user = doc.data();
        console.log(`   - ${user.email || doc.id} (${user.roleId || 'no role'})`);
      });
    }

    // Check Properties
    const propertiesSnapshot = await db.collection('properties')
      .where('organizationId', '==', organizationId)
      .get();
    console.log(`\n🏢 Properties: ${propertiesSnapshot.size} found`);
    if (propertiesSnapshot.size > 0) {
      propertiesSnapshot.forEach(doc => {
        const prop = doc.data();
        console.log(`   - ${prop.name || doc.id} (${prop.type || 'unknown'}) - Status: ${prop.status || 'unknown'}`);
      });
    } else {
      console.log('   ⚠️  No properties found for this organization!');
    }

    // Check Payments
    const paymentsSnapshot = await db.collection('payments')
      .where('organizationId', '==', organizationId)
      .get();
    console.log(`\n💰 Payments: ${paymentsSnapshot.size} found`);
    if (paymentsSnapshot.size > 0) {
      let totalAmount = 0;
      paymentsSnapshot.forEach(doc => {
        const payment = doc.data();
        totalAmount += (payment.amount || 0);
      });
      console.log(`   Total Amount: ${totalAmount.toLocaleString()}`);
    } else {
      console.log('   ⚠️  No payments found for this organization!');
    }

    // Check Rent Records
    const rentSnapshot = await db.collection('rent')
      .where('organizationId', '==', organizationId)
      .get();
    console.log(`\n📋 Rent Records: ${rentSnapshot.size} found`);
    if (rentSnapshot.size > 0) {
      rentSnapshot.forEach(doc => {
        const rent = doc.data();
        console.log(`   - ${rent.tenantName || 'Unknown'} - Property: ${rent.propertyId || 'N/A'}`);
      });
    } else {
      console.log('   ⚠️  No rent records found for this organization!');
      
      // Also check if rent records exist but don't have organizationId
      const allRentSnapshot = await db.collection('rent').limit(10).get();
      console.log(`\n   ℹ️  Checking if rent records exist without organizationId...`);
      let foundWithoutOrg = 0;
      allRentSnapshot.forEach(doc => {
        const rent = doc.data();
        if (!rent.organizationId) {
          foundWithoutOrg++;
          console.log(`   - Found rent record ${doc.id} without organizationId (propertyId: ${rent.propertyId})`);
        }
      });
      if (foundWithoutOrg === 0) {
        console.log('   No rent records found without organizationId in sample');
      }
    }

    // Check Tenants
    const tenantsSnapshot = await db.collection('tenants')
      .where('organizationId', '==', organizationId)
      .get();
    console.log(`\n👤 Tenants: ${tenantsSnapshot.size} found`);
    if (tenantsSnapshot.size > 0) {
      tenantsSnapshot.forEach(doc => {
        const tenant = doc.data();
        console.log(`   - ${tenant.name || doc.id} (${tenant.email || 'no email'})`);
      });
    }

    // Check if properties exist but have wrong organizationId
    console.log(`\n🔍 Checking for properties with incorrect organizationId...`);
    const allPropertiesSnapshot = await db.collection('properties').limit(20).get();
    let foundWithWrongOrg = 0;
    allPropertiesSnapshot.forEach(doc => {
      const prop = doc.data();
      if (prop.organizationId && prop.organizationId !== organizationId) {
        foundWithWrongOrg++;
        console.log(`   - Property "${prop.name || doc.id}" has organizationId: ${prop.organizationId}`);
      }
    });
    if (foundWithWrongOrg === 0) {
      console.log('   No properties found with different organizationId in sample');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY:');
    console.log(`   Organization: ${orgDoc.exists ? '✅ Found' : '❌ Not Found'}`);
    console.log(`   Users: ${usersSnapshot.size}`);
    console.log(`   Properties: ${propertiesSnapshot.size}`);
    console.log(`   Payments: ${paymentsSnapshot.size}`);
    console.log(`   Rent Records: ${rentSnapshot.size}`);
    console.log(`   Tenants: ${tenantsSnapshot.size}`);
    
    if (propertiesSnapshot.size === 0) {
      console.log('\n⚠️  WARNING: No properties found! Users won\'t see any data.');
      console.log('   This is likely why users see empty pages.');
    }

  } catch (error) {
    console.error('❌ Error checking organization data:', error);
  } finally {
    process.exit(0);
  }
}

// Get organization ID from command line or use default
const organizationId = process.argv[2] || 'SVRDIbZ3ir7TmWfWWyXh';
checkOrganizationData(organizationId);

