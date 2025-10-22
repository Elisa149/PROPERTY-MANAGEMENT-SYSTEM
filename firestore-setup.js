/**
 * Firestore Database Setup Script
 * Run this to initialize collections and sample data
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (if not already done)
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

async function setupFirestoreCollections() {
  console.log('🔥 Setting up Firestore collections...');

  try {
    // Create sample user document
    const sampleUserId = 'sample-user-123';
    await db.collection('users').doc(sampleUserId).set({
      uid: sampleUserId,
      email: 'demo@example.com',
      displayName: 'Demo User',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ Users collection created');

    // Create sample property
    const samplePropertyId = 'sample-property-123';
    await db.collection('properties').doc(samplePropertyId).set({
      id: samplePropertyId,
      userId: sampleUserId,
      name: 'Demo Apartment',
      address: '123 Demo Street, Demo City, DC 12345',
      type: 'apartment',
      bedrooms: 2,
      bathrooms: 1,
      squareFootage: 900,
      monthlyRent: 1500,
      deposit: 1500,
      status: 'vacant',
      description: 'Beautiful demo apartment with modern amenities',
      amenities: ['parking', 'pool', 'gym'],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ Properties collection created');

    // Create sample rent record
    const sampleRentId = 'sample-rent-123';
    await db.collection('rent').doc(sampleRentId).set({
      id: sampleRentId,
      userId: sampleUserId,
      propertyId: samplePropertyId,
      tenantName: 'Jane Doe',
      tenantEmail: 'jane.doe@example.com',
      tenantPhone: '+1-555-0123',
      monthlyAmount: 1500,
      leaseStart: admin.firestore.Timestamp.fromDate(new Date('2024-01-01')),
      leaseEnd: admin.firestore.Timestamp.fromDate(new Date('2024-12-31')),
      deposit: 1500,
      paymentDueDate: 1,
      status: 'active',
      notes: 'Excellent tenant',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ Rent collection created');

    // Create sample payment records
    const payments = [
      {
        id: 'payment-1',
        userId: sampleUserId,
        propertyId: samplePropertyId,
        rentId: sampleRentId,
        amount: 1500,
        paymentDate: admin.firestore.Timestamp.fromDate(new Date('2024-01-01')),
        paymentMethod: 'bank_transfer',
        transactionId: 'TXN001',
        notes: 'January rent payment',
        lateFee: 0,
        status: 'completed',
      },
      {
        id: 'payment-2',
        userId: sampleUserId,
        propertyId: samplePropertyId,
        rentId: sampleRentId,
        amount: 1500,
        paymentDate: admin.firestore.Timestamp.fromDate(new Date('2024-02-01')),
        paymentMethod: 'online',
        transactionId: 'TXN002',
        notes: 'February rent payment',
        lateFee: 0,
        status: 'completed',
      },
    ];

    const batch = db.batch();
    payments.forEach(payment => {
      const paymentRef = db.collection('payments').doc(payment.id);
      batch.set(paymentRef, {
        ...payment,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    
    await batch.commit();
    console.log('✅ Payments collection created');

    console.log('🎉 All collections set up successfully!');
    console.log('📊 You can now view your demo data in the app');
    
  } catch (error) {
    console.error('❌ Error setting up collections:', error);
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupFirestoreCollections()
    .then(() => {
      console.log('✅ Setup complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = setupFirestoreCollections;



