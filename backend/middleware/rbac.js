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
          const rolePermissions = role.permissions || [];
          
          // If role document has no permissions, try to get from ROLE_PERMISSIONS by role name
          if (rolePermissions.length === 0 && role.name && ROLE_PERMISSIONS[role.name]) {
            console.log(`⚠️ Role document has no permissions, using fallback from ROLE_PERMISSIONS for ${role.name}`);
            permissions = [...permissions, ...ROLE_PERMISSIONS[role.name]];
          } else {
            permissions = [...permissions, ...rolePermissions];
          }
        } else {
          // Role document doesn't exist, try to find by name or use system role
          console.log(`⚠️ Role document ${userProfile.roleId} not found, trying to find by name`);
          const rolesByName = await db.collection('roles')
            .where('name', '==', userProfile.roleId)
            .limit(1)
            .get();
          
          if (!rolesByName.empty) {
            role = rolesByName.docs[0].data();
            const rolePermissions = role.permissions || [];
            if (rolePermissions.length === 0 && role.name && ROLE_PERMISSIONS[role.name]) {
              permissions = [...permissions, ...ROLE_PERMISSIONS[role.name]];
            } else {
              permissions = [...permissions, ...rolePermissions];
            }
          } else if (ROLE_PERMISSIONS[userProfile.roleId]) {
            // Use system role definition as fallback
            console.log(`✅ Using system role definition for ${userProfile.roleId}`);
            role = {
              name: userProfile.roleId,
              displayName: userProfile.roleId === 'property_manager' ? 'Property Manager' : 
                          userProfile.roleId === 'org_admin' ? 'Organization Administrator' :
                          userProfile.roleId === 'financial_viewer' ? 'Financial Viewer' : userProfile.roleId,
              level: userProfile.roleId === 'property_manager' ? 6 :
                     userProfile.roleId === 'org_admin' ? 9 :
                     userProfile.roleId === 'financial_viewer' ? 4 : 5,
              isSystemRole: true,
            };
            permissions = [...permissions, ...ROLE_PERMISSIONS[userProfile.roleId]];
          }
        }
      }
      
      // Fallback: Check if user has roleId that matches 'super_admin' name pattern
      // or if roleId is stored as string 'super_admin'
      if (!role && userProfile.roleId === 'super_admin') {
        // Try to find super_admin role by name
        const rolesSnapshot = await db.collection('roles')
          .where('name', '==', 'super_admin')
          .limit(1)
          .get();
        
        if (!rolesSnapshot.empty) {
          role = rolesSnapshot.docs[0].data();
          permissions = [...permissions, ...(role.permissions || [])];
        } else {
          // If no role document found but roleId is 'super_admin', create role object
          role = {
            name: 'super_admin',
            displayName: 'Super Administrator',
            level: 10,
            isSystemRole: true,
          };
          // Super admin has all permissions
          permissions = ROLE_PERMISSIONS.super_admin || [];
        }
      }
      
      // Get organizationId from userProfile, with fallback to profile.organizationId
      const organizationId = userProfile.organizationId || userProfile.profile?.organizationId || null;
      
      console.log('🔍 User authentication:', {
        uid: decodedToken.uid,
        email: decodedToken.email,
        organizationId: organizationId,
        hasRole: !!role,
        roleName: role?.name,
        permissionsCount: permissions.length
      });
      
      req.user = {
        ...decodedToken,
        uid: decodedToken.uid,
        email: decodedToken.email,
        profile: userProfile,
        role: role,
        permissions: [...new Set(permissions)], // Remove duplicates
        organizationId: organizationId,
      };
    }
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Helper function to check if user is super admin
const isUserSuperAdmin = (user) => {
  if (!user) return false;
  
  // Check by role name
  if (user.role && user.role.name === 'super_admin') {
    return true;
  }
  
  // Check by roleId in profile
  if (user.profile && user.profile.roleId === 'super_admin') {
    return true;
  }
  
  // Check if user has super admin permissions (all permissions)
  if (user.permissions && Array.isArray(user.permissions)) {
    // Super admin typically has a very large number of permissions
    // or has specific super admin permissions
    const superAdminPermissions = user.permissions.filter(p => 
      p.includes('super_admin') || p.includes(':all')
    );
    if (superAdminPermissions.length > 10) {
      return true;
    }
  }
  
  return false;
};

// Check if user has specific permission (with hierarchical support)
const hasPermission = (userPermissions, requiredPermission) => {
  if (!userPermissions || !Array.isArray(userPermissions)) {
    return false;
  }
  
  // Direct match
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }
  
  // Check for hierarchical permissions (e.g., properties:read:all covers properties:read:organization)
  const parts = requiredPermission.split(':');
  if (parts.length >= 2) {
    // Check for :all permission at the same resource level (e.g., properties:read:all)
    const allPermission = `${parts[0]}:${parts[1]}:all`;
    if (userPermissions.includes(allPermission)) {
      return true;
    }
  }
  
  return false;
};

// Check if user has any of the required permissions
const hasAnyPermission = (userPermissions, requiredPermissions) => {
  if (!userPermissions || !Array.isArray(userPermissions)) {
    return false;
  }
  
  return requiredPermissions.some(permission => hasPermission(userPermissions, permission));
};

// Permission checking middleware
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Super admins can bypass organization requirement
    const isSuperAdmin = isUserSuperAdmin(req.user);
    
    // Check organizationId from multiple possible locations
    const organizationId = req.user.organizationId || req.user.profile?.organizationId || null;
    
    if (!organizationId && !isSuperAdmin) {
      return res.status(403).json({ 
        error: 'Organization membership required',
        message: 'User not assigned to organization. Please contact your administrator to be added to an organization.',
        code: 'NO_ORGANIZATION'
      });
    }
    
    // Update req.user.organizationId if it was found in profile
    if (!req.user.organizationId && organizationId) {
      req.user.organizationId = organizationId;
    }
    
    // Super admins have all permissions, skip permission check
    if (isSuperAdmin) {
      return next();
    }
    
    if (!hasPermission(req.user.permissions, permission)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `You do not have the required permission: ${permission}`,
        required: permission,
        userPermissions: req.user.permissions,
        code: 'INSUFFICIENT_PERMISSIONS'
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
    
    // Super admins can bypass organization requirement
    const isSuperAdmin = isUserSuperAdmin(req.user);
    
    // Check organizationId from multiple possible locations
    const organizationId = req.user.organizationId || req.user.profile?.organizationId || null;
    
    if (!organizationId && !isSuperAdmin) {
      return res.status(403).json({ 
        error: 'Organization membership required',
        message: 'User not assigned to organization. Please contact your administrator to be added to an organization.',
        code: 'NO_ORGANIZATION'
      });
    }
    
    // Update req.user.organizationId if it was found in profile
    if (!req.user.organizationId && organizationId) {
      req.user.organizationId = organizationId;
    }
    
    // Super admins have all permissions, skip permission check
    if (isSuperAdmin) {
      return next();
    }
    
    if (!hasAnyPermission(req.user.permissions, permissions)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `You do not have any of the required permissions: ${permissions.join(', ')}`,
        required: permissions,
        userPermissions: req.user.permissions,
        code: 'INSUFFICIENT_PERMISSIONS'
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
    
    // Super admin can access any organization (check by role first, then permission)
    const isSuperAdmin = isUserSuperAdmin(req.user);
    if (isSuperAdmin || hasPermission(req.user.permissions, 'organizations:read:all')) {
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
    
    // Property manager or caretaker
    if (hasPermission(req.user.permissions, 'properties:read:assigned')) {
      // Check organization match first
      if (property.organizationId !== req.user.organizationId) {
        return res.status(403).json({ error: 'Access denied to this property' });
      }
      
      // For READ operations: can view all organization properties
      const method = req.method;
      const isReadOperation = method === 'GET';
      
      if (isReadOperation) {
        req.property = property;
        return next();
      }
      
      // For WRITE operations (PUT, DELETE): can only manage assigned properties
      const isAssigned = property.assignedManagers?.includes(req.user.uid) || 
                        property.caretakerId === req.user.uid;
      
      if (!isAssigned) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'You can only manage properties assigned to you. You can view all organization properties, but modifications are restricted to your assigned properties.'
        });
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
// NOTE: For property managers, this returns ALL organization properties for READ access
// Write access (create/update/delete) is still restricted to assigned properties via checkPropertyAccess
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
  
  // Property manager/caretaker can VIEW all properties in their organization
  // But can only MANAGE (create/update/delete) assigned properties
  if (hasPermission(permissions, 'properties:read:assigned')) {
    // Return all organization properties for viewing
    return await db.collection('properties')
      .where('organizationId', '==', organizationId)
      .get();
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
  
  if (!isUserSuperAdmin(req.user)) {
    return res.status(403).json({ error: 'Super administrator access required' });
  }
  
  next();
};

// Middleware to ensure user belongs to an organization
const requireOrganization = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Super admins can bypass organization requirement
  const isSuperAdmin = isUserSuperAdmin(req.user);
  
  // Check organizationId from multiple possible locations
  const organizationId = req.user.organizationId || req.user.profile?.organizationId || null;
  
  console.log('🔍 requireOrganization check:', {
    uid: req.user.uid,
    email: req.user.email,
    organizationId: organizationId,
    reqUserOrganizationId: req.user.organizationId,
    profileOrganizationId: req.user.profile?.organizationId,
    isSuperAdmin: isSuperAdmin,
    hasRole: !!req.user.role
  });
  
  if (!organizationId && !isSuperAdmin) {
    console.error('❌ Organization check failed:', {
      uid: req.user.uid,
      email: req.user.email,
      organizationId: organizationId,
      profile: req.user.profile
    });
    return res.status(403).json({ 
      error: 'Organization membership required',
      message: 'User not assigned to organization. Please contact your administrator to be added to an organization.',
      code: 'NO_ORGANIZATION',
      debug: {
        uid: req.user.uid,
        email: req.user.email,
        organizationId: organizationId,
        hasRole: !!req.user.role,
        hasPermissions: (req.user.permissions || []).length > 0,
        profileOrganizationId: req.user.profile?.organizationId
      }
    });
  }
  
  // Update req.user.organizationId if it was found in profile
  if (!req.user.organizationId && organizationId) {
    req.user.organizationId = organizationId;
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

