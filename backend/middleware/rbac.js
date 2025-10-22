const admin = require('firebase-admin');
const { ROLE_PERMISSIONS } = require('../models/rbac-schemas');

// Enhanced authentication middleware with RBAC
const verifyTokenWithRBAC = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Get user profile with RBAC data
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      // First-time user - create basic profile
      const newUser = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name || decodedToken.email,
        organizationId: null, // Will be set when user joins/is invited to organization
        roleId: null,
        permissions: [],
        status: 'pending', // Pending until assigned to organization
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      await db.collection('users').doc(decodedToken.uid).set(newUser);
      
      req.user = {
        ...decodedToken,
        profile: newUser,
        role: null,
        permissions: [],
        organizationId: null,
      };
    } else {
      const userProfile = userDoc.data();
      
      // Update last login
      await db.collection('users').doc(decodedToken.uid).update({
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      // Get user's role information
      let role = null;
      let permissions = userProfile.permissions || [];
      
      if (userProfile.roleId) {
        const roleDoc = await db.collection('roles').doc(userProfile.roleId).get();
        if (roleDoc.exists) {
          role = roleDoc.data();
          permissions = [...permissions, ...(role.permissions || [])];
        }
      }
      
      req.user = {
        ...decodedToken,
        profile: userProfile,
        role: role,
        permissions: [...new Set(permissions)], // Remove duplicates
        organizationId: userProfile.organizationId,
      };
    }
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Check if user has specific permission
const hasPermission = (userPermissions, requiredPermission) => {
  if (!userPermissions || !Array.isArray(userPermissions)) {
    return false;
  }
  
  return userPermissions.includes(requiredPermission);
};

// Check if user has any of the required permissions
const hasAnyPermission = (userPermissions, requiredPermissions) => {
  if (!userPermissions || !Array.isArray(userPermissions)) {
    return false;
  }
  
  return requiredPermissions.some(permission => userPermissions.includes(permission));
};

// Permission checking middleware
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!req.user.organizationId && !permission.includes('super_admin')) {
      return res.status(403).json({ error: 'User not assigned to organization' });
    }
    
    if (!hasPermission(req.user.permissions, permission)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permission,
        userPermissions: req.user.permissions 
      });
    }
    
    next();
  };
};

// Multiple permissions (user needs ANY of them)
const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!req.user.organizationId && !permissions.some(p => p.includes('super_admin'))) {
      return res.status(403).json({ error: 'User not assigned to organization' });
    }
    
    if (!hasAnyPermission(req.user.permissions, permissions)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permissions,
        userPermissions: req.user.permissions 
      });
    }
    
    next();
  };
};

// Check if user can access specific organization
const checkOrganizationAccess = async (req, res, next) => {
  try {
    const { organizationId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Super admin can access any organization
    if (hasPermission(req.user.permissions, 'organizations:read:all')) {
      return next();
    }
    
    // User can only access their own organization
    if (req.user.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }
    
    next();
  } catch (error) {
    console.error('Organization access check error:', error);
    return res.status(500).json({ error: 'Failed to verify organization access' });
  }
};

// Check if user can access specific property
const checkPropertyAccess = async (req, res, next) => {
  try {
    const propertyId = req.params.id || req.params.propertyId; // Support both :id and :propertyId
    const db = admin.firestore();
    
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!propertyId) {
      return res.status(400).json({ error: 'Property ID is required' });
    }
    
    // Get property details
    const propertyDoc = await db.collection('properties').doc(propertyId).get();
    
    if (!propertyDoc.exists) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    const property = propertyDoc.data();
    
    // Super admin or org admin can access any property in their scope
    if (hasPermission(req.user.permissions, 'properties:read:organization')) {
      // Check organization match
      if (property.organizationId !== req.user.organizationId) {
        return res.status(403).json({ error: 'Access denied to this property' });
      }
      req.property = property;
      return next();
    }
    
    // Property manager or caretaker can access assigned properties
    if (hasPermission(req.user.permissions, 'properties:read:assigned')) {
      const isAssigned = property.assignedManagers?.includes(req.user.uid) || 
                        property.caretakerId === req.user.uid;
      
      if (!isAssigned) {
        return res.status(403).json({ error: 'Property not assigned to you' });
      }
      
      req.property = property;
      return next();
    }
    
    // Tenant can access their own rental property
    if (hasPermission(req.user.permissions, 'properties:read:own')) {
      // Check if user is a tenant of this property (would need to check rental records)
      // This is a simplified check - in practice, you'd check the rental/lease records
      req.property = property;
      return next();
    }
    
    return res.status(403).json({ error: 'Insufficient permissions to access this property' });
    
  } catch (error) {
    console.error('Property access check error:', error);
    return res.status(500).json({ error: 'Failed to verify property access' });
  }
};

// Filter properties based on user permissions and scope
const filterPropertiesByAccess = async (userId, organizationId, permissions) => {
  const db = admin.firestore();
  
  // Super admin sees all properties (across all organizations)
  if (hasPermission(permissions, 'properties:read:all')) {
    return await db.collection('properties').get();
  }
  
  // Organization admin sees all properties in their organization
  if (hasPermission(permissions, 'properties:read:organization')) {
    return await db.collection('properties')
      .where('organizationId', '==', organizationId)
      .get();
  }
  
  // Property manager/caretaker sees only assigned properties
  if (hasPermission(permissions, 'properties:read:assigned')) {
    const assignedAsManager = await db.collection('properties')
      .where('organizationId', '==', organizationId)
      .where('assignedManagers', 'array-contains', userId)
      .get();
    
    const assignedAsCaretaker = await db.collection('properties')
      .where('organizationId', '==', organizationId)
      .where('caretakerId', '==', userId)
      .get();
    
    // Combine results
    const allDocs = [...assignedAsManager.docs, ...assignedAsCaretaker.docs];
    const uniqueDocs = allDocs.filter((doc, index, self) => 
      index === self.findIndex(d => d.id === doc.id)
    );
    
    return { docs: uniqueDocs };
  }
  
  // Tenant sees only their rental properties (simplified - would check rental records)
  if (hasPermission(permissions, 'properties:read:own')) {
    // In practice, you'd join with rental records to find properties where user is tenant
    return { docs: [] }; // Placeholder
  }
  
  return { docs: [] };
};

// Check if user is organization admin
const isOrganizationAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!req.user.role || req.user.role.name !== 'org_admin') {
    return res.status(403).json({ error: 'Organization administrator access required' });
  }
  
  next();
};

// Check if user is super admin
const isSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!req.user.role || req.user.role.name !== 'super_admin') {
    return res.status(403).json({ error: 'Super administrator access required' });
  }
  
  next();
};

// Middleware to ensure user belongs to an organization
const requireOrganization = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!req.user.organizationId) {
    return res.status(403).json({ 
      error: 'Organization membership required',
      message: 'Contact your administrator to be added to an organization'
    });
  }
  
  next();
};

module.exports = {
  verifyTokenWithRBAC,
  hasPermission,
  hasAnyPermission,
  requirePermission,
  requireAnyPermission,
  checkOrganizationAccess,
  checkPropertyAccess,
  filterPropertiesByAccess,
  isOrganizationAdmin,
  isSuperAdmin,
  requireOrganization,
};

