/**
 * Script to delete all payments without an invoice attached
 * Usage: node scripts/delete-payments-without-invoice.js [--dry-run] [--confirm]
 * 
 * --dry-run: Only show what would be deleted, don't actually delete
 * --confirm: Skip confirmation prompt (use with caution!)
 */

const admin = require('firebase-admin');
const path = require('path');
const readline = require('readline');

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

// Check command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const skipConfirmation = args.includes('--confirm');

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function deletePaymentsWithoutInvoice() {
  try {
    console.log('\n🔍 Searching for payments without invoices...\n');

    // Get all payments
    const paymentsSnapshot = await db.collection('payments').get();
    
    const paymentsWithoutInvoice = [];
    let totalPayments = 0;
    let totalAmount = 0;

    paymentsSnapshot.forEach((paymentDoc) => {
      totalPayments++;
      const paymentData = paymentDoc.data();
      const invoiceId = paymentData.invoiceId;

      // Check if invoiceId is missing, empty, or just whitespace
      if (!invoiceId || invoiceId.trim() === '' || invoiceId === null || invoiceId === undefined) {
        paymentsWithoutInvoice.push({
          id: paymentDoc.id,
          ...paymentData,
          paymentDate: paymentData.paymentDate?.toDate(),
          createdAt: paymentData.createdAt?.toDate(),
        });
        totalAmount += (paymentData.amount || 0) + (paymentData.lateFee || 0);
      }
    });

    console.log(`📊 Summary:`);
    console.log(`   Total payments in database: ${totalPayments}`);
    console.log(`   Payments without invoice: ${paymentsWithoutInvoice.length}`);
    console.log(`   Total amount to be deleted: ${totalAmount.toLocaleString()} UGX\n`);

    if (paymentsWithoutInvoice.length === 0) {
      console.log('✅ No payments without invoices found. Nothing to delete.\n');
      process.exit(0);
    }

    // Show details of payments to be deleted
    console.log('📋 Payments without invoices:\n');
    paymentsWithoutInvoice.forEach((payment, index) => {
      console.log(`${index + 1}. Payment ID: ${payment.id}`);
      console.log(`   Tenant: ${payment.tenantName || 'Unknown'}`);
      console.log(`   Property: ${payment.propertyName || 'Unknown'}`);
      console.log(`   Amount: ${payment.amount || 0} UGX`);
      console.log(`   Late Fee: ${payment.lateFee || 0} UGX`);
      console.log(`   Total: ${(payment.amount || 0) + (payment.lateFee || 0)} UGX`);
      console.log(`   Date: ${payment.paymentDate ? payment.paymentDate.toLocaleDateString() : 'Unknown'}`);
      console.log(`   Method: ${payment.paymentMethod || 'Unknown'}`);
      console.log(`   Status: ${payment.status || 'Unknown'}`);
      console.log(`   Invoice ID: "${payment.invoiceId || '(empty)'}"`);
      console.log('');
    });

    if (isDryRun) {
      console.log('🔍 DRY RUN MODE - No payments were actually deleted.\n');
      console.log('To actually delete these payments, run without --dry-run flag.\n');
      process.exit(0);
    }

    // Ask for confirmation
    if (!skipConfirmation) {
      console.log('⚠️  WARNING: This will permanently delete the above payments!');
      const answer = await askQuestion('Are you sure you want to delete these payments? (yes/no): ');
      
      if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
        console.log('\n❌ Deletion cancelled.\n');
        process.exit(0);
      }
    }

    // Delete payments
    console.log('\n🗑️  Deleting payments...\n');
    let deletedCount = 0;
    let errorCount = 0;

    for (const payment of paymentsWithoutInvoice) {
      try {
        await db.collection('payments').doc(payment.id).delete();
        deletedCount++;
        console.log(`✅ Deleted payment ${payment.id} (${payment.tenantName || 'Unknown'})`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error deleting payment ${payment.id}:`, error.message);
      }
    }

    console.log('\n📊 Deletion Summary:');
    console.log(`   Successfully deleted: ${deletedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Total amount deleted: ${totalAmount.toLocaleString()} UGX\n`);

    if (errorCount === 0) {
      console.log('✅ All payments without invoices have been deleted successfully!\n');
    } else {
      console.log('⚠️  Some payments could not be deleted. Check errors above.\n');
    }

  } catch (error) {
    console.error('❌ Error deleting payments:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
deletePaymentsWithoutInvoice();

