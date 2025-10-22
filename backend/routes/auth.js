const express = require('express');
const admin = require('firebase-admin');
const { verifyTokenWithRBAC, requireOrganization } = require('../middleware/rbac');
const { verifyToken } = require('../middleware/auth'); // Keep for backwards compatibility
const router = express.Router();

// Get user profile with RBAC data
router.get('/profile', verifyTokenWithRBAC, async (req, res) => {
  try {
    console.log('📋 Profile API called for user:', req.user.uid);
    console.log('🎭 User role data:', req.user.role);
    console.log('🔒 User permissions:', req.user.permissions);
    console.log('🏢 User organization:', req.user.organizationId);
    
    const profileResponse = { 
      profile: {
        uid: req.user.uid,
        email: req.user.email,
        ...req.user.profile,
        role: req.user.role,
        permissions: req.user.permissions,
        organizationId: req.user.organizationId,
        needsRoleAssignment: !req.user.organizationId || !req.user.role
      }
    };
    
    console.log('📤 Sending profile response:', JSON.stringify(profileResponse, null, 2));
    res.json(profileResponse);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { displayName, phoneNumber, address } = req.body;
    const db = admin.firestore();
    
    const updateData = {
      displayName,
      phoneNumber,
      address,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    await db.collection('users').doc(userId).update(updateData);
    
    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      profile: updateData 
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Verify token endpoint with RBAC
router.post('/verify', verifyTokenWithRBAC, (req, res) => {
  res.json({ 
    valid: true, 
    user: {
      uid: req.user.uid,
      email: req.user.email,
      name: req.user.profile?.displayName || req.user.name,
      role: req.user.role,
      permissions: req.user.permissions,
      organizationId: req.user.organizationId,
      needsRoleAssignment: !req.user.organizationId || !req.user.role
    }
  });
});

// Request access to organization (for new users)
router.post('/request-access', verifyTokenWithRBAC, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { organizationId, message } = req.body;
    const db = admin.firestore();
    
    // Check if user already has organization and role
    if (req.user.organizationId && req.user.role) {
      return res.json({ 
        message: 'User already has role assigned',
        role: req.user.role.displayName,
        organization: req.user.organizationId
      });
    }
    
    // If no organizationId provided, use default organization
    let targetOrgId = organizationId;
    if (!targetOrgId) {
      const orgSnapshot = await db.collection('organizations')
        .where('isDefault', '==', true)
        .limit(1)
        .get();
      
      if (orgSnapshot.empty) {
        return res.status(404).json({ error: 'No default organization found' });
      }
      
      targetOrgId = orgSnapshot.docs[0].id;
    }
    
    // Create access request
    const accessRequest = {
      userId: userId,
      userEmail: req.user.email,
      userName: req.user.profile?.displayName || req.user.name || req.user.email,
      organizationId: targetOrgId,
      message: message || '',
      status: 'pending',
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    await db.collection('accessRequests').add(accessRequest);
    
    // Update user status to pending
    await db.collection('users').doc(userId).update({
      status: 'pending_approval',
      pendingOrganizationId: targetOrgId,
      accessRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    res.json({ 
      success: true,
      message: 'Access request submitted successfully',
      status: 'pending_approval'
    });
    
  } catch (error) {
    console.error('Access request error:', error);
    res.status(500).json({ error: 'Failed to submit access request' });
  }
});

// Get pending access requests (org admins only)
router.get('/access-requests', verifyTokenWithRBAC, requireOrganization, async (req, res) => {
  try {
    console.log('🔍 Access requests API called');
    console.log('👤 User:', req.user.email);
    console.log('🎭 User role:', req.user.role);
    console.log('🏢 User organization:', req.user.organizationId);
    
    const userRole = req.user.role;
    
    // Only org admins and super admins can view access requests
    if (!userRole || !['org_admin', 'super_admin'].includes(userRole.name)) {
      console.log('❌ Access denied: User role not authorized');
      return res.status(403).json({ error: 'Only administrators can view access requests' });
    }
    
    const db = admin.firestore();
    const organizationId = req.user.organizationId;
    
    console.log('🔍 Querying access requests for organization:', organizationId);
    
    // Simplified query to avoid index issues
    let query = db.collection('accessRequests')
      .where('status', '==', 'pending');
    
    // For now, get all pending requests and filter in code to avoid index issues
    console.log('🔍 Executing query...');
    const snapshot = await query.get();
    console.log(`📊 Found ${snapshot.size} pending access requests total`);
    
    const requests = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('📋 Access request:', {
        id: doc.id,
        organizationId: data.organizationId,
        userEmail: data.userEmail,
        status: data.status
      });
      
      // Filter by organization for org admins
      if (userRole.name === 'super_admin' || data.organizationId === organizationId) {
        requests.push({
          id: doc.id,
          ...data,
          requestedAt: data.requestedAt?.toDate(),
        });
      }
    });
    
    console.log(`📊 Filtered requests for organization: ${requests.length}`);
    res.json({ requests });
  } catch (error) {
    console.error('❌ Error fetching access requests:', error);
    console.error('❌ Error details:', error.message);
    res.status(500).json({ error: 'Failed to fetch access requests' });
  }
});

// Approve/reject access request (org admins only)
router.post('/access-requests/:requestId/respond', verifyTokenWithRBAC, requireOrganization, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, roleId, message } = req.body; // action: 'approve' or 'reject'
    const userRole = req.user.role;
    
    // Only org admins and super admins can respond to requests
    if (!userRole || !['org_admin', 'super_admin'].includes(userRole.name)) {
      return res.status(403).json({ error: 'Only administrators can respond to access requests' });
    }
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }
    
    const db = admin.firestore();
    
    // Get the access request
    const requestDoc = await db.collection('accessRequests').doc(requestId).get();
    if (!requestDoc.exists) {
      return res.status(404).json({ error: 'Access request not found' });
    }
    
    const requestData = requestDoc.data();
    
    // Verify org admin can only handle their organization's requests
    if (userRole.name !== 'super_admin' && requestData.organizationId !== req.user.organizationId) {
      return res.status(403).json({ error: 'Can only respond to requests for your organization' });
    }
    
    const batch = db.batch();
    
    if (action === 'approve') {
      if (!roleId) {
        return res.status(400).json({ error: 'Role ID required for approval' });
      }
      
      // Verify role belongs to the organization
      const roleDoc = await db.collection('roles').doc(roleId).get();
      if (!roleDoc.exists || roleDoc.data().organizationId !== requestData.organizationId) {
        return res.status(400).json({ error: 'Invalid role for this organization' });
      }
      
      // Update user with organization and role
      const userRef = db.collection('users').doc(requestData.userId);
      batch.update(userRef, {
        organizationId: requestData.organizationId,
        roleId: roleId,
        status: 'active',
        approvedBy: req.user.uid,
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        pendingOrganizationId: admin.firestore.FieldValue.delete(),
      });
      
      // Update access request
      batch.update(requestDoc.ref, {
        status: 'approved',
        roleId: roleId,
        respondedBy: req.user.uid,
        respondedAt: admin.firestore.FieldValue.serverTimestamp(),
        responseMessage: message || '',
      });
      
      await batch.commit();
      
      res.json({ 
        success: true,
        message: 'Access request approved successfully',
        action: 'approved'
      });
      
    } else { // reject
      // Update access request
      batch.update(requestDoc.ref, {
        status: 'rejected',
        respondedBy: req.user.uid,
        respondedAt: admin.firestore.FieldValue.serverTimestamp(),
        responseMessage: message || '',
      });
      
      // Update user status
      const userRef = db.collection('users').doc(requestData.userId);
      batch.update(userRef, {
        status: 'rejected',
        rejectedBy: req.user.uid,
        rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        pendingOrganizationId: admin.firestore.FieldValue.delete(),
      });
      
      await batch.commit();
      
      res.json({ 
        success: true,
        message: 'Access request rejected',
        action: 'rejected'
      });
    }
    
  } catch (error) {
    console.error('Error responding to access request:', error);
    res.status(500).json({ error: 'Failed to respond to access request' });
  }
});

// Get available organizations for role assignment
router.get('/organizations', verifyTokenWithRBAC, async (req, res) => {
  try {
    const db = admin.firestore();
    
    const orgSnapshot = await db.collection('organizations')
      .where('status', '==', 'active')
      .get();
    
    const organizations = [];
    orgSnapshot.forEach(doc => {
      organizations.push({
        id: doc.id,
        name: doc.data().name,
        description: doc.data().description,
        isDefault: doc.data().isDefault || false
      });
    });
    
    res.json({ organizations });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Get available roles for an organization
router.get('/organizations/:orgId/roles', verifyTokenWithRBAC, async (req, res) => {
  try {
    const { orgId } = req.params;
    const db = admin.firestore();
    
    const rolesSnapshot = await db.collection('roles')
      .where('organizationId', '==', orgId)
      .orderBy('level', 'desc')
      .get();
    
    const roles = [];
    rolesSnapshot.forEach(doc => {
      const role = doc.data();
      // Don't show super_admin role unless user is already super_admin
      if (role.name !== 'super_admin' || (req.user.role && req.user.role.name === 'super_admin')) {
        roles.push({
          id: doc.id,
          name: role.displayName,
          description: role.description,
          level: role.level
        });
      }
    });
    
    res.json({ roles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

module.exports = router;
