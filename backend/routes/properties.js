const express = require('express');
const admin = require('firebase-admin');
const Joi = require('joi');
const { rbacPropertySchema } = require('../models/rbac-schemas');
const { 
  verifyTokenWithRBAC, 
  requirePermission, 
  requireAnyPermission,
  checkPropertyAccess,
  filterPropertiesByAccess,
  requireOrganization 
} = require('../middleware/rbac');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Validation schemas
const locationSchema = Joi.object({
  village: Joi.string().required().min(1).max(100),
  parish: Joi.string().required().min(1).max(100),
  subCounty: Joi.string().required().min(1).max(100),
  county: Joi.string().required().min(1).max(100),
  district: Joi.string().required().min(1).max(100),
  landmarks: Joi.string().allow('').max(500),
});

// Schema for building spaces (rooms, apartments, shops, etc.)
const spaceSchema = Joi.object({
  spaceId: Joi.string().required(),
  spaceName: Joi.string().required().min(1).max(100), // e.g., "Room A1", "Shop 1", "Unit 201"
  spaceType: Joi.string().valid('room', 'apartment', 'shop', 'office', 'storage', 'other').required(),
  monthlyRent: Joi.number().min(0).required(),
  size: Joi.string().allow('').max(50), // e.g., "2 bedroom", "50 sqm"
  status: Joi.string().valid('vacant', 'occupied', 'maintenance').default('vacant'),
  amenities: Joi.array().items(Joi.string()).default([]),
  description: Joi.string().allow('').max(300),
});

// Schema for land squatters (people occupying land areas)
const squatterSchema = Joi.object({
  squatterId: Joi.string().required(),
  squatterName: Joi.string().required().min(1).max(100),
  squatterPhone: Joi.string().allow('').max(20),
  assignedArea: Joi.string().required().min(1).max(200), // e.g., "Section A", "Plot 1-5", "East Corner"
  areaSize: Joi.string().allow('').max(50), // e.g., "50x100 feet", "0.5 acres"
  monthlyPayment: Joi.number().min(0).required(),
  agreementDate: Joi.date().required(),
  status: Joi.string().valid('active', 'inactive', 'disputed').default('active'),
  description: Joi.string().allow('').max(300),
});

const floorSchema = Joi.object({
  floorNumber: Joi.number().integer().min(0).required(),
  floorName: Joi.string().allow('').max(100), // e.g., "Ground Floor", "First Floor"
  spaces: Joi.array().items(spaceSchema).min(1).required(),
  description: Joi.string().allow('').max(200),
});

const buildingDetailsSchema = Joi.object({
  buildingType: Joi.string().valid('apartment', 'house', 'commercial', 'other').required(),
  numberOfFloors: Joi.number().integer().min(1).required(),
  floors: Joi.array().items(floorSchema).min(1).required(),
  totalRentableSpaces: Joi.number().integer().min(0),
});

const landDetailsSchema = Joi.object({
  totalArea: Joi.string().allow('').max(100), // e.g., "5 acres", "200x300 feet"
  landUse: Joi.string().valid('residential', 'commercial', 'agricultural', 'mixed', 'other').required(),
  squatters: Joi.array().items(squatterSchema).default([]),
  totalSquatters: Joi.number().integer().min(0).default(0),
});

const propertySchema = Joi.object({
  name: Joi.string().required().min(1).max(200),
  type: Joi.string().valid('land', 'building').required(),
  location: locationSchema.required(),
  establishmentDate: Joi.date().required(),
  caretakerName: Joi.string().required().min(1).max(100),
  caretakerPhone: Joi.string().required().min(10).max(20),
  plotNumber: Joi.string().allow('').max(50),
  ownershipType: Joi.string().valid('leasing', 'owned').required(),
  
  // Building-specific fields (required if type is 'building')
  buildingDetails: Joi.when('type', {
    is: 'building',
    then: buildingDetailsSchema.required(),
    otherwise: Joi.forbidden(),
  }),
  
  // Land-specific fields (required if type is 'land')
  landDetails: Joi.when('type', {
    is: 'land',
    then: landDetailsSchema.required(),
    otherwise: Joi.forbidden(),
  }),
  
  // General property fields
  description: Joi.string().max(1000).allow(''),
  amenities: Joi.array().items(Joi.string()),
  images: Joi.array().items(Joi.string().uri()),
  status: Joi.string().valid('vacant', 'occupied', 'maintenance', 'under_construction').default('vacant'),
});

// GET /api/properties - Get all properties based on user permissions
router.get('/', verifyTokenWithRBAC, requireOrganization, requireAnyPermission(['properties:read:organization', 'properties:read:assigned']), async (req, res) => {
  try {
    const userId = req.user.uid;
    const organizationId = req.user.organizationId;
    const permissions = req.user.permissions;
    
    // Filter properties based on user permissions and scope
    const propertiesSnapshot = await filterPropertiesByAccess(userId, organizationId, permissions);
    
    const properties = [];
    propertiesSnapshot.forEach ? propertiesSnapshot.forEach(doc => {
      properties.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      });
    }) : propertiesSnapshot.docs.forEach(doc => {
      properties.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      });
    });
    
    // Sort by createdAt descending on the server side
    properties.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });
    
    res.json({ properties });
  } catch (error) {
    console.error('Fetch properties error:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// GET /api/properties/:id - Get a specific property
router.get('/:id', verifyTokenWithRBAC, requireOrganization, checkPropertyAccess, async (req, res) => {
  try {
    const property = {
      id: req.params.id,
      ...req.property,
      createdAt: req.property.createdAt?.toDate(),
      updatedAt: req.property.updatedAt?.toDate(),
    };
    
    res.json({ property });
  } catch (error) {
    console.error('Fetch property error:', error);
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

// POST /api/properties - Create a new property
router.post('/', verifyTokenWithRBAC, requireOrganization, requirePermission('properties:create:organization'), async (req, res) => {
  try {
    const { error, value } = rbacPropertySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const userId = req.user.uid;
    const organizationId = req.user.organizationId;
    const db = admin.firestore();
    const propertyId = uuidv4();
    
    const propertyData = {
      ...value,
      organizationId,
      createdBy: userId,
      id: propertyId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    await db.collection('properties').doc(propertyId).set(propertyData);
    
    res.status(201).json({ 
      success: true, 
      message: 'Property created successfully',
      property: { id: propertyId, ...propertyData }
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

// PUT /api/properties/:id - Update a property
router.put('/:id', verifyTokenWithRBAC, requireOrganization, checkPropertyAccess, requireAnyPermission(['properties:update:organization', 'properties:update:assigned']), async (req, res) => {
  try {
    const { error, value } = rbacPropertySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const db = admin.firestore();
    const propertyId = req.params.id;
    const userId = req.user.uid;
    
    const updateData = {
      ...value,
      organizationId: req.user.organizationId, // Ensure organization doesn't change
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: userId,
    };
    
    await db.collection('properties').doc(propertyId).update(updateData);
    
    res.json({ 
      success: true, 
      message: 'Property updated successfully',
      property: { id: propertyId, ...updateData }
    });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({ error: 'Failed to update property' });
  }
});

// DELETE /api/properties/:id - Delete a property
router.delete('/:id', verifyTokenWithRBAC, requireOrganization, checkPropertyAccess, requirePermission('properties:delete:organization'), async (req, res) => {
  try {
    const db = admin.firestore();
    const propertyId = req.params.id;
    
    // Also delete related rent records and payments
    const batch = db.batch();
    
    // Delete the property
    batch.delete(db.collection('properties').doc(propertyId));
    
    // Delete related rent records
    const rentSnapshot = await db.collection('rent')
      .where('propertyId', '==', propertyId)
      .get();
    
    rentSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete related payments
    const paymentsSnapshot = await db.collection('payments')
      .where('propertyId', '==', propertyId)
      .get();
    
    paymentsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    res.json({ 
      success: true, 
      message: 'Property and related data deleted successfully' 
    });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ error: 'Failed to delete property' });
  }
});

// GET /api/properties/:id/stats - Get property statistics
router.get('/:id/stats', verifyTokenWithRBAC, requireOrganization, checkPropertyAccess, requireAnyPermission(['reports:read:organization', 'reports:read:assigned']), async (req, res) => {
  try {
    const propertyId = req.params.id;
    const db = admin.firestore();
    
    // Get total payments for this property
    const paymentsSnapshot = await db.collection('payments')
      .where('propertyId', '==', propertyId)
      .get();
    
    let totalCollected = 0;
    let totalPayments = 0;
    const paymentsByMonth = {};
    
    paymentsSnapshot.forEach(doc => {
      const payment = doc.data();
      totalCollected += payment.amount;
      totalPayments++;
      
      const date = payment.paymentDate?.toDate() || new Date();
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      paymentsByMonth[monthKey] = (paymentsByMonth[monthKey] || 0) + payment.amount;
    });
    
    // Calculate expected rent (assuming monthly rent from property data)
    const property = req.property;
    const monthsActive = Math.max(1, Math.ceil(
      (new Date() - (property.createdAt?.toDate() || new Date())) / (1000 * 60 * 60 * 24 * 30)
    ));
    
    const expectedTotal = property.monthlyRent * monthsActive;
    const collectionRate = expectedTotal > 0 ? (totalCollected / expectedTotal) * 100 : 0;
    
    res.json({
      stats: {
        totalCollected,
        totalPayments,
        expectedTotal,
        collectionRate: Math.round(collectionRate * 100) / 100,
        monthlyRent: property.monthlyRent,
        paymentsByMonth,
        monthsActive,
      }
    });
  } catch (error) {
    console.error('Property stats error:', error);
    res.status(500).json({ error: 'Failed to get property statistics' });
  }
});

module.exports = router;
