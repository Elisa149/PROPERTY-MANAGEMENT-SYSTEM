const express = require('express');
const admin = require('firebase-admin');
const { userProfileSchema } = require('../models/rbac-schemas');
const { 
  verifyTokenWithRBAC, 
  requirePermission, 
  isSuperAdmin,
  requireOrganization 
} = require('../middleware/rbac');

const router = express.Router();

// Use the already initialized Firebase app
const db = admin.firestore();

// Admin dashboard statistics endpoint
router.get('/admin/dashboard/stats', verifyTokenWithRBAC, requireOrganization, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const userRole = req.user.role;
    
    // Only org admins and super admins can view admin dashboard
    if (!userRole || !['org_admin', 'super_admin'].includes(userRole.name)) {
      return res.status(403).json({ error: 'Only administrators can access admin dashboard' });
    }
    
    // Get all properties in organization
    const propertiesSnapshot = await db.collection('properties')
      .where('organizationId', '==', organizationId)
      .get();
    
    const properties = [];
    let totalSpaces = 0;
    let occupiedSpaces = 0;
    
    propertiesSnapshot.forEach(doc => {
      const property = doc.data();
      properties.push({ id: doc.id, ...property });
      
      // Calculate spaces
      if (property.type === 'building' && property.buildingDetails?.floors) {
        property.buildingDetails.floors.forEach(floor => {
          const spaces = floor.spaces || [];
          totalSpaces += spaces.length;
          occupiedSpaces += spaces.filter(s => s.status === 'occupied').length;
        });
      } else if (property.type === 'land' && property.landDetails?.squatters) {
        totalSpaces += property.landDetails.squatters.length;
        occupiedSpaces += property.landDetails.squatters.filter(s => s.status === 'active').length;
      }
    });
    
    // Get all users in organization
    const usersSnapshot = await db.collection('users')
      .where('organizationId', '==', organizationId)
      .get();
    
    const activeUsers = usersSnapshot.docs.filter(doc => doc.data().status === 'active').length;
    
    // Get pending access requests
    const accessRequestsSnapshot = await db.collection('accessRequests')
      .where('organizationId', '==', organizationId)
      .where('status', '==', 'pending')
      .get();
    
    const pendingApprovals = accessRequestsSnapshot.size;
    
    // Get all payments for the organization
    const paymentsSnapshot = await db.collection('payments')
      .where('organizationId', '==', organizationId)
      .get();
    
    let totalRevenue = 0;
    let currentMonthRevenue = 0;
    let previousMonthRevenue = 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    paymentsSnapshot.forEach(doc => {
      const payment = doc.data();
      const amount = (payment.amount || 0) + (payment.lateFee || 0);
      totalRevenue += amount;
      
      const paymentDate = payment.paymentDate?.toDate() || new Date();
      const paymentMonth = paymentDate.getMonth();
      const paymentYear = paymentDate.getFullYear();
      
      if (paymentMonth === currentMonth && paymentYear === currentYear) {
        currentMonthRevenue += amount;
      }
      if (paymentMonth === previousMonth && paymentYear === previousYear) {
        previousMonthRevenue += amount;
      }
    });
    
    // Calculate monthly growth
    const monthlyGrowth = previousMonthRevenue > 0
      ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
      : currentMonthRevenue > 0 ? 100 : 0;
    
    // Calculate occupancy rate
    const occupancyRate = totalSpaces > 0 ? (occupiedSpaces / totalSpaces) * 100 : 0;
    
    // Get rent agreements for collection rate
    const rentSnapshot = await db.collection('rent')
      .where('organizationId', '==', organizationId)
      .where('status', '==', 'active')
      .get();
    
    let expectedMonthlyRent = 0;
    rentSnapshot.forEach(doc => {
      const rent = doc.data();
      expectedMonthlyRent += rent.monthlyRent || 0;
    });
    
    const collectionRate = expectedMonthlyRent > 0
      ? (currentMonthRevenue / expectedMonthlyRent) * 100
      : 0;
    
    // Get top performing properties
    const propertyRevenue = {};
    paymentsSnapshot.forEach(doc => {
      const payment = doc.data();
      const propertyId = payment.propertyId;
      if (!propertyRevenue[propertyId]) {
        propertyRevenue[propertyId] = 0;
      }
      propertyRevenue[propertyId] += (payment.amount || 0) + (payment.lateFee || 0);
    });
    
    const topProperties = properties
      .map(property => {
        let spaces = 0;
        let occupied = 0;
        
        if (property.type === 'building' && property.buildingDetails?.floors) {
          property.buildingDetails.floors.forEach(floor => {
            const floorSpaces = floor.spaces || [];
            spaces += floorSpaces.length;
            occupied += floorSpaces.filter(s => s.status === 'occupied').length;
          });
        } else if (property.type === 'land' && property.landDetails?.squatters) {
          spaces = property.landDetails.squatters.length;
          occupied = property.landDetails.squatters.filter(s => s.status === 'active').length;
        }
        
        return {
          id: property.id,
          name: property.name,
          revenue: propertyRevenue[property.id] || 0,
          occupancy: spaces > 0 ? Math.round((occupied / spaces) * 100) : 0,
          trend: 'stable'
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    
    // Get recent activities (payments and user registrations)
    const recentPayments = [];
    paymentsSnapshot.forEach(doc => {
      const payment = doc.data();
      recentPayments.push({
        id: doc.id,
        type: 'payment',
        amount: payment.amount,
        propertyName: properties.find(p => p.id === payment.propertyId)?.name || 'Unknown Property',
        timestamp: payment.paymentDate?.toDate() || payment.createdAt?.toDate() || new Date(),
        status: 'success'
      });
    });
    
    const recentUsers = [];
    usersSnapshot.forEach(doc => {
      const user = doc.data();
      recentUsers.push({
        id: doc.id,
        type: 'user',
        userName: user.displayName,
        timestamp: user.createdAt?.toDate() || new Date(),
        status: user.status === 'active' ? 'success' : 'pending'
      });
    });
    
    const recentActivities = [...recentPayments, ...recentUsers]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)
      .map(activity => ({
        ...activity,
        message: activity.type === 'payment'
          ? `Payment received from ${activity.propertyName}`
          : `New user registration: ${activity.userName}`,
        time: formatTimeAgo(activity.timestamp)
      }));
    
    // Get pending access requests details
    const pendingApprovalsDetails = [];
    accessRequestsSnapshot.forEach(doc => {
      const request = doc.data();
      pendingApprovalsDetails.push({
        id: doc.id,
        userName: request.displayName,
        email: request.userEmail,
        requestedRole: request.requestedRoleName || 'Unknown',
        requestDate: request.requestedAt?.toDate() || new Date(),
        message: request.message || 'No message provided'
      });
    });
    
    res.json({
      stats: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        monthlyGrowth: Math.round(monthlyGrowth * 100) / 100,
        totalProperties: properties.length,
        activeUsers,
        pendingApprovals,
        collectionRate: Math.round(collectionRate * 100) / 100,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
      },
      topProperties,
      recentActivities,
      pendingApprovals: pendingApprovalsDetails.slice(0, 5),
    });
  } catch (error) {
    console.error('Admin dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get admin dashboard statistics' });
  }
});

// Helper function to format time ago
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString();
}

// User management routes with RBAC

// Get all users in organization (Admin only)
router.get('/', verifyTokenWithRBAC, requireOrganization, requirePermission('users:read:organization'), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    
    const usersSnapshot = await db.collection('users')
      .where('organizationId', '==', organizationId)
      .get();
    
    const users = [];
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      
      // Get role information
      let role = null;
      if (userData.roleId) {
        const roleDoc = await db.collection('roles').doc(userData.roleId).get();
        if (roleDoc.exists) {
          role = { id: roleDoc.id, ...roleDoc.data() };
        }
      }
      
      users.push({
        id: doc.id,
        uid: doc.id,
        email: userData.email,
        displayName: userData.displayName,
        phone: userData.phone,
        organizationId: userData.organizationId,
        roleId: userData.roleId,
        role: role,
        status: userData.status,
        createdAt: userData.createdAt?.toDate(),
        lastLoginAt: userData.lastLoginAt?.toDate(),
      });
    }
    
    // Sort by lastLoginAt descending
    users.sort((a, b) => {
      const dateA = new Date(a.lastLoginAt || a.createdAt || 0);
      const dateB = new Date(b.lastLoginAt || b.createdAt || 0);
      return dateB - dateA;
    });
    
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get current user profile
router.get('/profile', verifyTokenWithRBAC, async (req, res) => {
  try {
    res.json({ 
      user: {
        uid: req.user.uid,
        email: req.user.email,
        ...req.user.profile,
        role: req.user.role,
        permissions: req.user.permissions
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update current user profile
router.put('/profile', verifyTokenWithRBAC, async (req, res) => {
  try {
    const allowedFields = [
      'displayName', 'firstName', 'lastName', 'phone', 'avatar', 'preferences'
    ];
    
    const updateData = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updateData[key] = req.body[key];
      }
    });
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    await db.collection('users').doc(req.user.uid).update(updateData);
    
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Accept invitation and join organization
router.post('/accept-invitation', verifyTokenWithRBAC, async (req, res) => {
  try {
    const { invitationId } = req.body;
    
    if (!invitationId) {
      return res.status(400).json({ error: 'Invitation ID is required' });
    }
    
    // Get invitation
    const invitationDoc = await db.collection('invitations').doc(invitationId).get();
    if (!invitationDoc.exists) {
      return res.status(404).json({ error: 'Invitation not found' });
    }
    
    const invitation = invitationDoc.data();
    
    // Check if invitation is for this user
    if (invitation.email.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({ error: 'Invitation not for this user' });
    }
    
    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'Invitation is no longer valid' });
    }
    
    if (new Date(invitation.expiresAt.toDate()) < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }
    
    // Check if user already belongs to an organization
    if (req.user.profile.organizationId) {
      return res.status(400).json({ error: 'User already belongs to an organization' });
    }
    
    // Update user profile with organization and role
    await db.collection('users').doc(req.user.uid).update({
      organizationId: invitation.organizationId,
      roleId: invitation.roleId,
      status: 'active',
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Mark invitation as accepted
    await db.collection('invitations').doc(invitationId).update({
      status: 'accepted',
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    res.json({ message: 'Invitation accepted successfully' });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// Get user's invitations
router.get('/invitations', verifyTokenWithRBAC, async (req, res) => {
  try {
    const snapshot = await db.collection('invitations')
      .where('email', '==', req.user.email.toLowerCase())
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();
    
    const invitations = [];
    
    for (const doc of snapshot.docs) {
      const invitationData = doc.data();
      
      // Get organization details
      const orgDoc = await db.collection('organizations').doc(invitationData.organizationId).get();
      const organization = orgDoc.exists ? orgDoc.data() : null;
      
      // Get role details
      const roleDoc = await db.collection('roles').doc(invitationData.roleId).get();
      const role = roleDoc.exists ? roleDoc.data() : null;
      
      invitations.push({
        id: doc.id,
        ...invitationData,
        organization,
        role
      });
    }
    
    res.json({ invitations });
  } catch (error) {
    console.error('Error fetching user invitations:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// Get all users (Super Admin only)
router.get('/', verifyTokenWithRBAC, isSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, organizationId } = req.query;
    
    let query = db.collection('users').orderBy('displayName');
    
    if (organizationId) {
      query = query.where('organizationId', '==', organizationId);
    }
    
    const snapshot = await query.limit(parseInt(limit)).get();
    
    const users = [];
    for (const doc of snapshot.docs) {
      const userData = doc.data();
      
      // Get role and organization info
      let role = null;
      let organization = null;
      
      if (userData.roleId) {
        const roleDoc = await db.collection('roles').doc(userData.roleId).get();
        if (roleDoc.exists) {
          role = roleDoc.data();
        }
      }
      
      if (userData.organizationId) {
        const orgDoc = await db.collection('organizations').doc(userData.organizationId).get();
        if (orgDoc.exists) {
          organization = { id: orgDoc.id, name: orgDoc.data().name };
        }
      }
      
      users.push({
        id: doc.id,
        ...userData,
        role,
        organization
      });
    }
    
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user's role (Org Admin only) - Enhanced role management
router.put('/:userId/role', verifyTokenWithRBAC, requireOrganization, requirePermission('users:update:organization'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;
    
    if (!roleId) {
      return res.status(400).json({ error: 'Role ID is required' });
    }
    
    // Verify user exists and belongs to same organization
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    if (userData.organizationId !== req.user.organizationId) {
      return res.status(403).json({ error: 'User not in your organization' });
    }
    
    // Verify role exists and belongs to same organization
    const roleDoc = await db.collection('roles').doc(roleId).get();
    if (!roleDoc.exists) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    const roleData = roleDoc.data();
    if (roleData.organizationId !== req.user.organizationId) {
      return res.status(403).json({ error: 'Role not in your organization' });
    }
    
    // Update user's role
    await db.collection('users').doc(userId).update({
      roleId: roleId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    res.json({ 
      message: 'User role updated successfully',
      user: {
        id: userId,
        roleId: roleId
      }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Assign properties to user (Property Manager/Caretaker)
router.post('/:userId/assign-properties', verifyTokenWithRBAC, requireOrganization, requirePermission('users:update:organization'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { propertyIds, role } = req.body; // role: 'manager' or 'caretaker'
    
    if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
      return res.status(400).json({ error: 'Property IDs are required' });
    }
    
    if (!['manager', 'caretaker'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "manager" or "caretaker"' });
    }
    
    // Verify user exists and belongs to same organization
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    if (userData.organizationId !== req.user.organizationId) {
      return res.status(403).json({ error: 'User not in your organization' });
    }
    
    // Update properties with user assignment
    const batch = db.batch();
    
    for (const propertyId of propertyIds) {
      const propertyRef = db.collection('properties').doc(propertyId);
      const propertyDoc = await propertyRef.get();
      
      if (!propertyDoc.exists) {
        return res.status(404).json({ error: `Property ${propertyId} not found` });
      }
      
      const propertyData = propertyDoc.data();
      if (propertyData.organizationId !== req.user.organizationId) {
        return res.status(403).json({ error: `Property ${propertyId} not in your organization` });
      }
      
      if (role === 'manager') {
        const assignedManagers = propertyData.assignedManagers || [];
        if (!assignedManagers.includes(userId)) {
          assignedManagers.push(userId);
          batch.update(propertyRef, { 
            assignedManagers,
            updatedAt: admin.firestore.FieldValue.serverTimestamp() 
          });
        }
      } else if (role === 'caretaker') {
        batch.update(propertyRef, { 
          caretakerId: userId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp() 
        });
      }
    }
    
    // Update user's assigned properties list
    const currentAssignedProperties = userData.assignedProperties || [];
    const newAssignedProperties = [...new Set([...currentAssignedProperties, ...propertyIds])];
    
    batch.update(db.collection('users').doc(userId), {
      assignedProperties: newAssignedProperties,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    await batch.commit();
    
    res.json({ message: `Properties assigned to user as ${role} successfully` });
  } catch (error) {
    console.error('Error assigning properties to user:', error);
    res.status(500).json({ error: 'Failed to assign properties' });
  }
});

// Remove property assignments from user
router.delete('/:userId/assignments/:propertyId', verifyTokenWithRBAC, requireOrganization, requirePermission('users:update:organization'), async (req, res) => {
  try {
    const { userId, propertyId } = req.params;
    
    // Verify user exists and belongs to same organization
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    if (userData.organizationId !== req.user.organizationId) {
      return res.status(403).json({ error: 'User not in your organization' });
    }
    
    // Update property to remove user assignment
    const propertyRef = db.collection('properties').doc(propertyId);
    const propertyDoc = await propertyRef.get();
    
    if (!propertyDoc.exists) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    const propertyData = propertyDoc.data();
    if (propertyData.organizationId !== req.user.organizationId) {
      return res.status(403).json({ error: 'Property not in your organization' });
    }
    
    const batch = db.batch();
    
    // Remove from property assignments
    const assignedManagers = (propertyData.assignedManagers || []).filter(id => id !== userId);
    const updateData = { 
      assignedManagers,
      updatedAt: admin.firestore.FieldValue.serverTimestamp() 
    };
    
    if (propertyData.caretakerId === userId) {
      updateData.caretakerId = '';
    }
    
    batch.update(propertyRef, updateData);
    
    // Remove from user's assigned properties
    const assignedProperties = (userData.assignedProperties || []).filter(id => id !== propertyId);
    batch.update(db.collection('users').doc(userId), {
      assignedProperties,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    await batch.commit();
    
    res.json({ message: 'Property assignment removed successfully' });
  } catch (error) {
    console.error('Error removing property assignment:', error);
    res.status(500).json({ error: 'Failed to remove property assignment' });
  }
});

module.exports = router;
