const Joi = require('joi');

// Organization Schema
const organizationSchema = Joi.object({
  name: Joi.string().required().min(2).max(100),
  description: Joi.string().allow('').max(500),
  settings: Joi.object({
    timezone: Joi.string().default('UTC'),
    currency: Joi.string().default('UGX'),
    dateFormat: Joi.string().default('DD/MM/YYYY'),
    allowGoogleAuth: Joi.boolean().default(true),
    allowEmailAuth: Joi.boolean().default(true),
  }).default({}),
  contact: Joi.object({
    email: Joi.string().email().allow(''),
    phone: Joi.string().allow(''),
    address: Joi.string().allow('').max(200),
  }).default({}),
  status: Joi.string().valid('active', 'inactive', 'suspended').default('active'),
});

// Role Schema
const roleSchema = Joi.object({
  name: Joi.string().required().min(2).max(50), // e.g., 'property_manager'
  displayName: Joi.string().required().min(2).max(100), // e.g., 'Property Manager'
  description: Joi.string().allow('').max(500),
  permissions: Joi.array().items(Joi.string()).required(),
  organizationId: Joi.string().required(),
  isSystemRole: Joi.boolean().default(false), // System roles can't be deleted
  isDefault: Joi.boolean().default(false), // Default role for new users
  level: Joi.number().integer().min(1).max(10).default(5), // Role hierarchy level
});

// User Profile Schema (extended)
const userProfileSchema = Joi.object({
  email: Joi.string().email().required(),
  displayName: Joi.string().required().min(2).max(100),
  firstName: Joi.string().allow('').max(50),
  lastName: Joi.string().allow('').max(50),
  phone: Joi.string().allow('').max(20),
  avatar: Joi.string().uri().allow(''),
  
  // RBAC fields
  organizationId: Joi.string().required(),
  roleId: Joi.string().required(),
  permissions: Joi.array().items(Joi.string()).default([]), // Additional permissions
  assignedProperties: Joi.array().items(Joi.string()).default([]), // For property managers
  
  // Status and metadata
  status: Joi.string().valid('active', 'inactive', 'pending', 'suspended').default('pending'),
  lastLoginAt: Joi.date().allow(null),
  invitedBy: Joi.string().allow(''), // User ID who invited this user
  invitedAt: Joi.date().allow(null),
  joinedAt: Joi.date().allow(null),
  
  // Preferences
  preferences: Joi.object({
    theme: Joi.string().valid('light', 'dark', 'auto').default('light'),
    language: Joi.string().default('en'),
    notifications: Joi.object({
      email: Joi.boolean().default(true),
      push: Joi.boolean().default(true),
      sms: Joi.boolean().default(false),
    }).default({}),
  }).default({}),
});

// Permission Schema
const permissionSchema = Joi.object({
  name: Joi.string().required(), // e.g., 'properties:create:organization'
  resource: Joi.string().required(), // e.g., 'properties'
  action: Joi.string().required(), // e.g., 'create'
  scope: Joi.string().valid('all', 'organization', 'assigned', 'own').required(),
  description: Joi.string().required().max(200),
  category: Joi.string().required(), // e.g., 'Property Management'
});

// Invitation Schema
const invitationSchema = Joi.object({
  email: Joi.string().email().required(),
  organizationId: Joi.string().required(),
  roleId: Joi.string().required(),
  invitedBy: Joi.string().required(), // User ID
  message: Joi.string().allow('').max(500),
  expiresAt: Joi.date().required(),
  status: Joi.string().valid('pending', 'accepted', 'expired', 'cancelled').default('pending'),
});

// Property Assignment Schema
const propertyAssignmentSchema = Joi.object({
  propertyId: Joi.string().required(),
  userId: Joi.string().required(),
  role: Joi.string().valid('manager', 'caretaker', 'viewer').required(),
  assignedBy: Joi.string().required(), // User ID who made the assignment
  assignedAt: Joi.date().default(() => new Date()),
  permissions: Joi.array().items(Joi.string()).default([]), // Additional property-specific permissions
  notes: Joi.string().allow('').max(500),
});

// Updated Property Schema (with RBAC)
const rbacPropertySchema = Joi.object({
  name: Joi.string().required().min(1).max(200),
  type: Joi.string().valid('land', 'building').required(),
  
  // RBAC fields
  organizationId: Joi.string().required(),
  assignedManagers: Joi.array().items(Joi.string()).default([]), // User IDs
  caretakerId: Joi.string().allow(''),
  
  // Existing property fields...
  location: Joi.object({
    village: Joi.string().required().min(1).max(100),
    parish: Joi.string().required().min(1).max(100),
    subCounty: Joi.string().required().min(1).max(100),
    county: Joi.string().required().min(1).max(100),
    district: Joi.string().required().min(1).max(100),
    landmarks: Joi.string().allow('').max(500),
  }).required(),
  
  establishmentDate: Joi.date().required(),
  caretakerName: Joi.string().required().min(1).max(100),
  caretakerPhone: Joi.string().required().min(10).max(20),
  plotNumber: Joi.string().allow('').max(50),
  ownershipType: Joi.string().valid('leasing', 'owned').required(),
  
  // Building or Land specific details (same as before)
  buildingDetails: Joi.when('type', {
    is: 'building',
    then: Joi.object({
      buildingType: Joi.string().valid('apartment', 'house', 'commercial', 'other').required(),
      numberOfFloors: Joi.number().integer().min(1).required(),
      floors: Joi.array().items(Joi.object({
        floorNumber: Joi.number().integer().min(0).required(),
        floorName: Joi.string().allow('').max(100),
        spaces: Joi.array().items(Joi.object({
          spaceId: Joi.string().required(),
          spaceName: Joi.string().required().min(1).max(100),
          spaceType: Joi.string().valid('room', 'apartment', 'shop', 'office', 'storage', 'other').required(),
          monthlyRent: Joi.number().min(0).required(),
          size: Joi.string().allow('').max(50),
          status: Joi.string().valid('vacant', 'occupied', 'maintenance').default('vacant'),
          amenities: Joi.array().items(Joi.string()).default([]),
          description: Joi.string().allow('').max(300),
        })).min(1).required(),
        description: Joi.string().allow('').max(200),
      })).min(1).required(),
      totalRentableSpaces: Joi.number().integer().min(0),
    }).required(),
    otherwise: Joi.forbidden(),
  }),
  
  landDetails: Joi.when('type', {
    is: 'land',
    then: Joi.object({
      totalArea: Joi.string().allow('').max(100),
      landUse: Joi.string().valid('residential', 'commercial', 'agricultural', 'mixed', 'other').required(),
      squatters: Joi.array().items(Joi.object({
        squatterId: Joi.string().required(),
        squatterName: Joi.string().required().min(1).max(100),
        squatterPhone: Joi.string().allow('').max(20),
        assignedArea: Joi.string().required().min(1).max(200),
        areaSize: Joi.string().allow('').max(50),
        monthlyPayment: Joi.number().min(0).required(),
        agreementDate: Joi.date().required(),
        status: Joi.string().valid('active', 'inactive', 'disputed').default('active'),
        description: Joi.string().allow('').max(300),
      })).default([]),
      totalSquatters: Joi.number().integer().min(0).default(0),
    }).required(),
    otherwise: Joi.forbidden(),
  }),
  
  description: Joi.string().max(1000).allow(''),
  amenities: Joi.array().items(Joi.string()),
  images: Joi.array().items(Joi.string().uri()),
  status: Joi.string().valid('vacant', 'occupied', 'maintenance', 'under_construction').default('vacant'),
});

// System Roles and Permissions (SIMPLIFIED)
const SYSTEM_ROLES = {
  SUPER_ADMIN: {
    name: 'super_admin',
    displayName: 'Super Administrator',
    description: 'Full system access across all organizations',
    level: 10,
    isSystemRole: true,
  },
  ORG_ADMIN: {
    name: 'org_admin',
    displayName: 'Organization Administrator',
    description: 'Full access within organization',
    level: 9,
    isSystemRole: true,
  },
  PROPERTY_MANAGER: {
    name: 'property_manager',
    displayName: 'Property Manager',
    description: 'Manages assigned properties and handles on-site maintenance',
    level: 6,
    isSystemRole: true,
  },
  FINANCIAL_VIEWER: {
    name: 'financial_viewer',
    displayName: 'Financial Viewer',
    description: 'Access to financial data and basic property information',
    level: 4,
    isSystemRole: true,
  },
};

// System Permissions
const SYSTEM_PERMISSIONS = [
  // Property Management
  { name: 'properties:create:organization', resource: 'properties', action: 'create', scope: 'organization', description: 'Create new properties', category: 'Property Management' },
  { name: 'properties:read:organization', resource: 'properties', action: 'read', scope: 'organization', description: 'View all organization properties', category: 'Property Management' },
  { name: 'properties:read:assigned', resource: 'properties', action: 'read', scope: 'assigned', description: 'View assigned properties', category: 'Property Management' },
  { name: 'properties:update:organization', resource: 'properties', action: 'update', scope: 'organization', description: 'Edit all organization properties', category: 'Property Management' },
  { name: 'properties:update:assigned', resource: 'properties', action: 'update', scope: 'assigned', description: 'Edit assigned properties', category: 'Property Management' },
  { name: 'properties:delete:organization', resource: 'properties', action: 'delete', scope: 'organization', description: 'Delete organization properties', category: 'Property Management' },
  
  // Tenant Management
  { name: 'tenants:create:organization', resource: 'tenants', action: 'create', scope: 'organization', description: 'Create new tenants', category: 'Tenant Management' },
  { name: 'tenants:read:organization', resource: 'tenants', action: 'read', scope: 'organization', description: 'View all organization tenants', category: 'Tenant Management' },
  { name: 'tenants:read:assigned', resource: 'tenants', action: 'read', scope: 'assigned', description: 'View tenants for assigned properties', category: 'Tenant Management' },
  { name: 'tenants:update:organization', resource: 'tenants', action: 'update', scope: 'organization', description: 'Edit all organization tenants', category: 'Tenant Management' },
  { name: 'tenants:update:assigned', resource: 'tenants', action: 'update', scope: 'assigned', description: 'Edit tenants for assigned properties', category: 'Tenant Management' },
  
  // Payment Management
  { name: 'payments:create:organization', resource: 'payments', action: 'create', scope: 'organization', description: 'Record payments for all properties', category: 'Payment Management' },
  { name: 'payments:read:organization', resource: 'payments', action: 'read', scope: 'organization', description: 'View all organization payments', category: 'Payment Management' },
  { name: 'payments:read:assigned', resource: 'payments', action: 'read', scope: 'assigned', description: 'View payments for assigned properties', category: 'Payment Management' },
  { name: 'payments:read:own', resource: 'payments', action: 'read', scope: 'own', description: 'View own payment history', category: 'Payment Management' },
  
  // User Management
  { name: 'users:create:organization', resource: 'users', action: 'create', scope: 'organization', description: 'Invite new users to organization', category: 'User Management' },
  { name: 'users:read:organization', resource: 'users', action: 'read', scope: 'organization', description: 'View all organization users', category: 'User Management' },
  { name: 'users:update:organization', resource: 'users', action: 'update', scope: 'organization', description: 'Edit organization user roles', category: 'User Management' },
  
  // Reports
  { name: 'reports:read:organization', resource: 'reports', action: 'read', scope: 'organization', description: 'View organization reports', category: 'Reporting' },
  { name: 'reports:read:assigned', resource: 'reports', action: 'read', scope: 'assigned', description: 'View reports for assigned properties', category: 'Reporting' },
  
  // Maintenance Management
  { name: 'maintenance:create:assigned', resource: 'maintenance', action: 'create', scope: 'assigned', description: 'Create maintenance requests for assigned properties', category: 'Maintenance' },
  { name: 'maintenance:update:assigned', resource: 'maintenance', action: 'update', scope: 'assigned', description: 'Update maintenance status for assigned properties', category: 'Maintenance' },
];

// Role Permission Mappings (SIMPLIFIED)
const ROLE_PERMISSIONS = {
  super_admin: SYSTEM_PERMISSIONS.map(p => p.name), // All permissions
  
  org_admin: [
    'properties:create:organization',
    'properties:read:organization', 
    'properties:update:organization',
    'properties:delete:organization',
    'tenants:create:organization',
    'tenants:read:organization',
    'tenants:update:organization',
    'payments:create:organization',
    'payments:read:organization',
    'users:create:organization',
    'users:read:organization',
    'users:update:organization',
    'reports:read:organization',
  ],
  
  property_manager: [
    // Property management (merged from property_manager + caretaker)
    'properties:create:organization',
    'properties:read:assigned',
    'properties:update:assigned',
    // Tenant management
    'tenants:create:assigned',
    'tenants:read:assigned', 
    'tenants:update:assigned',
    // Payment management
    'payments:create:assigned',
    'payments:read:assigned',
    // Reporting
    'reports:read:assigned',
    // Maintenance (from caretaker)
    'maintenance:create:assigned',
    'maintenance:update:assigned',
  ],
  
  financial_viewer: [
    // Financial access (from accountant)
    'payments:read:organization',
    'reports:read:organization',
    // Basic property viewing (from viewer)
    'properties:read:organization', // Limited to basic info
  ],
};

module.exports = {
  organizationSchema,
  roleSchema,
  userProfileSchema,
  permissionSchema,
  invitationSchema,
  propertyAssignmentSchema,
  rbacPropertySchema,
  SYSTEM_ROLES,
  SYSTEM_PERMISSIONS,
  ROLE_PERMISSIONS,
};
