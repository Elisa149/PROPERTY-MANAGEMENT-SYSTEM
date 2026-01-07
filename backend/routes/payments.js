const express = require('express');
const admin = require('firebase-admin');
const { verifyToken } = require('../middleware/auth');
const { 
  verifyTokenWithRBAC, 
  requirePermission,
  requireAnyPermission,
  requireOrganization,
  filterPropertiesByAccess 
} = require('../middleware/rbac');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Validation schema
const paymentSchema = Joi.object({
  propertyId: Joi.string().required(),
  rentId: Joi.string().required(),
  invoiceId: Joi.string().allow(''), // Optional - link payment to invoice
  amount: Joi.number().min(0).required(),
  paymentDate: Joi.date().required(),
  paymentMethod: Joi.string().valid('cash', 'check', 'bank_transfer', 'online', 'credit_card', 'other').required(),
  transactionId: Joi.string().allow(''),
  notes: Joi.string().max(500).allow(''),
  lateFee: Joi.number().min(0).default(0),
  status: Joi.string().valid('completed', 'pending', 'failed', 'refunded').default('completed'),
});

// GET /api/payments - Get all payments for user
router.get('/', verifyTokenWithRBAC, requireOrganization, requireAnyPermission(['payments:read:organization', 'payments:read:assigned']), async (req, res) => {
  try {
    const userId = req.user.uid;
    const organizationId = req.user.organizationId;
    const permissions = req.user.permissions;
    const { propertyId, rentId, startDate, endDate, status } = req.query;
    const db = admin.firestore();
    
    // Get user's accessible properties based on RBAC permissions
    const propertiesSnapshot = await filterPropertiesByAccess(userId, organizationId, permissions);
    
    const propertyIds = [];
    const propertiesMap = {};
    
    const processSnapshot = (snapshot) => {
      if (snapshot.forEach) {
        snapshot.forEach(doc => {
          propertyIds.push(doc.id);
          propertiesMap[doc.id] = doc.data();
        });
      } else if (snapshot.docs) {
        snapshot.docs.forEach(doc => {
          propertyIds.push(doc.id);
          propertiesMap[doc.id] = doc.data();
        });
      }
    };
    
    processSnapshot(propertiesSnapshot);
    
    if (propertyIds.length === 0) {
      return res.json({ payments: [], totalAmount: 0, totalPayments: 0 });
    }
    
    // Get all payments for organization
    const paymentsSnapshot = await db.collection('payments')
      .where('organizationId', '==', organizationId)
      .get();
    
    const payments = [];
    let totalAmount = 0;
    
    for (const doc of paymentsSnapshot.docs) {
      const paymentData = doc.data();
      
      // Filter by accessible properties
      if (!propertyIds.includes(paymentData.propertyId)) continue;
      
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
router.get('/dashboard/summary', verifyTokenWithRBAC, requireOrganization, requireAnyPermission(['payments:read:organization', 'payments:read:assigned']), async (req, res) => {
  try {
    const userId = req.user.uid;
    const organizationId = req.user.organizationId;
    const permissions = req.user.permissions;
    const db = admin.firestore();
    
    // Get user's accessible properties based on RBAC permissions
    const propertiesSnapshot = await filterPropertiesByAccess(userId, organizationId, permissions);
    
    const propertyIds = [];
    const propertiesMap = {};
    
    const processSnapshot = (snapshot) => {
      if (snapshot.forEach) {
        snapshot.forEach(doc => {
          propertyIds.push(doc.id);
          propertiesMap[doc.id] = doc.data();
        });
      } else if (snapshot.docs) {
        snapshot.docs.forEach(doc => {
          propertyIds.push(doc.id);
          propertiesMap[doc.id] = doc.data();
        });
      }
    };
    
    processSnapshot(propertiesSnapshot);
    
    // Calculate total spaces from properties
    let totalSpaces = 0;
    Object.values(propertiesMap).forEach(property => {
      if (property.type === 'building' && property.buildingDetails?.floors) {
        property.buildingDetails.floors.forEach(floor => {
          totalSpaces += floor.spaces?.length || 0;
        });
      } else if (property.type === 'land' && property.landDetails?.squatters) {
        totalSpaces += property.landDetails.squatters.length;
      }
    });
    
    if (propertyIds.length === 0) {
      return res.json({
        totalProperties: 0,
        totalSpaces: 0,
        thisMonth: { collected: 0, expected: 0, payments: 0, collectionRate: 0 },
        lastMonth: { collected: 0, expected: 0, payments: 0, collectionRate: 0 },
        recentPayments: []
      });
    }
    
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    // Get all payments for accessible properties
    const allPayments = await db.collection('payments')
      .where('organizationId', '==', organizationId)
      .get();
    
    // Filter payments by accessible properties
    const allPaymentsData = [];
    allPayments.forEach(doc => {
      const payment = doc.data();
      if (propertyIds.includes(payment.propertyId)) {
        const paymentDate = payment.paymentDate?.toDate();
        allPaymentsData.push({
          ...payment,
          paymentDate,
          id: doc.id,
        });
      }
    });
    
    // Sort all payments by date for recent payments
    allPaymentsData.sort((a, b) => {
      const dateA = new Date(a.paymentDate || 0);
      const dateB = new Date(b.paymentDate || 0);
      return dateB - dateA;
    });
    
    // Calculate month summaries
    let thisMonthCollected = 0;
    let thisMonthCount = 0;
    let lastMonthCollected = 0;
    let lastMonthCount = 0;
    
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
    
    // Calculate expected monthly rent from properties
    let expectedMonthlyRent = 0;
    Object.values(propertiesMap).forEach(property => {
      if (property.type === 'building' && property.buildingDetails?.floors) {
        property.buildingDetails.floors.forEach(floor => {
          floor.spaces?.forEach(space => {
            if (space.status === 'occupied') {
              expectedMonthlyRent += space.monthlyRent || 0;
            }
          });
        });
      } else if (property.type === 'land' && property.landDetails?.squatters) {
        property.landDetails.squatters.forEach(squatter => {
          if (squatter.status === 'active') {
            expectedMonthlyRent += squatter.monthlyPayment || 0;
          }
        });
      }
    });
    
    res.json({
      totalProperties: propertyIds.length,
      totalSpaces,
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
router.get('/:id', verifyTokenWithRBAC, requireOrganization, requireAnyPermission(['payments:read:organization', 'payments:read:assigned']), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const paymentId = req.params.id;
    const db = admin.firestore();
    
    const paymentDoc = await db.collection('payments').doc(paymentId).get();
    
    if (!paymentDoc.exists) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    const paymentData = paymentDoc.data();
    
    // Verify payment belongs to user's organization
    if (paymentData.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get property info
    const propertyDoc = await db.collection('properties').doc(paymentData.propertyId).get();
    
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
        propertyName: propertyDoc.exists ? propertyDoc.data().name : 'Unknown Property',
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
router.post('/', verifyTokenWithRBAC, requireOrganization, requireAnyPermission(['payments:create:organization', 'payments:create:assigned']), async (req, res) => {
  try {
    const { error, value } = paymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const userId = req.user.uid;
    const organizationId = req.user.organizationId;
    const db = admin.firestore();
    
    // Verify property exists and belongs to the organization
    const propertyDoc = await db.collection('properties').doc(value.propertyId).get();
    if (!propertyDoc.exists) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    const propertyData = propertyDoc.data();
    if (propertyData.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Property not in your organization' });
    }
    
    // Verify rent record exists and belongs to the property
    const rentDoc = await db.collection('rent').doc(value.rentId).get();
    if (!rentDoc.exists || rentDoc.data().propertyId !== value.propertyId) {
      return res.status(400).json({ error: 'Invalid rent record for this property' });
    }
    
    // Verify invoice exists if invoiceId is provided
    if (value.invoiceId) {
      const invoiceDoc = await db.collection('invoices').doc(value.invoiceId).get();
      if (!invoiceDoc.exists) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      const invoiceData = invoiceDoc.data();
      if (invoiceData.organizationId !== organizationId) {
        return res.status(403).json({ error: 'Invoice not in your organization' });
      }
      if (invoiceData.rentId !== value.rentId) {
        return res.status(400).json({ error: 'Invoice does not match rent record' });
      }
    }
    
    const paymentId = uuidv4();
    const paymentData = {
      ...value,
      id: paymentId,
      organizationId,
      createdBy: userId,
      invoiceId: value.invoiceId || '',
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
router.put('/:id', verifyTokenWithRBAC, requireOrganization, requireAnyPermission(['payments:update:organization', 'payments:update:assigned']), async (req, res) => {
  try {
    const { error, value } = paymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const userId = req.user.uid;
    const organizationId = req.user.organizationId;
    const paymentId = req.params.id;
    const db = admin.firestore();
    
    // Verify payment exists and belongs to user's organization
    const paymentDoc = await db.collection('payments').doc(paymentId).get();
    if (!paymentDoc.exists) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    const existingPayment = paymentDoc.data();
    if (existingPayment.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Verify property belongs to organization
    const propertyDoc = await db.collection('properties').doc(value.propertyId).get();
    if (!propertyDoc.exists || propertyDoc.data().organizationId !== organizationId) {
      return res.status(403).json({ error: 'Property not in your organization' });
    }
    
    const updateData = {
      ...value,
      paymentDate: admin.firestore.Timestamp.fromDate(new Date(value.paymentDate)),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: userId,
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
router.delete('/:id', verifyTokenWithRBAC, requireOrganization, requireAnyPermission(['payments:delete:organization', 'payments:delete:assigned']), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const paymentId = req.params.id;
    const db = admin.firestore();
    
    const paymentDoc = await db.collection('payments').doc(paymentId).get();
    if (!paymentDoc.exists) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    const paymentData = paymentDoc.data();
    
    // Verify payment belongs to user's organization
    if (paymentData.organizationId !== organizationId) {
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
