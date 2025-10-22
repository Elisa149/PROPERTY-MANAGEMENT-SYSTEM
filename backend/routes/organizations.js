const express = require('express');
const admin = require('firebase-admin');
const { organizationSchema, roleSchema, userProfileSchema, SYSTEM_ROLES, ROLE_PERMISSIONS } = require('../models/rbac-schemas');
const { 
  verifyTokenWithRBAC, 
  requirePermission, 
  isSuperAdmin, 
  isOrganizationAdmin,
  checkOrganizationAccess 
} = require('../middleware/rbac');

const router = express.Router();

// Use the already initialized Firebase app
const db = admin.firestore();

// Get all organizations (Super Admin only)
router.get('/', verifyTokenWithRBAC, isSuperAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('organizations').orderBy('name').get();
    const organizations = [];
    
    snapshot.forEach(doc => {
      organizations.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json({ organizations });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Get specific organization
router.get('/:organizationId', verifyTokenWithRBAC, checkOrganizationAccess, async (req, res) => {
  try {
    const { organizationId } = req.params;
    const doc = await db.collection('organizations').doc(organizationId).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    res.json({ 
      organization: {
        id: doc.id,
        ...doc.data()
      }
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// Create new organization (Super Admin only)
router.post('/', verifyTokenWithRBAC, isSuperAdmin, async (req, res) => {
  try {
    const { error, value } = organizationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const organizationData = {
      ...value,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: req.user.uid,
      ownerId: req.user.uid,
    };
    
    const docRef = await db.collection('organizations').add(organizationData);
    
    // Create default roles for the organization
    await createDefaultRoles(docRef.id);
    
    res.status(201).json({ 
      message: 'Organization created successfully',
      organizationId: docRef.id 
    });
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// Update organization
router.put('/:organizationId', verifyTokenWithRBAC, checkOrganizationAccess, isOrganizationAdmin, async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { error, value } = organizationSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    const updateData = {
      ...value,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: req.user.uid,
    };
    
    await db.collection('organizations').doc(organizationId).update(updateData);
    
    res.json({ message: 'Organization updated successfully' });
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// Get organization users
router.get('/:organizationId/users', verifyTokenWithRBAC, checkOrganizationAccess, requirePermission('users:read:organization'), async (req, res) => {
  try {
    const { organizationId } = req.params;
    
    const snapshot = await db.collection('users')
      .where('organizationId', '==', organizationId)
      .orderBy('displayName')
      .get();
    
    const users = [];
    
    for (const doc of snapshot.docs) {
      const userData = doc.data();
      
      // Get role information
      let role = null;
      if (userData.roleId) {
        const roleDoc = await db.collection('roles').doc(userData.roleId).get();
        if (roleDoc.exists) {
          role = roleDoc.data();
        }
      }
      
      users.push({
        id: doc.id,
        ...userData,
        role: role
      });
    }
    
    res.json({ users });
  } catch (error) {
    console.error('Error fetching organization users:', error);
    res.status(500).json({ error: 'Failed to fetch organization users' });
  }
});

// Invite user to organization
router.post('/:organizationId/invite', verifyTokenWithRBAC, checkOrganizationAccess, requirePermission('users:create:organization'), async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { email, roleId, message } = req.body;
    
    if (!email || !roleId) {
      return res.status(400).json({ error: 'Email and role are required' });
    }
    
    // Check if role exists and belongs to this organization
    const roleDoc = await db.collection('roles').doc(roleId).get();
    if (!roleDoc.exists || roleDoc.data().organizationId !== organizationId) {
      return res.status(400).json({ error: 'Invalid role for this organization' });
    }
    
    // Check if user already exists
    const existingUsers = await admin.auth().getUserByEmail(email).catch(() => null);
    
    if (existingUsers) {
      // User exists - check if already in organization
      const userDoc = await db.collection('users').doc(existingUsers.uid).get();
      if (userDoc.exists && userDoc.data().organizationId === organizationId) {
        return res.status(400).json({ error: 'User already belongs to this organization' });
      }
    }
    
    // Create invitation
    const invitationData = {
      email: email.toLowerCase(),
      organizationId,
      roleId,
      invitedBy: req.user.uid,
      message: message || '',
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };
    
    await db.collection('invitations').add(invitationData);
    
    // TODO: Send invitation email
    
    res.status(201).json({ message: 'Invitation sent successfully' });
  } catch (error) {
    console.error('Error inviting user:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// Update user role in organization
router.put('/:organizationId/users/:userId/role', verifyTokenWithRBAC, checkOrganizationAccess, requirePermission('users:update:organization'), async (req, res) => {
  try {
    const { organizationId, userId } = req.params;
    const { roleId } = req.body;
    
    if (!roleId) {
      return res.status(400).json({ error: 'Role ID is required' });
    }
    
    // Verify role belongs to organization
    const roleDoc = await db.collection('roles').doc(roleId).get();
    if (!roleDoc.exists || roleDoc.data().organizationId !== organizationId) {
      return res.status(400).json({ error: 'Invalid role for this organization' });
    }
    
    // Update user role
    await db.collection('users').doc(userId).update({
      roleId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: req.user.uid,
    });
    
    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Get organization roles
router.get('/:organizationId/roles', verifyTokenWithRBAC, checkOrganizationAccess, async (req, res) => {
  try {
    const { organizationId } = req.params;
    
    const snapshot = await db.collection('roles')
      .where('organizationId', '==', organizationId)
      .orderBy('level', 'desc')
      .get();
    
    const roles = [];
    snapshot.forEach(doc => {
      roles.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json({ roles });
  } catch (error) {
    console.error('Error fetching organization roles:', error);
    res.status(500).json({ error: 'Failed to fetch organization roles' });
  }
});

// Helper function to create default roles for an organization
async function createDefaultRoles(organizationId) {
  const batch = db.batch();
  
  Object.values(SYSTEM_ROLES).forEach(roleTemplate => {
    const roleRef = db.collection('roles').doc();
    const roleData = {
      ...roleTemplate,
      organizationId,
      permissions: ROLE_PERMISSIONS[roleTemplate.name] || [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    batch.set(roleRef, roleData);
  });
  
  await batch.commit();
}

module.exports = router;
