/**
 * Script to check payments for a specific invoice
 * Usage: node scripts/check-invoice-payments.js <invoiceNumber>
 * Example: node scripts/check-invoice-payments.js INV-20260108-0136
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error('Error initializing Firebase Admin:', error.message);
  console.error('Make sure serviceAccountKey.json exists in the backend directory');
  process.exit(1);
}

const db = admin.firestore();

async function checkInvoicePayments(invoiceNumber) {
  try {
    console.log(`\n🔍 Searching for invoice: ${invoiceNumber}\n`);

    // First, find the invoice by invoice number
    const invoicesSnapshot = await db.collection('invoices')
      .where('invoiceNumber', '==', invoiceNumber)
      .get();

    if (invoicesSnapshot.empty) {
      console.log(`❌ Invoice ${invoiceNumber} not found in database`);
      return;
    }

    invoicesSnapshot.forEach(async (invoiceDoc) => {
      const invoiceData = invoiceDoc.data();
      const invoiceId = invoiceDoc.id;

      console.log(`✅ Found invoice: ${invoiceNumber}`);
      console.log(`   Invoice ID: ${invoiceId}`);
      console.log(`   Amount: ${invoiceData.amount}`);
      console.log(`   Status: ${invoiceData.status}`);
      console.log(`   Property ID: ${invoiceData.propertyId}`);
      console.log(`   Rent ID: ${invoiceData.rentId}`);
      console.log(`\n🔍 Searching for payments linked to this invoice...\n`);

      // Search for payments with this invoice ID
      const paymentsSnapshot = await db.collection('payments')
        .where('invoiceId', '==', invoiceId)
        .get();

      if (paymentsSnapshot.empty) {
        console.log(`❌ No payments found linked to invoice ${invoiceNumber} (ID: ${invoiceId})`);
        
        // Check if there are any payments with empty invoiceId that might belong to this invoice
        console.log(`\n🔍 Checking for payments with empty invoiceId that might belong to this invoice...\n`);
        
        const allPaymentsSnapshot = await db.collection('payments')
          .where('rentId', '==', invoiceData.rentId)
          .where('propertyId', '==', invoiceData.propertyId)
          .get();

        let foundUnlinkedPayments = false;
        allPaymentsSnapshot.forEach((paymentDoc) => {
          const paymentData = paymentDoc.data();
          if (!paymentData.invoiceId || paymentData.invoiceId.trim() === '') {
            foundUnlinkedPayments = true;
            console.log(`⚠️  Found unlinked payment:`);
            console.log(`   Payment ID: ${paymentDoc.id}`);
            console.log(`   Amount: ${paymentData.amount}`);
            console.log(`   Date: ${paymentData.paymentDate?.toDate()}`);
            console.log(`   Status: ${paymentData.status}`);
            console.log(`   Invoice ID field: "${paymentData.invoiceId || '(empty)'}"`);
            console.log('');
          }
        });

        if (!foundUnlinkedPayments) {
          console.log(`✅ No unlinked payments found for this rent/property combination`);
        }
      } else {
        console.log(`✅ Found ${paymentsSnapshot.size} payment(s) linked to invoice ${invoiceNumber}:\n`);
        
        paymentsSnapshot.forEach((paymentDoc) => {
          const paymentData = paymentDoc.data();
          console.log(`   Payment ID: ${paymentDoc.id}`);
          console.log(`   Amount: ${paymentData.amount}`);
          console.log(`   Late Fee: ${paymentData.lateFee || 0}`);
          console.log(`   Total: ${paymentData.amount + (paymentData.lateFee || 0)}`);
          console.log(`   Date: ${paymentData.paymentDate?.toDate()}`);
          console.log(`   Method: ${paymentData.paymentMethod}`);
          console.log(`   Status: ${paymentData.status}`);
          console.log(`   Invoice ID: ${paymentData.invoiceId}`);
          console.log('');
        });
      }

      // Also check for payments with invoiceId matching invoice number (in case of data inconsistency)
      console.log(`\n🔍 Checking for payments with invoiceId matching invoice number...\n`);
      const paymentsByNumberSnapshot = await db.collection('payments')
        .where('invoiceId', '==', invoiceNumber)
        .get();

      if (!paymentsByNumberSnapshot.empty) {
        console.log(`⚠️  Found ${paymentsByNumberSnapshot.size} payment(s) with invoiceId = invoice number (should be invoice ID):\n`);
        paymentsByNumberSnapshot.forEach((paymentDoc) => {
          const paymentData = paymentDoc.data();
          console.log(`   Payment ID: ${paymentDoc.id}`);
          console.log(`   Invoice ID field: ${paymentData.invoiceId} (should be: ${invoiceId})`);
          console.log(`   Amount: ${paymentData.amount}`);
          console.log('');
        });
      }
    });

  } catch (error) {
    console.error('Error checking invoice payments:', error);
  } finally {
    process.exit(0);
  }
}

// Get invoice number from command line arguments
const invoiceNumber = process.argv[2];

if (!invoiceNumber) {
  console.error('Usage: node scripts/check-invoice-payments.js <invoiceNumber>');
  console.error('Example: node scripts/check-invoice-payments.js INV-20260108-0136');
  process.exit(1);
}

checkInvoicePayments(invoiceNumber);

