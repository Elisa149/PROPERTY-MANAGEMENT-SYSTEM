/**
 * Sync Rent Records with Property Space Rent
 * 
 * This script synchronizes rent records with their corresponding property space rent amounts.
 * It finds all active rent records and updates them to match the current monthly rent
 * defined in the property's space/squatter details.
 * 
 * Usage: node sync-rent-with-property-spaces.js [organizationId]
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, '../property-management-firebase-adminsdk.json');

if (!admin.apps.length) {
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();

/**
 * Sync rent records with property space rent amounts
 */
async function syncRentRecordsWithSpaces(organizationId = null) {
  console.log('🔄 Starting rent record synchronization...\n');
  
  try {
    // Build query for rent records
    let rentQuery = db.collection('rent').where('status', '==', 'active');
    
    if (organizationId) {
      rentQuery = rentQuery.where('organizationId', '==', organizationId);
      console.log(`📋 Filtering by organization: ${organizationId}`);
    } else {
      console.log('📋 Processing all active rent records');
    }
    
    const rentSnapshot = await rentQuery.get();
    
    if (rentSnapshot.empty) {
      console.log('ℹ️ No active rent records found');
      return;
    }
    
    console.log(`📋 Found ${rentSnapshot.size} active rent record(s) to check\n`);
    
    // Track statistics
    const stats = {
      total: rentSnapshot.size,
      synced: 0,
      unchanged: 0,
      noSpaceFound: 0,
      errors: 0,
      details: []
    };
    
    // Get unique property IDs
    const propertyIds = new Set();
    rentSnapshot.forEach(doc => {
      const rentData = doc.data();
      if (rentData.propertyId) {
        propertyIds.add(rentData.propertyId);
      }
    });
    
    // Fetch all properties
    console.log(`🏢 Fetching ${propertyIds.size} propert(y/ies)...\n`);
    const propertiesMap = {};
    for (const propertyId of propertyIds) {
      const propertyDoc = await db.collection('properties').doc(propertyId).get();
      if (propertyDoc.exists) {
        propertiesMap[propertyId] = propertyDoc.data();
      }
    }
    
    // Process each rent record
    const batch = db.batch();
    let batchCount = 0;
    const MAX_BATCH_SIZE = 500; // Firestore batch limit
    
    for (const rentDoc of rentSnapshot.docs) {
      const rentData = rentDoc.data();
      const rentId = rentDoc.id;
      const { propertyId, spaceId, tenantName, monthlyRent: currentRent } = rentData;
      
      console.log(`\n📝 Checking: ${tenantName || 'Unknown'}`);
      console.log(`   Property ID: ${propertyId}`);
      console.log(`   Space ID: ${spaceId}`);
      console.log(`   Current Rent: UGX ${currentRent?.toLocaleString() || 0}`);
      
      if (!spaceId) {
        console.log('   ⚠️ No spaceId - skipping');
        stats.noSpaceFound++;
        continue;
      }
      
      const property = propertiesMap[propertyId];
      if (!property) {
        console.log('   ❌ Property not found - skipping');
        stats.errors++;
        continue;
      }
      
      // Find the space in the property
      let spaceRent = null;
      let spaceName = null;
      
      if (property.type === 'building' && property.buildingDetails?.floors) {
        for (const floor of property.buildingDetails.floors) {
          const space = floor.spaces?.find(s => s.spaceId === spaceId);
          if (space) {
            spaceRent = space.monthlyRent;
            spaceName = space.spaceName;
            break;
          }
        }
      } else if (property.type === 'land' && property.landDetails?.squatters) {
        const squatter = property.landDetails.squatters.find(s => s.squatterId === spaceId);
        if (squatter) {
          spaceRent = squatter.monthlyPayment;
          spaceName = squatter.assignedArea;
        }
      }
      
      if (spaceRent === null) {
        console.log('   ⚠️ Space not found in property - skipping');
        stats.noSpaceFound++;
        continue;
      }
      
      console.log(`   Space Name: ${spaceName}`);
      console.log(`   Space Rent: UGX ${spaceRent?.toLocaleString() || 0}`);
      
      // Check if update is needed
      if (Math.abs(spaceRent - (currentRent || 0)) < 0.01) {
        console.log('   ✓ Already in sync');
        stats.unchanged++;
      } else {
        console.log(`   🔄 UPDATE NEEDED: ${currentRent?.toLocaleString() || 0} → ${spaceRent.toLocaleString()}`);
        
        batch.update(rentDoc.ref, {
          monthlyRent: spaceRent,
          baseRent: spaceRent,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        batchCount++;
        stats.synced++;
        stats.details.push({
          tenant: tenantName,
          property: property.name,
          space: spaceName,
          oldRent: currentRent,
          newRent: spaceRent
        });
        
        // Commit batch if we reach the limit
        if (batchCount >= MAX_BATCH_SIZE) {
          console.log(`\n💾 Committing batch of ${batchCount} updates...`);
          await batch.commit();
          batchCount = 0;
        }
      }
    }
    
    // Commit remaining updates
    if (batchCount > 0) {
      console.log(`\n💾 Committing final batch of ${batchCount} updates...`);
      await batch.commit();
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SYNCHRONIZATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Records Checked:  ${stats.total}`);
    console.log(`✅ Synced (Updated):    ${stats.synced}`);
    console.log(`✓ Already in Sync:      ${stats.unchanged}`);
    console.log(`⚠️ Space Not Found:     ${stats.noSpaceFound}`);
    console.log(`❌ Errors:              ${stats.errors}`);
    console.log('='.repeat(60));
    
    if (stats.synced > 0) {
      console.log('\n📋 UPDATED RECORDS:');
      console.log('='.repeat(60));
      stats.details.forEach((detail, index) => {
        console.log(`\n${index + 1}. ${detail.tenant}`);
        console.log(`   Property: ${detail.property}`);
        console.log(`   Space: ${detail.space}`);
        console.log(`   Old Rent: UGX ${detail.oldRent?.toLocaleString() || 0}`);
        console.log(`   New Rent: UGX ${detail.newRent?.toLocaleString()}`);
      });
      console.log('='.repeat(60));
    }
    
    console.log('\n✅ Synchronization complete!\n');
    
  } catch (error) {
    console.error('\n❌ Error during synchronization:', error);
    console.error(error.stack);
    throw error;
  }
}

// Run the script
const organizationId = process.argv[2] || null;

syncRentRecordsWithSpaces(organizationId)
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });

