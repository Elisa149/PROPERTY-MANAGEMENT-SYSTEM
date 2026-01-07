const express = require('express');
const admin = require('firebase-admin');
const { 
  verifyTokenWithRBAC, 
  requireOrganization, 
  requireAnyPermission,
  filterPropertiesByAccess
} = require('../middleware/rbac');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Helper function to get month name
const getMonthName = (month) => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month - 1] || 'Unknown';
};

// Validation schema for invoice creation
const invoiceSchema = Joi.object({
  rentId: Joi.string().required(),
  propertyId: Joi.string().required(),
  invoiceNumber: Joi.string().allow(''), // Auto-generated if not provided
  amount: Joi.number().min(0).required(),
  dueDate: Joi.date().required(),
  issueDate: Joi.date().default(() => new Date()),
  description: Joi.string().max(1000).allow(''),
  lineItems: Joi.array().items(
    Joi.object({
      description: Joi.string().required(),
      quantity: Joi.number().min(0).default(1),
      unitPrice: Joi.number().min(0).required(),
      amount: Joi.number().min(0).required(),
    })
  ).default([]).optional(),
  status: Joi.string().valid('pending', 'paid', 'partially_paid', 'overdue', 'cancelled').default('pending'),
  notes: Joi.string().max(500).allow(''),
});

// GET /api/invoices - Get all invoices for user
router.get('/', verifyTokenWithRBAC, requireOrganization, requireAnyPermission(['payments:read:organization', 'payments:read:assigned']), async (req, res) => {
  try {
    const userId = req.user.uid;
    const organizationId = req.user.organizationId;
    const permissions = req.user.permissions;
    const { rentId, propertyId, status, startDate, endDate } = req.query;
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
      return res.json({ invoices: [], totalAmount: 0, totalInvoices: 0 });
    }
    
    // Get all invoices for organization
    const invoicesSnapshot = await db.collection('invoices')
      .where('organizationId', '==', organizationId)
      .get();
    
    const invoices = [];
    let totalAmount = 0;
    let totalPaid = 0;
    
    for (const doc of invoicesSnapshot.docs) {
      const invoiceData = doc.data();
      
      // Filter by accessible properties
      if (!propertyIds.includes(invoiceData.propertyId)) continue;
      
      // Apply filters
      if (rentId && invoiceData.rentId !== rentId) continue;
      if (propertyId && invoiceData.propertyId !== propertyId) continue;
      if (status && invoiceData.status !== status) continue;
      
      // Filter by date if specified
      const dueDate = invoiceData.dueDate?.toDate();
      if (startDate && dueDate < new Date(startDate)) continue;
      if (endDate && dueDate > new Date(endDate)) continue;
      
      // Get rent record info
      let tenantName = 'Unknown Tenant';
      let tenantEmail = '';
      let tenantPhone = '';
      if (invoiceData.rentId) {
        try {
          const rentDoc = await db.collection('rent').doc(invoiceData.rentId).get();
          if (rentDoc.exists) {
            const rentData = rentDoc.data();
            tenantName = rentData.tenantName || 'Unknown Tenant';
            tenantEmail = rentData.tenantEmail || '';
            tenantPhone = rentData.tenantPhone || '';
          }
        } catch (error) {
          console.log('Error fetching rent info:', error);
        }
      }
      
      // Calculate paid amount from linked payments
      let paidAmount = 0;
      const invoiceId = doc.id; // Use document ID, not invoiceData.id
      try {
        const paymentsSnapshot = await db.collection('payments')
          .where('invoiceId', '==', invoiceId)
          .where('status', '==', 'completed')
          .get();
        
        paymentsSnapshot.forEach(paymentDoc => {
          const paymentData = paymentDoc.data();
          paidAmount += (paymentData.amount || 0);
        });
      } catch (error) {
        console.log('Error calculating paid amount:', error);
      }
      
      // Update status based on paid amount
      let currentStatus = invoiceData.status;
      if (currentStatus !== 'cancelled') {
        if (paidAmount >= invoiceData.amount) {
          currentStatus = 'paid';
        } else if (paidAmount > 0) {
          currentStatus = 'partially_paid';
        } else {
          const now = new Date();
          if (dueDate && dueDate < now) {
            currentStatus = 'overdue';
          } else {
            currentStatus = 'pending';
          }
        }
      }
      
      const invoice = {
        id: doc.id,
        ...invoiceData,
        propertyName: propertiesMap[invoiceData.propertyId]?.name || 'Unknown Property',
        tenantName,
        tenantEmail,
        tenantPhone,
        paidAmount,
        remainingAmount: invoiceData.amount - paidAmount,
        dueDate: invoiceData.dueDate?.toDate(),
        issueDate: invoiceData.issueDate?.toDate(),
        createdAt: invoiceData.createdAt?.toDate(),
        updatedAt: invoiceData.updatedAt?.toDate(),
        status: currentStatus,
      };
      
      invoices.push(invoice);
      totalAmount += invoiceData.amount;
      totalPaid += paidAmount;
    }
    
    // Sort by due date descending
    invoices.sort((a, b) => {
      const dateA = new Date(a.dueDate || 0);
      const dateB = new Date(b.dueDate || 0);
      return dateB - dateA;
    });
    
    res.json({ 
      invoices, 
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalInvoices: invoices.length 
    });
  } catch (error) {
    console.error('Fetch invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// GET /api/invoices/:id - Get specific invoice
router.get('/:id', verifyTokenWithRBAC, requireOrganization, requireAnyPermission(['payments:read:organization', 'payments:read:assigned']), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const invoiceId = req.params.id;
    const db = admin.firestore();
    
    const invoiceDoc = await db.collection('invoices').doc(invoiceId).get();
    
    if (!invoiceDoc.exists) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const invoiceData = invoiceDoc.data();
    
    // Verify invoice belongs to user's organization
    if (invoiceData.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get property info
    const propertyDoc = await db.collection('properties').doc(invoiceData.propertyId).get();
    
    // Get rent record info
    let rentInfo = null;
    if (invoiceData.rentId) {
      const rentDoc = await db.collection('rent').doc(invoiceData.rentId).get();
      if (rentDoc.exists) {
        rentInfo = rentDoc.data();
      }
    }
    
    // Calculate paid amount from linked payments
    let paidAmount = 0;
    const paymentsSnapshot = await db.collection('payments')
      .where('invoiceId', '==', invoiceId)
      .where('status', '==', 'completed')
      .get();
    
    paymentsSnapshot.forEach(paymentDoc => {
      const paymentData = paymentDoc.data();
      paidAmount += (paymentData.amount || 0);
    });
    
    // Get all payments for this invoice
    const allPaymentsSnapshot = await db.collection('payments')
      .where('invoiceId', '==', invoiceId)
      .get();
    
    const payments = [];
    allPaymentsSnapshot.forEach(paymentDoc => {
      const paymentData = paymentDoc.data();
      payments.push({
        id: paymentDoc.id,
        ...paymentData,
        paymentDate: paymentData.paymentDate?.toDate(),
        createdAt: paymentData.createdAt?.toDate(),
      });
    });
    
    // Update status based on paid amount
    let currentStatus = invoiceData.status;
    if (currentStatus !== 'cancelled') {
      if (paidAmount >= invoiceData.amount) {
        currentStatus = 'paid';
      } else if (paidAmount > 0) {
        currentStatus = 'partially_paid';
      } else {
        const now = new Date();
        const dueDate = invoiceData.dueDate?.toDate();
        if (dueDate && dueDate < now) {
          currentStatus = 'overdue';
        } else {
          currentStatus = 'pending';
        }
      }
    }
    
    res.json({
      invoice: {
        id: invoiceId,
        ...invoiceData,
        propertyName: propertyDoc.exists ? propertyDoc.data().name : 'Unknown Property',
        tenantName: rentInfo?.tenantName || 'Unknown Tenant',
        tenantEmail: rentInfo?.tenantEmail || '',
        tenantPhone: rentInfo?.tenantPhone || '',
        paidAmount,
        remainingAmount: invoiceData.amount - paidAmount,
        dueDate: invoiceData.dueDate?.toDate(),
        issueDate: invoiceData.issueDate?.toDate(),
        createdAt: invoiceData.createdAt?.toDate(),
        updatedAt: invoiceData.updatedAt?.toDate(),
        status: currentStatus,
        payments,
      }
    });
  } catch (error) {
    console.error('Fetch invoice error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// POST /api/invoices - Create new invoice
router.post('/', verifyTokenWithRBAC, requireOrganization, requireAnyPermission(['payments:create:organization', 'payments:create:assigned']), async (req, res) => {
  try {
    const { error, value } = invoiceSchema.validate(req.body);
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
    
    // Check if invoice already exists for this rent record in the current month
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();
    
    const existingInvoicesSnapshot = await db.collection('invoices')
      .where('rentId', '==', value.rentId)
      .where('organizationId', '==', organizationId)
      .get();
    
    for (const invoiceDoc of existingInvoicesSnapshot.docs) {
      const invoiceData = invoiceDoc.data();
      const issueDate = invoiceData.issueDate?.toDate();
      
      if (issueDate) {
        const invoiceMonth = issueDate.getMonth() + 1;
        const invoiceYear = issueDate.getFullYear();
        
        // Check if invoice exists for current month and year
        if (invoiceMonth === currentMonth && invoiceYear === currentYear) {
          return res.status(400).json({ 
            error: `Invoice already exists for ${getMonthName(currentMonth)} ${currentYear}. Only one invoice per month is allowed.` 
          });
        }
      }
    }
    
    // Generate invoice number if not provided
    let invoiceNumber = value.invoiceNumber;
    if (!invoiceNumber) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      invoiceNumber = `INV-${year}${month}${day}-${randomNum}`;
    }
    
    const invoiceId = uuidv4();
    const invoiceData = {
      ...value,
      id: invoiceId,
      invoiceNumber,
      organizationId,
      createdBy: userId,
      dueDate: admin.firestore.Timestamp.fromDate(new Date(value.dueDate)),
      issueDate: admin.firestore.Timestamp.fromDate(new Date(value.issueDate || new Date())),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    await db.collection('invoices').doc(invoiceId).set(invoiceData);
    
    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      invoice: { id: invoiceId, ...invoiceData }
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// PUT /api/invoices/:id - Update invoice
router.put('/:id', verifyTokenWithRBAC, requireOrganization, requireAnyPermission(['payments:create:organization', 'payments:create:assigned']), async (req, res) => {
  try {
    const { error, value } = invoiceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const userId = req.user.uid;
    const organizationId = req.user.organizationId;
    const invoiceId = req.params.id;
    const db = admin.firestore();
    
    const invoiceDoc = await db.collection('invoices').doc(invoiceId).get();
    
    if (!invoiceDoc.exists) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const existingInvoiceData = invoiceDoc.data();
    
    // Verify invoice belongs to user's organization
    if (existingInvoiceData.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Don't allow updating if invoice is paid
    if (existingInvoiceData.status === 'paid') {
      return res.status(400).json({ error: 'Cannot update a paid invoice' });
    }
    
    const updateData = {
      ...value,
      dueDate: admin.firestore.Timestamp.fromDate(new Date(value.dueDate)),
      issueDate: value.issueDate ? admin.firestore.Timestamp.fromDate(new Date(value.issueDate)) : existingInvoiceData.issueDate,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    // Don't update invoice number if it exists
    if (existingInvoiceData.invoiceNumber) {
      delete updateData.invoiceNumber;
    }
    
    await db.collection('invoices').doc(invoiceId).update(updateData);
    
    res.json({
      success: true,
      message: 'Invoice updated successfully',
      invoice: { id: invoiceId, ...updateData }
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// DELETE /api/invoices/:id - Delete invoice
router.delete('/:id', verifyTokenWithRBAC, requireOrganization, requireAnyPermission(['payments:create:organization', 'payments:create:assigned']), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const invoiceId = req.params.id;
    const db = admin.firestore();
    
    const invoiceDoc = await db.collection('invoices').doc(invoiceId).get();
    
    if (!invoiceDoc.exists) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const invoiceData = invoiceDoc.data();
    
    // Verify invoice belongs to user's organization
    if (invoiceData.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Don't allow deleting if invoice has payments
    const paymentsSnapshot = await db.collection('payments')
      .where('invoiceId', '==', invoiceId)
      .get();
    
    if (!paymentsSnapshot.empty) {
      return res.status(400).json({ error: 'Cannot delete invoice with existing payments' });
    }
    
    await db.collection('invoices').doc(invoiceId).delete();
    
    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

module.exports = router;

