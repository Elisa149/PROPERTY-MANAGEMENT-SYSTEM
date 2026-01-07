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

// Get all organizations (Super Admin only) with user counts
router.get('/', verifyTokenWithRBAC, isSuperAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('organizations').orderBy('name').get();
    const organizations = [];
    
    // Get user counts and rent statistics for each organization
    const orgStatsPromises = snapshot.docs.map(async (doc) => {
      const orgId = doc.id;
      
      // Get user counts
      const usersSnapshot = await db.collection('users')
        .where('organizationId', '==', orgId)
        .get();
      
      const totalUsers = usersSnapshot.size;
      const activeUsers = usersSnapshot.docs.filter(
        d => d.data().status === 'active'
      ).length;
      const pendingUsers = usersSnapshot.docs.filter(
        d => d.data().status === 'pending' || d.data().status === 'pending_approval'
      ).length;
      
      // Get rent records for this organization
      let rentSnapshot;
      try {
        rentSnapshot = await db.collection('rent')
          .where('organizationId', '==', orgId)
          .get();
      } catch (error) {
        console.warn(`Error fetching rent for org ${orgId}:`, error.message);
        rentSnapshot = { size: 0, docs: [] };
      }
      
      const totalRentRecords = rentSnapshot.size;
      const activeRentRecords = rentSnapshot.docs.filter(
        d => d.data().status === 'active'
      ).length;
      const terminatedRentRecords = rentSnapshot.docs.filter(
        d => d.data().status === 'terminated'
      ).length;
      
      // Calculate total monthly rent from active records
      let totalMonthlyRent = 0;
      rentSnapshot.docs.forEach(rentDoc => {
        const rentData = rentDoc.data();
        if (rentData.status === 'active' && rentData.monthlyRent) {
          totalMonthlyRent += rentData.monthlyRent || 0;
        }
      });
      
      return {
        id: orgId,
        userCount: totalUsers,
        activeUserCount: activeUsers,
        pendingUserCount: pendingUsers,
        rentCount: totalRentRecords,
        activeRentCount: activeRentRecords,
        terminatedRentCount: terminatedRentRecords,
        totalMonthlyRent: totalMonthlyRent,
      };
    });
    
    const orgStats = await Promise.all(orgStatsPromises);
    const statsMap = {};
    orgStats.forEach(stat => {
      statsMap[stat.id] = stat;
    });
    
    snapshot.forEach(doc => {
      const orgId = doc.id;
      const stats = statsMap[orgId] || {};
      organizations.push({
        id: orgId,
        ...doc.data(),
        userCount: stats.userCount || 0,
        activeUserCount: stats.activeUserCount || 0,
        pendingUserCount: stats.pendingUserCount || 0,
        rentCount: stats.rentCount || 0,
        activeRentCount: stats.activeRentCount || 0,
        terminatedRentCount: stats.terminatedRentCount || 0,
        totalMonthlyRent: stats.totalMonthlyRent || 0,
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

// Update organization (Super Admin can update any, Org Admin can update their own)
router.put('/:organizationId', verifyTokenWithRBAC, checkOrganizationAccess, async (req, res) => {
  try {
    const { organizationId } = req.params;
    const userRole = req.user.role;
    
    // Super admin can update any organization, org admin can only update their own
    if (!userRole || (userRole.name !== 'super_admin' && userRole.name !== 'org_admin')) {
      return res.status(403).json({ error: 'Only administrators can update organizations' });
    }
    
    // Org admin can only update their own organization
    if (userRole.name === 'org_admin' && req.user.organizationId !== organizationId) {
      return res.status(403).json({ error: 'You can only update your own organization' });
    }
    
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

// Delete organization (Super Admin only)
router.delete('/:organizationId', verifyTokenWithRBAC, isSuperAdmin, async (req, res) => {
  try {
    const { organizationId } = req.params;
    
    // Check if organization exists
    const orgDoc = await db.collection('organizations').doc(organizationId).get();
    if (!orgDoc.exists) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // Check if organization has users (optional: prevent deletion if has users)
    const usersSnapshot = await db.collection('users')
      .where('organizationId', '==', organizationId)
      .limit(1)
      .get();
    
    if (!usersSnapshot.empty) {
      return res.status(400).json({ 
        error: 'Cannot delete organization with active users. Please remove all users first.' 
      });
    }
    
    // Delete organization
    await db.collection('organizations').doc(organizationId).delete();
    
    // Optionally delete associated roles
    const rolesSnapshot = await db.collection('roles')
      .where('organizationId', '==', organizationId)
      .get();
    
    const batch = db.batch();
    rolesSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    
    res.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({ error: 'Failed to delete organization' });
  }
});

// Get organization users (Super Admin can access any, Org Admin can access their own)
router.get('/:organizationId/users', verifyTokenWithRBAC, async (req, res) => {
  try {
    const { organizationId } = req.params;
    const userRole = req.user.role;
    const isSuperAdmin = userRole && userRole.name === 'super_admin';
    
    // Super admin can access any organization, org admin can only access their own
    if (!userRole || (!isSuperAdmin && userRole.name !== 'org_admin')) {
      return res.status(403).json({ error: 'Only administrators can view organization users' });
    }
    
    // Org admin can only view users in their own organization
    if (!isSuperAdmin && userRole.name === 'org_admin' && req.user.organizationId !== organizationId) {
      return res.status(403).json({ error: 'You can only view users in your own organization' });
    }
    
    // Try to get users with orderBy, if it fails (missing index), get without orderBy
    let snapshot;
    try {
      snapshot = await db.collection('users')
        .where('organizationId', '==', organizationId)
        .orderBy('displayName')
        .get();
    } catch (orderByError) {
      // If orderBy fails (likely missing index), fetch without orderBy and sort in memory
      console.warn('OrderBy failed, fetching without orderBy:', orderByError.message);
      snapshot = await db.collection('users')
        .where('organizationId', '==', organizationId)
        .get();
    }
    
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
    
    // Sort by displayName if we fetched without orderBy
    if (users.length > 0 && !users[0].displayName) {
      // If we couldn't use orderBy, sort in memory
      users.sort((a, b) => {
        const nameA = (a.displayName || a.email || '').toLowerCase();
        const nameB = (b.displayName || b.email || '').toLowerCase();
        return nameA.localeCompare(nameB);
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

// Update user role in organization (Super Admin can update any, Org Admin can update their own)
router.put('/:organizationId/users/:userId/role', verifyTokenWithRBAC, checkOrganizationAccess, async (req, res) => {
  try {
    const { organizationId, userId } = req.params;
    const { roleId } = req.body;
    const userRole = req.user.role;
    
    // Super admin can update any organization, org admin can only update their own
    if (!userRole || (userRole.name !== 'super_admin' && userRole.name !== 'org_admin')) {
      return res.status(403).json({ error: 'Only administrators can update user roles' });
    }
    
    // Org admin can only update users in their own organization
    if (userRole.name === 'org_admin' && req.user.organizationId !== organizationId) {
      return res.status(403).json({ error: 'You can only update users in your own organization' });
    }
    
    if (!roleId) {
      return res.status(400).json({ error: 'Role ID is required' });
    }
    
    // Verify user belongs to organization
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (userDoc.data().organizationId !== organizationId) {
      return res.status(400).json({ error: 'User does not belong to this organization' });
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

// Remove user from organization (Super Admin only)
router.delete('/:organizationId/users/:userId', verifyTokenWithRBAC, isSuperAdmin, async (req, res) => {
  try {
    const { organizationId, userId } = req.params;
    
    // Verify user exists and belongs to organization
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    if (userData.organizationId !== organizationId) {
      return res.status(400).json({ error: 'User does not belong to this organization' });
    }
    
    // Remove user from organization (set organizationId to null, keep user account)
    await db.collection('users').doc(userId).update({
      organizationId: null,
      roleId: null,
      status: 'pending',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: req.user.uid,
    });
    
    res.json({ message: 'User removed from organization successfully' });
  } catch (error) {
    console.error('Error removing user from organization:', error);
    res.status(500).json({ error: 'Failed to remove user from organization' });
  }
});

// Get organization roles
router.get('/:organizationId/roles', verifyTokenWithRBAC, async (req, res) => {
  try {
    const { organizationId } = req.params;
    const userRole = req.user.role;
    const isSuperAdmin = userRole && userRole.name === 'super_admin';
    
    // Super admin can access any organization, org admin can only access their own
    if (!userRole || (!isSuperAdmin && userRole.name !== 'org_admin')) {
      return res.status(403).json({ error: 'Only administrators can view organization roles' });
    }
    
    // Org admin can only view roles in their own organization
    if (!isSuperAdmin && userRole.name === 'org_admin' && req.user.organizationId !== organizationId) {
      return res.status(403).json({ error: 'You can only view roles in your own organization' });
    }
    
    // Try to get roles with orderBy, if it fails (missing index), get without orderBy
    let snapshot;
    try {
      snapshot = await db.collection('roles')
        .where('organizationId', '==', organizationId)
        .orderBy('level', 'desc')
        .get();
    } catch (orderByError) {
      // If orderBy fails (likely missing index), fetch without orderBy and sort in memory
      console.warn('OrderBy failed, fetching without orderBy:', orderByError.message);
      snapshot = await db.collection('roles')
        .where('organizationId', '==', organizationId)
        .get();
    }
    
    const roles = [];
    snapshot.forEach(doc => {
      roles.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Sort by level descending if we fetched without orderBy
    if (roles.length > 0) {
      roles.sort((a, b) => (b.level || 0) - (a.level || 0));
    }
    
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
