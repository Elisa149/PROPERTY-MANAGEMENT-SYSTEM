const express = require('express');
const admin = require('firebase-admin');
const { verifyToken } = require('../middleware/auth');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Validation schema
const paymentSchema = Joi.object({
  propertyId: Joi.string().required(),
  rentId: Joi.string().required(),
  amount: Joi.number().min(0).required(),
  paymentDate: Joi.date().required(),
  paymentMethod: Joi.string().valid('cash', 'check', 'bank_transfer', 'online', 'credit_card', 'other').required(),
  transactionId: Joi.string().allow(''),
  notes: Joi.string().max(500).allow(''),
  lateFee: Joi.number().min(0).default(0),
  status: Joi.string().valid('completed', 'pending', 'failed', 'refunded').default('completed'),
});

// GET /api/payments - Get all payments for user
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { propertyId, rentId, startDate, endDate, status } = req.query;
    const db = admin.firestore();
    
    // Get user's properties first
    const propertiesSnapshot = await db.collection('properties')
      .where('userId', '==', userId)
      .get();
    
    const propertyIds = [];
    const propertiesMap = {};
    propertiesSnapshot.forEach(doc => {
      propertyIds.push(doc.id);
      propertiesMap[doc.id] = doc.data();
    });
    
    if (propertyIds.length === 0) {
      return res.json({ payments: [], totalAmount: 0, totalPayments: 0 });
    }
    
    // Simple query to avoid index requirements initially
    const paymentsSnapshot = await db.collection('payments')
      .where('propertyId', 'in', propertyIds)
      .get();
    
    const payments = [];
    let totalAmount = 0;
    
    for (const doc of paymentsSnapshot.docs) {
      const paymentData = doc.data();
      
      // Apply filters
      if (propertyId && paymentData.propertyId !== propertyId) continue;
      if (rentId && paymentData.rentId !== rentId) continue;
      if (status && paymentData.status !== status) continue;
      
      // Filter by date if specified
      const paymentDate = paymentData.paymentDate?.toDate();
      if (startDate && paymentDate < new Date(startDate)) continue;
      if (endDate && paymentDate > new Date(endDate)) continue;
      
      // Get rent record info
      let tenantName = 'Unknown Tenant';
      if (paymentData.rentId) {
        try {
          const rentDoc = await db.collection('rent').doc(paymentData.rentId).get();
          if (rentDoc.exists) {
            tenantName = rentDoc.data().tenantName;
          }
        } catch (error) {
          console.log('Error fetching rent info:', error);
        }
      }
      
      const payment = {
        id: doc.id,
        ...paymentData,
        propertyName: propertiesMap[paymentData.propertyId]?.name || 'Unknown Property',
        tenantName,
        paymentDate: paymentDate,
        createdAt: paymentData.createdAt?.toDate(),
        updatedAt: paymentData.updatedAt?.toDate(),
      };
      
      payments.push(payment);
      totalAmount += paymentData.amount + (paymentData.lateFee || 0);
    }
    
    // Sort by payment date descending
    payments.sort((a, b) => {
      const dateA = new Date(a.paymentDate || 0);
      const dateB = new Date(b.paymentDate || 0);
      return dateB - dateA;
    });
    
    res.json({ 
      payments, 
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalPayments: payments.length 
    });
  } catch (error) {
    console.error('Fetch payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// GET /api/payments/dashboard/summary - Get payment summary for dashboard
router.get('/dashboard/summary', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const db = admin.firestore();
    
    // Get user's properties
    const propertiesSnapshot = await db.collection('properties')
      .where('userId', '==', userId)
      .get();
    
    const propertyIds = [];
    propertiesSnapshot.forEach(doc => {
      propertyIds.push(doc.id);
    });
    
    if (propertyIds.length === 0) {
      return res.json({
        totalProperties: 0,
        thisMonth: { collected: 0, expected: 0, payments: 0, collectionRate: 0 },
        lastMonth: { collected: 0, expected: 0, payments: 0, collectionRate: 0 },
        recentPayments: []
      });
    }
    
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    // Get all payments for user's properties (avoid complex indexes)
    const allPayments = await db.collection('payments')
      .where('propertyId', 'in', propertyIds)
      .get();
    
    // Process all payments and calculate summaries
    let thisMonthCollected = 0;
    let thisMonthCount = 0;
    let lastMonthCollected = 0;
    let lastMonthCount = 0;
    
    const allPaymentsData = [];
    allPayments.forEach(doc => {
      const payment = doc.data();
      const paymentDate = payment.paymentDate?.toDate();
      allPaymentsData.push({
        ...payment,
        paymentDate,
        id: doc.id,
      });
    });
    
    // Sort all payments by date for recent payments
    allPaymentsData.sort((a, b) => {
      const dateA = new Date(a.paymentDate || 0);
      const dateB = new Date(b.paymentDate || 0);
      return dateB - dateA;
    });
    
    // Calculate month summaries
    allPaymentsData.forEach(payment => {
      const paymentDate = payment.paymentDate;
      const amount = payment.amount + (payment.lateFee || 0);
      
      if (paymentDate >= thisMonthStart) {
        thisMonthCollected += amount;
        thisMonthCount++;
      }
      
      if (paymentDate >= lastMonthStart && paymentDate <= lastMonthEnd) {
        lastMonthCollected += amount;
        lastMonthCount++;
      }
    });
    
    // Get recent payments with property names (top 5)
    const recentPayments = [];
    for (const payment of allPaymentsData.slice(0, 5)) {
      try {
        const propertyDoc = await db.collection('properties').doc(payment.propertyId).get();
        const rentDoc = payment.rentId ? await db.collection('rent').doc(payment.rentId).get() : null;
        
        recentPayments.push({
          id: payment.id,
          amount: payment.amount,
          paymentDate: payment.paymentDate,
          propertyName: propertyDoc.exists ? propertyDoc.data().name : 'Unknown Property',
          tenantName: rentDoc?.exists ? rentDoc.data().tenantName : 'Unknown Tenant',
          paymentMethod: payment.paymentMethod,
        });
      } catch (error) {
        console.log('Error fetching payment details:', error);
      }
    }
    
    // Get expected rent (active rent records) - simplified query
    const allRentSnapshot = await db.collection('rent')
      .where('propertyId', 'in', propertyIds)
      .get();
    
    let expectedMonthlyRent = 0;
    allRentSnapshot.forEach(doc => {
      const rentData = doc.data();
      // Only count active rent records
      if (rentData.status === 'active') {
        expectedMonthlyRent += rentData.monthlyRent || rentData.monthlyAmount || 0;
      }
    });
    
    res.json({
      totalProperties: propertyIds.length,
      thisMonth: {
        collected: Math.round(thisMonthCollected * 100) / 100,
        expected: expectedMonthlyRent,
        payments: thisMonthCount,
        collectionRate: expectedMonthlyRent > 0 ? Math.round((thisMonthCollected / expectedMonthlyRent) * 100) : 0
      },
      lastMonth: {
        collected: Math.round(lastMonthCollected * 100) / 100,
        expected: expectedMonthlyRent,
        payments: lastMonthCount,
        collectionRate: expectedMonthlyRent > 0 ? Math.round((lastMonthCollected / expectedMonthlyRent) * 100) : 0
      },
      recentPayments
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Failed to get dashboard summary' });
  }
});

// GET /api/payments/:id - Get specific payment
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const paymentId = req.params.id;
    const db = admin.firestore();
    
    const paymentDoc = await db.collection('payments').doc(paymentId).get();
    
    if (!paymentDoc.exists) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    const paymentData = paymentDoc.data();
    
    // Verify ownership through property
    const propertyDoc = await db.collection('properties').doc(paymentData.propertyId).get();
    if (!propertyDoc.exists || propertyDoc.data().userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get additional info
    let rentInfo = null;
    if (paymentData.rentId) {
      const rentDoc = await db.collection('rent').doc(paymentData.rentId).get();
      if (rentDoc.exists) {
        rentInfo = rentDoc.data();
      }
    }
    
    res.json({
      payment: {
        id: paymentId,
        ...paymentData,
        propertyName: propertyDoc.data().name,
        tenantName: rentInfo?.tenantName || 'Unknown Tenant',
        paymentDate: paymentData.paymentDate?.toDate(),
        createdAt: paymentData.createdAt?.toDate(),
        updatedAt: paymentData.updatedAt?.toDate(),
      }
    });
  } catch (error) {
    console.error('Fetch payment error:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// POST /api/payments - Create new payment
router.post('/', verifyToken, async (req, res) => {
  try {
    const { error, value } = paymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const userId = req.user.uid;
    const db = admin.firestore();
    
    // Verify property ownership
    const propertyDoc = await db.collection('properties').doc(value.propertyId).get();
    if (!propertyDoc.exists || propertyDoc.data().userId !== userId) {
      return res.status(403).json({ error: 'Property not found or access denied' });
    }
    
    // Verify rent record exists and belongs to the property
    const rentDoc = await db.collection('rent').doc(value.rentId).get();
    if (!rentDoc.exists || rentDoc.data().propertyId !== value.propertyId) {
      return res.status(400).json({ error: 'Invalid rent record for this property' });
    }
    
    const paymentId = uuidv4();
    const paymentData = {
      ...value,
      id: paymentId,
      userId,
      paymentDate: admin.firestore.Timestamp.fromDate(new Date(value.paymentDate)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    await db.collection('payments').doc(paymentId).set(paymentData);
    
    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      payment: { id: paymentId, ...paymentData }
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// PUT /api/payments/:id - Update payment
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { error, value } = paymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const userId = req.user.uid;
    const paymentId = req.params.id;
    const db = admin.firestore();
    
    // Verify payment exists and user owns the property
    const paymentDoc = await db.collection('payments').doc(paymentId).get();
    if (!paymentDoc.exists) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    const propertyDoc = await db.collection('properties').doc(value.propertyId).get();
    if (!propertyDoc.exists || propertyDoc.data().userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updateData = {
      ...value,
      paymentDate: admin.firestore.Timestamp.fromDate(new Date(value.paymentDate)),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    await db.collection('payments').doc(paymentId).update(updateData);
    
    res.json({
      success: true,
      message: 'Payment updated successfully',
      payment: { id: paymentId, ...updateData }
    });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// DELETE /api/payments/:id - Delete payment
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const paymentId = req.params.id;
    const db = admin.firestore();
    
    const paymentDoc = await db.collection('payments').doc(paymentId).get();
    if (!paymentDoc.exists) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    const paymentData = paymentDoc.data();
    
    // Verify ownership
    const propertyDoc = await db.collection('properties').doc(paymentData.propertyId).get();
    if (!propertyDoc.exists || propertyDoc.data().userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await db.collection('payments').doc(paymentId).delete();
    
    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

module.exports = router;
