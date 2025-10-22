const express = require('express');
const admin = require('firebase-admin');
const { verifyToken } = require('../middleware/auth');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Validation schema for tenant
const tenantSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().allow(''),
  phone: Joi.string().required(),
  alternatePhone: Joi.string().allow(''),
  nationalId: Joi.string().allow(''),
  passportNumber: Joi.string().allow(''),
  dateOfBirth: Joi.date().allow(''),
  gender: Joi.string().valid('male', 'female', 'other', '').allow(''),
  occupation: Joi.string().max(100).allow(''),
  employer: Joi.string().max(100).allow(''),
  monthlyIncome: Joi.number().min(0).allow(''),
  emergencyContact: Joi.object({
    name: Joi.string().max(100).allow(''),
    phone: Joi.string().allow(''),
    relationship: Joi.string().max(50).allow(''),
  }).allow(''),
  address: Joi.object({
    street: Joi.string().max(200).allow(''),
    village: Joi.string().max(100).allow(''),
    district: Joi.string().max(100).allow(''),
    region: Joi.string().max(100).allow(''),
    country: Joi.string().max(100).default('Uganda'),
  }).allow(''),
  references: Joi.array().items(Joi.object({
    name: Joi.string().max(100),
    phone: Joi.string(),
    relationship: Joi.string().max(50),
    address: Joi.string().max(200).allow(''),
  })).max(3).allow(''),
  bankDetails: Joi.object({
    bankName: Joi.string().max(100).allow(''),
    accountNumber: Joi.string().max(50).allow(''),
    accountName: Joi.string().max(100).allow(''),
  }).allow(''),
  notes: Joi.string().max(1000).allow(''),
  status: Joi.string().valid('active', 'inactive', 'blacklisted').default('active'),
  tags: Joi.array().items(Joi.string().max(30)).max(10).allow(''),
});

// GET /api/tenants - Get all tenants for user
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { status, search } = req.query;
    const db = admin.firestore();
    
    let query = db.collection('tenants').where('userId', '==', userId);
    
    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }
    
    const snapshot = await query.get();
    const tenants = [];
    
    snapshot.forEach(doc => {
      const tenant = {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      };
      
      // Apply text search filter if provided
      if (search) {
        const searchLower = search.toLowerCase();
        const fullName = `${tenant.firstName} ${tenant.lastName}`.toLowerCase();
        if (
          fullName.includes(searchLower) ||
          tenant.phone?.includes(search) ||
          tenant.email?.toLowerCase().includes(searchLower) ||
          tenant.nationalId?.toLowerCase().includes(searchLower)
        ) {
          tenants.push(tenant);
        }
      } else {
        tenants.push(tenant);
      }
    });
    
    // Sort by creation date (newest first)
    tenants.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ 
      tenants,
      totalCount: tenants.length 
    });
  } catch (error) {
    console.error('Fetch tenants error:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

// GET /api/tenants/:id - Get specific tenant
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const tenantId = req.params.id;
    const db = admin.firestore();
    
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    
    if (!tenantDoc.exists) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    const tenantData = tenantDoc.data();
    
    // Verify ownership
    if (tenantData.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get tenant's current assignments
    const rentSnapshot = await db.collection('rent')
      .where('tenantId', '==', tenantId)
      .where('status', '==', 'active')
      .get();
    
    const currentAssignments = [];
    for (const rentDoc of rentSnapshot.docs) {
      const rentData = rentDoc.data();
      
      // Get property details
      const propertyDoc = await db.collection('properties').doc(rentData.propertyId).get();
      if (propertyDoc.exists) {
        currentAssignments.push({
          id: rentDoc.id,
          ...rentData,
          propertyName: propertyDoc.data().name,
        });
      }
    }
    
    res.json({
      tenant: {
        id: tenantId,
        ...tenantData,
        createdAt: tenantData.createdAt?.toDate(),
        updatedAt: tenantData.updatedAt?.toDate(),
        currentAssignments,
      }
    });
  } catch (error) {
    console.error('Fetch tenant error:', error);
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
});

// POST /api/tenants - Create new tenant
router.post('/', verifyToken, async (req, res) => {
  try {
    const { error, value } = tenantSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const userId = req.user.uid;
    const db = admin.firestore();
    
    // Check for duplicate phone number
    const existingTenant = await db.collection('tenants')
      .where('userId', '==', userId)
      .where('phone', '==', value.phone)
      .get();
    
    if (!existingTenant.empty) {
      return res.status(400).json({ error: 'A tenant with this phone number already exists' });
    }
    
    const tenantId = uuidv4();
    const tenantData = {
      ...value,
      id: tenantId,
      userId,
      fullName: `${value.firstName} ${value.lastName}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    await db.collection('tenants').doc(tenantId).set(tenantData);
    
    res.status(201).json({
      success: true,
      message: 'Tenant created successfully',
      tenant: { id: tenantId, ...tenantData }
    });
  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

// PUT /api/tenants/:id - Update tenant
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { error, value } = tenantSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const userId = req.user.uid;
    const tenantId = req.params.id;
    const db = admin.firestore();
    
    // Verify tenant exists and user owns it
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    const tenantData = tenantDoc.data();
    if (tenantData.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check for duplicate phone number (excluding current tenant)
    const existingTenant = await db.collection('tenants')
      .where('userId', '==', userId)
      .where('phone', '==', value.phone)
      .get();
    
    const duplicates = existingTenant.docs.filter(doc => doc.id !== tenantId);
    if (duplicates.length > 0) {
      return res.status(400).json({ error: 'Another tenant with this phone number already exists' });
    }
    
    const updateData = {
      ...value,
      fullName: `${value.firstName} ${value.lastName}`,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    await db.collection('tenants').doc(tenantId).update(updateData);
    
    res.json({
      success: true,
      message: 'Tenant updated successfully',
      tenant: { id: tenantId, ...updateData }
    });
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

// DELETE /api/tenants/:id - Delete tenant
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const tenantId = req.params.id;
    const db = admin.firestore();
    
    // Verify tenant exists and user owns it
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    const tenantData = tenantDoc.data();
    if (tenantData.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if tenant has active assignments
    const activeRent = await db.collection('rent')
      .where('tenantId', '==', tenantId)
      .where('status', '==', 'active')
      .get();
    
    if (!activeRent.empty) {
      return res.status(400).json({ 
        error: 'Cannot delete tenant with active space assignments. End their lease first.' 
      });
    }
    
    await db.collection('tenants').doc(tenantId).delete();
    
    res.json({
      success: true,
      message: 'Tenant deleted successfully'
    });
  } catch (error) {
    console.error('Delete tenant error:', error);
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

// GET /api/tenants/:id/assignments - Get tenant's space assignments
router.get('/:id/assignments', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const tenantId = req.params.id;
    const db = admin.firestore();
    
    // Verify tenant ownership
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists || tenantDoc.data().userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get all assignments for this tenant
    const rentSnapshot = await db.collection('rent')
      .where('tenantId', '==', tenantId)
      .get();
    
    const assignments = [];
    for (const rentDoc of rentSnapshot.docs) {
      const rentData = rentDoc.data();
      
      // Get property details
      const propertyDoc = await db.collection('properties').doc(rentData.propertyId).get();
      if (propertyDoc.exists) {
        assignments.push({
          id: rentDoc.id,
          ...rentData,
          propertyName: propertyDoc.data().name,
          propertyAddress: propertyDoc.data().address,
          leaseStart: rentData.leaseStart?.toDate(),
          leaseEnd: rentData.leaseEnd?.toDate(),
          createdAt: rentData.createdAt?.toDate(),
        });
      }
    }
    
    // Sort by creation date (newest first)
    assignments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ assignments });
  } catch (error) {
    console.error('Fetch tenant assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch tenant assignments' });
  }
});

module.exports = router;


