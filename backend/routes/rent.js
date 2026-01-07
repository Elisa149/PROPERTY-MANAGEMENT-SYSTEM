const express = require('express');
const admin = require('firebase-admin');
const { verifyTokenWithRBAC, requireOrganization, requireAnyPermission, hasPermission, isSuperAdmin } = require('../middleware/rbac');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Updated with RBAC and flexible tenant assignment

// Validation schema - Updated for flexible tenant assignment
const rentSchema = Joi.object({
  propertyId: Joi.string().required(),
  spaceId: Joi.string().allow(''), // For individual space assignments
  spaceName: Joi.string().allow(''), // Space identifier for display
  tenantName: Joi.string().required().min(1).max(200),
  tenantEmail: Joi.string().email().allow(''),
  tenantPhone: Joi.string().allow(''),
  nationalId: Joi.string().allow(''),
  emergencyContact: Joi.string().allow(''),
  
  // Monthly rent - can be from space or custom
  monthlyRent: Joi.number().min(0).default(0),
  baseRent: Joi.number().min(0).default(0),
  utilitiesAmount: Joi.number().min(0).default(0),
  
  // Lease dates - end date is optional
  leaseStart: Joi.date().required(),
  leaseEnd: Joi.date().allow(null, ''),
  leaseDurationMonths: Joi.number().integer().min(1).default(12),
  
  // Financial terms - all optional at assignment time
  deposit: Joi.number().min(0).default(0),
  securityDeposit: Joi.number().min(0).default(0),
  paymentDueDate: Joi.number().integer().min(1).max(31).default(1),
  rentEscalation: Joi.number().min(0).max(100).default(0), // Percentage
  
  // Agreement details
  agreementType: Joi.string().valid('standard', 'custom').default('standard'),
  status: Joi.string().valid('active', 'terminated', 'pending').default('active'),
  notes: Joi.string().max(1000).allow(''),
});

// GET /api/rent/all - Get all rent records across all organizations (Super Admin only)
// NOTE: This must be defined BEFORE /:id route to avoid route conflicts
router.get('/all', verifyTokenWithRBAC, isSuperAdmin, async (req, res) => {
  try {
    const db = admin.firestore();
    
    // Get all rent records
    const rentSnapshot = await db.collection('rent').get();
    
    if (rentSnapshot.empty) {
      return res.json({ rentRecords: [], groupedByOrganization: [] });
    }
    
    // Get all unique organization IDs from rent records
    const organizationIds = new Set();
    const propertyIds = new Set();
    
    rentSnapshot.forEach(doc => {
      const rentData = doc.data();
      if (rentData.organizationId) {
        organizationIds.add(rentData.organizationId);
      }
      if (rentData.propertyId) {
        propertyIds.add(rentData.propertyId);
      }
    });
    
    // Fetch all organizations
    const organizationsMap = {};
    if (organizationIds.size > 0) {
      const orgPromises = Array.from(organizationIds).map(async (orgId) => {
        const orgDoc = await db.collection('organizations').doc(orgId).get();
        if (orgDoc.exists) {
          return { id: orgId, ...orgDoc.data() };
        }
        return null;
      });
      const orgs = await Promise.all(orgPromises);
      orgs.forEach(org => {
        if (org) {
          organizationsMap[org.id] = org;
        }
      });
    }
    
    // Fetch all properties
    const propertiesMap = {};
    if (propertyIds.size > 0) {
      // Firestore 'in' query supports max 10 items, so we need to batch
      const propertyIdsArray = Array.from(propertyIds);
      for (let i = 0; i < propertyIdsArray.length; i += 10) {
        const batch = propertyIdsArray.slice(i, i + 10);
        // Fetch properties by document ID
        const propertyPromises = batch.map(async (propertyId) => {
          const propertyDoc = await db.collection('properties').doc(propertyId).get();
          if (propertyDoc.exists) {
            return { id: propertyId, ...propertyDoc.data() };
          }
          return null;
        });
        const properties = await Promise.all(propertyPromises);
        properties.forEach(property => {
          if (property) {
            propertiesMap[property.id] = property;
          }
        });
      }
    }
    
    // Process rent records and group by organization
    const rentRecords = [];
    const groupedByOrganization = {};
    
    rentSnapshot.forEach(doc => {
      const rentData = doc.data();
      const organizationId = rentData.organizationId || 'unassigned';
      const organization = organizationsMap[organizationId];
      const property = propertiesMap[rentData.propertyId];
      
      const rentRecord = {
        id: doc.id,
        ...rentData,
        organizationId: organizationId,
        organizationName: organization?.name || 'Unassigned Organization',
        propertyName: property?.name || 'Unknown Property',
        propertyAddress: property?.location?.village || property?.location?.address || '',
        leaseStart: rentData.leaseStart?.toDate(),
        leaseEnd: rentData.leaseEnd?.toDate(),
        createdAt: rentData.createdAt?.toDate(),
        updatedAt: rentData.updatedAt?.toDate(),
      };
      
      rentRecords.push(rentRecord);
      
      // Group by organization
      if (!groupedByOrganization[organizationId]) {
        groupedByOrganization[organizationId] = {
          organizationId: organizationId,
          organizationName: organization?.name || 'Unassigned Organization',
          rentRecords: [],
          totalRecords: 0,
          activeRecords: 0,
          terminatedRecords: 0,
          totalMonthlyRent: 0,
        };
      }
      
      groupedByOrganization[organizationId].rentRecords.push(rentRecord);
      groupedByOrganization[organizationId].totalRecords++;
      
      if (rentData.status === 'active') {
        groupedByOrganization[organizationId].activeRecords++;
        groupedByOrganization[organizationId].totalMonthlyRent += (rentData.monthlyRent || 0);
      } else if (rentData.status === 'terminated') {
        groupedByOrganization[organizationId].terminatedRecords++;
      }
    });
    
    // Sort rent records by createdAt descending
    rentRecords.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });
    
    // Sort organizations by name
    const sortedGroups = Object.values(groupedByOrganization).sort((a, b) => 
      a.organizationName.localeCompare(b.organizationName)
    );
    
    res.json({
      rentRecords,
      groupedByOrganization: sortedGroups,
      summary: {
        totalRecords: rentRecords.length,
        totalOrganizations: Object.keys(groupedByOrganization).length,
        totalActiveRecords: rentRecords.filter(r => r.status === 'active').length,
        totalTerminatedRecords: rentRecords.filter(r => r.status === 'terminated').length,
        totalMonthlyRent: rentRecords
          .filter(r => r.status === 'active')
          .reduce((sum, r) => sum + (r.monthlyRent || 0), 0),
      },
    });
  } catch (error) {
    console.error('Fetch all rent records error:', error);
    res.status(500).json({ error: 'Failed to fetch all rent records' });
  }
});

// GET /api/rent/property/:propertyId - Get rent records for specific property
router.get('/property/:propertyId', verifyTokenWithRBAC, requireOrganization, requireAnyPermission(['payments:read:organization', 'payments:read:assigned']), async (req, res) => {
  try {
    const userId = req.user.uid;
    const organizationId = req.user.organizationId;
    const permissions = req.user.permissions;
    const propertyId = req.params.propertyId;
    const db = admin.firestore();
    
    // Get property and verify access
    const propertyDoc = await db.collection('properties').doc(propertyId).get();
    
    if (!propertyDoc.exists) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    const property = propertyDoc.data();
    
    // Check organization match
    if (property.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied to this property' });
    }
    
    // Check property-level access for property managers
    if (hasPermission(permissions, 'payments:read:assigned') && !hasPermission(permissions, 'payments:read:organization')) {
      const isAssigned = property.assignedManagers?.includes(userId) || property.caretakerId === userId;
      if (!isAssigned) {
        return res.status(403).json({ error: 'Property not assigned to you' });
      }
    }
    
    // Get rent records for the property
    const rentSnapshot = await db.collection('rent')
      .where('propertyId', '==', propertyId)
      .get();
    
    const rentRecords = [];
    rentSnapshot.forEach(doc => {
      const rentData = doc.data();
      rentRecords.push({
        id: doc.id,
        ...rentData,
        leaseStart: rentData.leaseStart?.toDate(),
        leaseEnd: rentData.leaseEnd?.toDate(),
        createdAt: rentData.createdAt?.toDate(),
        updatedAt: rentData.updatedAt?.toDate(),
      });
    });
    
    // Sort by createdAt descending
    rentRecords.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });
    
    res.json({ rentRecords, propertyName: property.name });
  } catch (error) {
    console.error('Fetch property rent records error:', error);
    res.status(500).json({ error: 'Failed to fetch rent records for property' });
  }
});

// GET /api/rent - Get all rent records based on user permissions
router.get('/', verifyTokenWithRBAC, requireOrganization, requireAnyPermission(['payments:read:organization', 'payments:read:assigned']), async (req, res) => {
  try {
    console.log('📋 GET /api/rent - Request received');
    const userId = req.user?.uid;
    const organizationId = req.user?.organizationId;
    const permissions = req.user?.permissions || [];
    
    if (!userId) {
      console.error('❌ No user ID found in request');
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!organizationId) {
      console.error('❌ No organization ID found for user:', userId);
      return res.status(403).json({ error: 'Organization membership required' });
    }
    
    console.log(`📋 Fetching rent records for user ${userId} in organization ${organizationId}`);
    const db = admin.firestore();
    
    let propertiesSnapshot;
    
    // Get properties based on permissions
    // NOTE: For property managers, they can VIEW all organization properties
    // But can only CREATE/UPDATE rent records for assigned properties
    try {
      if (hasPermission(permissions, 'payments:read:organization')) {
        // Organization admin - see all organization properties
        propertiesSnapshot = await db.collection('properties')
          .where('organizationId', '==', organizationId)
          .get();
      } else if (hasPermission(permissions, 'payments:read:assigned')) {
        // Property manager - can VIEW all organization properties for rent records
        propertiesSnapshot = await db.collection('properties')
          .where('organizationId', '==', organizationId)
          .get();
      } else {
        console.log('⚠️ User has no permission to read payments');
        return res.json({ rentRecords: [] });
      }
    } catch (error) {
      console.error('❌ Error fetching properties:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch properties',
        message: error.message 
      });
    }
    
    if (!propertiesSnapshot) {
      console.log('⚠️ No properties snapshot returned');
      return res.json({ rentRecords: [] });
    }
    
    const propertyIds = [];
    const propertiesMap = {};
    
    // Safely process the snapshot
    if (propertiesSnapshot.forEach) {
      propertiesSnapshot.forEach(doc => {
        propertyIds.push(doc.id);
        propertiesMap[doc.id] = doc.data();
      });
    } else if (propertiesSnapshot.docs && Array.isArray(propertiesSnapshot.docs)) {
      propertiesSnapshot.docs.forEach(doc => {
        propertyIds.push(doc.id);
        propertiesMap[doc.id] = doc.data();
      });
    } else {
      console.error('❌ Invalid properties snapshot format:', typeof propertiesSnapshot);
      return res.status(500).json({ error: 'Invalid properties data format' });
    }
    
    if (propertyIds.length === 0) {
      console.log('ℹ️ No accessible properties found for user');
      return res.json({ rentRecords: [] });
    }
    
    console.log(`📋 Fetching rent records for ${propertyIds.length} properties`);
    
    // Get rent records for accessible properties
    const rentRecordsData = [];
    // Firestore 'in' query supports max 10 items, so we need to batch
    try {
      for (let i = 0; i < propertyIds.length; i += 10) {
        const batch = propertyIds.slice(i, i + 10);
        
        if (batch.length === 0) {
          continue;
        }
        
        const rentSnapshot = await db.collection('rent')
          .where('propertyId', 'in', batch)
          .get();
        
        console.log(`📋 Batch ${Math.floor(i/10) + 1}: Found ${rentSnapshot.size} rent records`);
        
        if (rentSnapshot && rentSnapshot.forEach) {
          rentSnapshot.forEach(doc => {
            rentRecordsData.push(doc);
          });
        } else if (rentSnapshot && rentSnapshot.docs) {
          rentRecordsData.push(...rentSnapshot.docs);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching rent records:', error);
      console.error('Error stack:', error.stack);
      return res.status(500).json({ 
        error: 'Failed to fetch rent records',
        message: error.message 
      });
    }
    
    console.log(`📋 Total rent records found: ${rentRecordsData.length}`);
    
    const rentRecords = rentRecordsData.map(doc => {
      try {
        const rentData = doc.data ? doc.data() : doc;
        return {
          id: doc.id || doc,
          ...rentData,
          propertyName: propertiesMap[rentData.propertyId]?.name || 'Unknown Property',
          propertyAddress: propertiesMap[rentData.propertyId]?.location?.village || '',
          leaseStart: rentData.leaseStart?.toDate ? rentData.leaseStart.toDate() : rentData.leaseStart,
          leaseEnd: rentData.leaseEnd?.toDate ? rentData.leaseEnd.toDate() : rentData.leaseEnd,
          createdAt: rentData.createdAt?.toDate ? rentData.createdAt.toDate() : rentData.createdAt,
          updatedAt: rentData.updatedAt?.toDate ? rentData.updatedAt.toDate() : rentData.updatedAt,
        };
      } catch (error) {
        console.error('❌ Error processing rent record:', error, doc);
        return null;
      }
    }).filter(record => record !== null);
    
    // Sort by createdAt descending on the server side
    rentRecords.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });
    
    console.log(`✅ Successfully fetched ${rentRecords.length} rent records`);
    res.json({ rentRecords });
  } catch (error) {
    console.error('❌ Fetch rent records error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch rent records',
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// GET /api/rent/:id - Get specific rent record
router.get('/:id', verifyTokenWithRBAC, requireOrganization, requireAnyPermission(['payments:read:organization', 'payments:read:assigned']), async (req, res) => {
  try {
    const userId = req.user.uid;
    const organizationId = req.user.organizationId;
    const permissions = req.user.permissions;
    const rentId = req.params.id;
    const db = admin.firestore();
    
    const rentDoc = await db.collection('rent').doc(rentId).get();
    
    if (!rentDoc.exists) {
      return res.status(404).json({ error: 'Rent record not found' });
    }
    
    const rentData = rentDoc.data();
    
    // Verify access through property
    const propertyDoc = await db.collection('properties').doc(rentData.propertyId).get();
    if (!propertyDoc.exists) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    const property = propertyDoc.data();
    
    // Check organization match
    if (property.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check property-level access for property managers
    if (hasPermission(permissions, 'payments:read:assigned') && !hasPermission(permissions, 'payments:read:organization')) {
      const isAssigned = property.assignedManagers?.includes(userId) || property.caretakerId === userId;
      if (!isAssigned) {
        return res.status(403).json({ error: 'Access denied to this rent record' });
      }
    }
    
    res.json({
      rentRecord: {
        id: rentId,
        ...rentData,
        propertyName: property.name,
        leaseStart: rentData.leaseStart?.toDate(),
        leaseEnd: rentData.leaseEnd?.toDate(),
        createdAt: rentData.createdAt?.toDate(),
        updatedAt: rentData.updatedAt?.toDate(),
      }
    });
  } catch (error) {
    console.error('Fetch rent record error:', error);
    res.status(500).json({ error: 'Failed to fetch rent record' });
  }
});

// POST /api/rent - Create new rent record
router.post('/', verifyTokenWithRBAC, requireOrganization, requireAnyPermission(['payments:create:organization', 'payments:create:assigned']), async (req, res) => {
  try {
    const { error, value } = rentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const userId = req.user.uid;
    const organizationId = req.user.organizationId;
    const permissions = req.user.permissions;
    const db = admin.firestore();
    
    // Verify property access
    const propertyDoc = await db.collection('properties').doc(value.propertyId).get();
    if (!propertyDoc.exists) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    const property = propertyDoc.data();
    
    // Check organization match
    if (property.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied to this property' });
    }
    
    // Check property-level access for property managers
    if (hasPermission(permissions, 'payments:create:assigned') && !hasPermission(permissions, 'payments:create:organization')) {
      const isAssigned = property.assignedManagers?.includes(userId) || property.caretakerId === userId;
      if (!isAssigned) {
        return res.status(403).json({ error: 'Property not assigned to you' });
      }
    }
    
    // Check if space already has an active rent record (if spaceId provided)
    if (value.spaceId) {
      const existingRentSnapshot = await db.collection('rent')
        .where('propertyId', '==', value.propertyId)
        .where('spaceId', '==', value.spaceId)
        .where('status', '==', 'active')
        .get();
      
      if (!existingRentSnapshot.empty) {
        return res.status(400).json({ error: 'This space already has an active tenant assignment' });
      }
    }
    
    const rentId = uuidv4();
    const rentData = {
      ...value,
      id: rentId,
      userId,
      organizationId,
      leaseStart: admin.firestore.Timestamp.fromDate(new Date(value.leaseStart)),
      leaseEnd: value.leaseEnd ? admin.firestore.Timestamp.fromDate(new Date(value.leaseEnd)) : null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    await db.collection('rent').doc(rentId).set(rentData);
    
    // Update property status to occupied
    await db.collection('properties').doc(value.propertyId).update({
      status: 'occupied',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    res.status(201).json({
      success: true,
      message: 'Rent record created successfully',
      rentRecord: { id: rentId, ...rentData }
    });
  } catch (error) {
    console.error('Create rent record error:', error);
    res.status(500).json({ error: 'Failed to create rent record' });
  }
});

// PUT /api/rent/:id - Update rent record
router.put('/:id', verifyTokenWithRBAC, requireOrganization, requireAnyPermission(['payments:create:organization', 'payments:create:assigned']), async (req, res) => {
  try {
    const { error, value } = rentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const userId = req.user.uid;
    const organizationId = req.user.organizationId;
    const permissions = req.user.permissions;
    const rentId = req.params.id;
    const db = admin.firestore();
    
    // Verify rent record exists
    const rentDoc = await db.collection('rent').doc(rentId).get();
    if (!rentDoc.exists) {
      return res.status(404).json({ error: 'Rent record not found' });
    }
    
    // Verify property access
    const propertyDoc = await db.collection('properties').doc(value.propertyId).get();
    if (!propertyDoc.exists) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    const property = propertyDoc.data();
    
    // Check organization match
    if (property.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied to this property' });
    }
    
    // Check property-level access for property managers
    if (hasPermission(permissions, 'payments:create:assigned') && !hasPermission(permissions, 'payments:create:organization')) {
      const isAssigned = property.assignedManagers?.includes(userId) || property.caretakerId === userId;
      if (!isAssigned) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const updateData = {
      ...value,
      leaseStart: admin.firestore.Timestamp.fromDate(new Date(value.leaseStart)),
      leaseEnd: value.leaseEnd ? admin.firestore.Timestamp.fromDate(new Date(value.leaseEnd)) : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    await db.collection('rent').doc(rentId).update(updateData);
    
    res.json({
      success: true,
      message: 'Rent record updated successfully',
      rentRecord: { id: rentId, ...updateData }
    });
  } catch (error) {
    console.error('Update rent record error:', error);
    res.status(500).json({ error: 'Failed to update rent record' });
  }
});

// DELETE /api/rent/:id - Delete rent record
router.delete('/:id', verifyTokenWithRBAC, requireOrganization, requireAnyPermission(['payments:create:organization', 'payments:create:assigned']), async (req, res) => {
  try {
    const userId = req.user.uid;
    const organizationId = req.user.organizationId;
    const permissions = req.user.permissions;
    const rentId = req.params.id;
    const db = admin.firestore();
    
    const rentDoc = await db.collection('rent').doc(rentId).get();
    if (!rentDoc.exists) {
      return res.status(404).json({ error: 'Rent record not found' });
    }
    
    const rentData = rentDoc.data();
    
    // Verify property access
    const propertyDoc = await db.collection('properties').doc(rentData.propertyId).get();
    if (!propertyDoc.exists) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    const property = propertyDoc.data();
    
    // Check organization match
    if (property.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied to this property' });
    }
    
    // Check property-level access for property managers
    if (hasPermission(permissions, 'payments:create:assigned') && !hasPermission(permissions, 'payments:create:organization')) {
      const isAssigned = property.assignedManagers?.includes(userId) || property.caretakerId === userId;
      if (!isAssigned) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const batch = db.batch();
    
    // Delete rent record
    batch.delete(db.collection('rent').doc(rentId));
    
    // Update property status to vacant
    batch.update(db.collection('properties').doc(rentData.propertyId), {
      status: 'vacant',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Delete related payments
    const paymentsSnapshot = await db.collection('payments')
      .where('rentId', '==', rentId)
      .get();
    
    paymentsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    res.json({
      success: true,
      message: 'Rent record and related payments deleted successfully'
    });
  } catch (error) {
    console.error('Delete rent record error:', error);
    res.status(500).json({ error: 'Failed to delete rent record' });
  }
});


module.exports = router;
