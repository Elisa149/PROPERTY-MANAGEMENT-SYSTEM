import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Divider,
  Toolbar,
  Chip,
} from '@mui/material';
import {
  Dashboard,
  Home,
  Receipt,
  Payment,
  AccountCircle,
  TrendingUp,
  People,
  Assessment,
  AdminPanelSettings,
  SupervisorAccount,
  ManageAccounts,
  Analytics,
  Visibility,
  Business,
  Settings,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const getAllNavigationItems = (userRole, hasPermission, hasAnyPermission, hasRole, isAdmin, userPermissions) => {
  const regularItems = [];
  const globalManagementItems = []; // For super admin global views (properties, tenants, etc.)
  const systemAdminItems = []; // For true system administration pages
  const roleName = userRole?.name;
  const hasPermissions = userPermissions && userPermissions.length > 0;
  const isSuperAdmin = hasRole('super_admin');
  const isOrgAdmin = roleName === 'org_admin' && !isSuperAdmin;

  // Helper function to check access with role fallback
  const checkAccessWithFallback = (permissionArray, allowedRoles = []) => {
    if (hasPermissions) {
      return hasAnyPermission(permissionArray);
    }
    // If no permissions but has role, use role-based fallback
    if (roleName && allowedRoles.length > 0) {
      return allowedRoles.includes(roleName);
    }
    return false;
  };

  // Dashboard - everyone can see except super admins (they have System Dashboard)
  if (!isSuperAdmin) {
    regularItems.push({
      text: 'Dashboard',
      icon: <Dashboard />,
      path: '/app/dashboard',
      show: true,
      category: isOrgAdmin ? 'Overview & Analytics' : null,
    });
  }

  // Properties - based on role and permissions
  // Super admins get separate entry in global management section
  if (checkAccessWithFallback(
    ['properties:read:organization', 'properties:read:assigned'],
    ['org_admin', 'property_manager', 'financial_viewer', 'super_admin']
  )) {
    if (isSuperAdmin) {
      globalManagementItems.push({
        text: 'Properties',
        icon: <Home />,
        path: '/app/admin/properties',
        show: true,
        roleInfo: 'All Organizations',
      });
    } else {
      regularItems.push({
        text: 'Properties',
        icon: <Home />,
        path: '/app/properties',
        show: true,
        roleInfo: userRole ? `${userRole.displayName} Access` : 'Properties',
        category: isOrgAdmin ? 'Property & Operations' : null,
      });
    }
  }

  // Properties Overview - enhanced view for admins and property managers
  if (checkAccessWithFallback(
    ['properties:read:organization', 'properties:read:assigned', 'reports:read:organization'],
    ['org_admin', 'property_manager', 'financial_viewer', 'super_admin']
  )) {
    if (isSuperAdmin) {
      globalManagementItems.push({
        text: 'Properties Overview', 
        icon: <Assessment />,
        path: '/app/admin/properties-overview',
        subtitle: 'Collection data & analytics',
        show: true,
      });
    } else {
      regularItems.push({
        text: 'Properties Overview', 
        icon: <Assessment />,
        path: '/app/properties-overview',
        subtitle: 'Collection data & analytics',
        show: true,
        category: isOrgAdmin ? 'Property & Operations' : null,
      });
    }
  }

  // All Spaces - property managers and above (anyone who can read properties)
  if (checkAccessWithFallback(
    ['properties:read:organization', 'properties:read:assigned'],
    ['org_admin', 'property_manager', 'super_admin']
  )) {
    if (isSuperAdmin) {
      globalManagementItems.push({
        text: 'All Spaces',
        icon: <AccountCircle />,
        path: '/app/admin/spaces',
        subtitle: 'View all rentable spaces',
        show: true,
      });
    } else {
      regularItems.push({
        text: 'All Spaces',
        icon: <AccountCircle />,
        path: '/app/spaces',
        subtitle: 'View all rentable spaces',
        show: true,
        category: isOrgAdmin ? 'Property & Operations' : null,
      });
    }
  }

  // Tenants - based on tenant management permissions
  if (checkAccessWithFallback(
    ['tenants:read:organization', 'tenants:read:assigned'],
    ['org_admin', 'property_manager', 'super_admin']
  )) {
    if (isSuperAdmin) {
      globalManagementItems.push({
        text: 'Tenants',
        icon: <People />,
        path: '/app/admin/tenants',
        subtitle: 'Tenant details & payments',
        show: true,
      });
    } else {
      regularItems.push({
        text: 'Tenants',
        icon: <People />,
        path: '/app/tenants',
        subtitle: 'Tenant details & payments',
        show: true,
        category: isOrgAdmin ? 'Property & Operations' : null,
      });
    }
  }

  // Rent Management - property managers and above (anyone who can read payments or properties)
  if (checkAccessWithFallback([
    'payments:create:organization', 
    'payments:create:assigned', 
    'payments:read:organization',
    'payments:read:assigned',
    'properties:read:assigned',
    'properties:read:organization'
  ], ['org_admin', 'property_manager', 'super_admin'])) {
    if (isSuperAdmin) {
      globalManagementItems.push({
        text: 'Rent Management',
        icon: <Receipt />,
        path: '/app/admin/rent',
        subtitle: 'Manage rent agreements',
        show: true,
      });
    } else {
      regularItems.push({
        text: 'Rent Management',
        icon: <Receipt />,
        path: '/app/rent',
        subtitle: 'Manage rent agreements',
        show: true,
        category: isOrgAdmin ? 'Property & Operations' : null,
      });
    }
  }

  // Invoices - based on payment access (same permissions as payments)
  if (checkAccessWithFallback(
    ['payments:read:organization', 'payments:read:assigned'],
    ['org_admin', 'property_manager', 'financial_viewer', 'super_admin']
  )) {
    if (isSuperAdmin) {
      globalManagementItems.push({
        text: 'Invoices',
        icon: <Receipt />,
        path: '/app/admin/invoices',
        subtitle: 'View and manage invoices',
        show: true,
        roleInfo: 'All Organizations',
      });
    } else {
      regularItems.push({
        text: 'Invoices',
        icon: <Receipt />,
        path: '/app/invoices',
        subtitle: 'View and manage invoices',
        show: true,
        roleInfo: hasPermission('payments:read:organization') ? 'Full Access' : 'Assigned Properties',
        category: isOrgAdmin ? 'Property & Operations' : null,
      });
    }
  }

  // Payments - based on payment access (including financial viewers)
  if (checkAccessWithFallback(
    ['payments:read:organization', 'payments:read:assigned'],
    ['org_admin', 'property_manager', 'financial_viewer', 'super_admin']
  )) {
    if (isSuperAdmin) {
      globalManagementItems.push({
        text: 'Payments',
        icon: <Payment />,
        path: '/app/admin/payments',
        show: true,
        roleInfo: 'All Organizations',
      });
    } else {
      regularItems.push({
        text: 'Payments',
        icon: <Payment />,
        path: '/app/payments',
        show: true,
        roleInfo: hasPermission('payments:read:organization') ? 'Full Access' : 'Assigned Properties',
        category: isOrgAdmin ? 'Property & Operations' : null,
      });
    }
  }

  // Financial Analytics - for financial viewers and admins
  // Note: This is the organization-level analytics page
  if (checkAccessWithFallback(
    ['reports:read:organization'],
    ['org_admin', 'financial_viewer', 'super_admin']
  )) {
    if (isSuperAdmin) {
      systemAdminItems.push({
        text: 'Global Analytics',
        icon: <Analytics />,
        path: '/app/admin/global-analytics',
        subtitle: 'Cross-organization analytics',
        show: true,
      });
    } else {
      regularItems.push({
        text: 'Analytics & Reports',
        icon: <Analytics />,
        path: '/app/admin/analytics',
        subtitle: 'Financial reports & insights',
        show: true,
        category: isOrgAdmin ? 'Overview & Analytics' : null,
      });
    }
  }

  // User Management - org admins and super admins only
  if (checkAccessWithFallback(
    ['users:read:organization'],
    ['org_admin', 'super_admin']
  ) || (roleName === 'org_admin' || roleName === 'super_admin')) {
    if (isSuperAdmin) {
      systemAdminItems.push({
        text: 'Global Users',
        icon: <People />,
        path: '/app/admin/users',
        subtitle: 'Manage users across all orgs',
        show: true,
      });
    } else {
      regularItems.push({
        text: 'User Management',
        icon: <ManageAccounts />,
        path: '/app/users',
        subtitle: 'Manage team & roles',
        show: true,
        category: isOrgAdmin ? 'Administration' : null,
      });
    }
  }

  // Admin Dashboard - org admins and super admins only
  if (isAdmin() || roleName === 'org_admin' || roleName === 'super_admin') {
    if (isSuperAdmin) {
      systemAdminItems.push({
        text: 'System Dashboard',
        icon: <AdminPanelSettings />,
        path: '/app/admin/system',
        subtitle: 'System-wide overview',
        show: true,
      });
    } else {
      regularItems.push({
        text: 'Admin Dashboard',
        icon: <AdminPanelSettings />,
        path: '/app/admin/dashboard',
        subtitle: 'Admin overview & controls',
        show: true,
        category: isOrgAdmin ? 'Overview & Analytics' : null,
      });
    }
  }

  // Organization Settings - org admins and super admins only
  if (isAdmin() || roleName === 'org_admin' || roleName === 'super_admin') {
    if (!isSuperAdmin) {
      regularItems.push({
        text: 'Organization Settings',
        icon: <SupervisorAccount />,
        path: '/app/admin/settings',
        subtitle: 'Settings & configuration',
        show: true,
        category: isOrgAdmin ? 'Administration' : null,
      });
    }
  }

  // Property Assignments - org admins and super admins only
  if (isAdmin() || roleName === 'org_admin' || roleName === 'super_admin') {
    if (!isSuperAdmin) {
      regularItems.push({
        text: 'Property Assignments',
        icon: <ManageAccounts />,
        path: '/app/admin/assignments',
        subtitle: 'Assign staff to properties',
        show: true,
        category: isOrgAdmin ? 'Property & Operations' : null,
      });
    }
  }

  // System Administration - super admins only (grouped together)
  if (isSuperAdmin) {
    systemAdminItems.push({
      text: 'Organizations',
      icon: <Business />,
      path: '/app/admin/organizations',
      subtitle: 'Manage all organizations',
      show: true,
    });
    systemAdminItems.push({
      text: 'System Settings',
      icon: <Settings />,
      path: '/app/admin/system-settings',
      subtitle: 'System-wide configuration',
      show: true,
    });
  }

  // Sort systemAdminItems: System Dashboard first, then Organizations, then rest
  const sortedSystemAdminItems = systemAdminItems.filter(item => item.show).sort((a, b) => {
    if (a.text === 'System Dashboard') return -1;
    if (b.text === 'System Dashboard') return 1;
    if (a.text === 'Organizations') return -1;
    if (b.text === 'Organizations') return 1;
    return 0;
  });

  return {
    regular: regularItems.filter(item => item.show),
    globalManagement: globalManagementItems.filter(item => item.show),
    systemAdmin: sortedSystemAdminItems
  };
};

const secondaryItems = [
  {
    text: 'Profile',
    icon: <AccountCircle />,
    path: '/app/profile',
  },
];

const Sidebar = ({ onItemClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole, userPermissions, hasPermission, hasAnyPermission, hasRole, isAdmin } = useAuth();
  
  // Debug logging
  console.log('🧪 Sidebar Debug Info:', {
    userRole,
    userPermissions,
    permissionsCount: userPermissions?.length || 0,
    hasAnyPermissionFunction: typeof hasAnyPermission,
    samplePermissionCheck: userRole && userPermissions ? hasAnyPermission(['payments:read:organization']) : 'no role/permissions',
    isAdminResult: userRole && userPermissions ? isAdmin() : 'no role/permissions'
  });
  
  // Get role-based navigation items
  const navigationItems = useMemo(() => {
    console.log('🔄 Generating navigation items...');
    console.log('📊 Role/Permission State:', {
      hasUserRole: !!userRole,
      hasPermissions: !!userPermissions,
      permissionsLength: userPermissions?.length || 0,
      roleName: userRole?.name,
      permissions: userPermissions
    });
    
    // Safety check: if role data isn't loaded yet, show at least dashboard
    // Allow empty permissions array if user has a role (permissions might be in role document)
    if (!userRole) {
      console.log('⚠️ Missing role, showing dashboard only');
      return {
        regular: [{
          text: 'Dashboard',
          icon: <Dashboard />,
          path: '/app/dashboard',
          show: true,
        }],
        globalManagement: [],
        systemAdmin: []
      };
    }
    
    // If user has role but no permissions, still show pages based on role name
    const items = getAllNavigationItems(
      userRole, 
      hasPermission, 
      hasAnyPermission, 
      hasRole, 
      isAdmin, 
      userPermissions || []
    );
    console.log('📋 Generated navigation items:', {
      regular: items.regular.map(item => ({ text: item.text, show: item.show })),
      globalManagement: items.globalManagement.map(item => ({ text: item.text, show: item.show })),
      systemAdmin: items.systemAdmin.map(item => ({ text: item.text, show: item.show }))
    });
    return items;
  }, [userRole, userPermissions, hasPermission, hasAnyPermission, hasRole, isAdmin]);

  const handleItemClick = (path) => {
    navigate(path);
    if (onItemClick) {
      onItemClick();
    }
  };

  const isActive = (path) => {
    // Check exact match
    if (location.pathname === path) {
      return true;
    }
    // For super admins, also check if we're on the admin version of a route
    // when the menu item points to the admin route, or vice versa
    if (hasRole('super_admin')) {
      // If menu item is admin route, also highlight when on regular route
      if (path.startsWith('/app/admin/') && location.pathname === path.replace('/app/admin/', '/app/')) {
        return true;
      }
      // If menu item is regular route, also highlight when on admin route
      if (path.startsWith('/app/') && !path.startsWith('/app/admin/') && location.pathname === path.replace('/app/', '/app/admin/')) {
        return true;
      }
    }
    return false;
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo/Title */}
      <Toolbar sx={{ flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp color="primary" />
          <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'inherit' }}>
            PropertyPro
          </span>
        </div>
        {userRole && (
          <Chip 
            label={userRole.displayName} 
            color="primary" 
            variant="outlined"
            size="small"
            sx={{ fontSize: '0.7rem' }}
          />
        )}
      </Toolbar>

      <Divider />

      {/* System Administration Section - Super Admin only */}
      {navigationItems.systemAdmin.length > 0 && (
        <>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ px: 2, py: 1 }}>
            <span style={{ 
              color: 'inherit', 
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 1,
              fontSize: '0.7rem',
              opacity: 0.7
            }}>
              System Administration
            </span>
          </Box>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '8px' }}>
            {navigationItems.systemAdmin.map((item) => (
              <div
                key={item.text}
                onClick={() => handleItemClick(item.path)}
                style={{
                  margin: '0 8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: isActive(item.path) ? 'var(--mui-palette-primary-main)' : 'transparent',
                  color: isActive(item.path) ? '#1976d2' : 'inherit',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive(item.path)) {
                    e.currentTarget.style.backgroundColor = 'var(--mui-palette-primary-light)';
                    e.currentTarget.style.color = '#1976d2';
                  } else {
                    e.currentTarget.style.backgroundColor = 'var(--mui-palette-primary-dark)';
                    e.currentTarget.style.color = '#1976d2';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isActive(item.path) ? 'var(--mui-palette-primary-main)' : 'transparent';
                  e.currentTarget.style.color = isActive(item.path) ? '#1976d2' : 'inherit';
                }}
              >
                {item.icon}
                <span style={{ fontWeight: 400 }}>
                  {item.text}
                </span>
                {item.subtitle && (
                  <span style={{ opacity: 0.7, fontSize: '0.7rem', marginLeft: 'auto' }}>
                    {item.subtitle}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Global Management Section - Super Admin only */}
      {navigationItems.globalManagement.length > 0 && (
        <>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ px: 2, py: 1 }}>
            <span style={{ 
              color: 'inherit', 
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 1,
              fontSize: '0.7rem',
              opacity: 0.7
            }}>
              Global Management
            </span>
          </Box>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '8px' }}>
            {navigationItems.globalManagement.map((item) => (
              <div
                key={item.text}
                onClick={() => handleItemClick(item.path)}
                style={{
                  margin: '0 8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: isActive(item.path) ? 'var(--mui-palette-primary-main)' : 'transparent',
                  color: isActive(item.path) ? '#1976d2' : 'inherit',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive(item.path)) {
                    e.currentTarget.style.backgroundColor = 'var(--mui-palette-primary-light)';
                    e.currentTarget.style.color = '#1976d2';
                  } else {
                    e.currentTarget.style.backgroundColor = 'var(--mui-palette-primary-dark)';
                    e.currentTarget.style.color = '#1976d2';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isActive(item.path) ? 'var(--mui-palette-primary-main)' : 'transparent';
                  e.currentTarget.style.color = isActive(item.path) ? '#1976d2' : 'inherit';
                }}
              >
                {item.icon}
                <span style={{ fontWeight: 400 }}>
                  {item.text}
                </span>
                {item.subtitle && (
                  <span style={{ opacity: 0.7, fontSize: '0.7rem', marginLeft: 'auto' }}>
                    {item.subtitle}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Main Navigation - Regular Items */}
      <div style={{ flexGrow: 1, paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {(() => {
          const isOrgAdmin = userRole?.name === 'org_admin' && !hasRole('super_admin');
          
          // Group items by category for org_admin, otherwise show flat list
          if (isOrgAdmin) {
            const categorizedItems = {};
            const uncategorizedItems = [];
            
            navigationItems.regular.forEach((item) => {
              if (item.category) {
                if (!categorizedItems[item.category]) {
                  categorizedItems[item.category] = [];
                }
                categorizedItems[item.category].push(item);
              } else {
                uncategorizedItems.push(item);
              }
            });
            
            // Define category order
            const categoryOrder = [
              'Overview & Analytics',
              'Property & Operations',
              'Administration'
            ];
            
            return (
              <>
                {categoryOrder.map((category) => {
                  const items = categorizedItems[category];
                  if (!items || items.length === 0) return null;
                  
                  return (
                    <React.Fragment key={category}>
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ px: 2, py: 1 }}>
                        <span style={{ 
                          color: 'inherit', 
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: 1,
                          fontSize: '0.7rem',
                          opacity: 0.7
                        }}>
                          {category}
                        </span>
                      </Box>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '8px' }}>
                        {items.map((item) => (
                          <div
                            key={item.text}
                            onClick={() => handleItemClick(item.path)}
                            style={{
                              margin: '0 8px',
                              padding: '12px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              backgroundColor: isActive(item.path) ? 'var(--mui-palette-primary-main)' : 'transparent',
                              color: isActive(item.path) ? '#1976d2' : 'inherit',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive(item.path)) {
                                e.currentTarget.style.backgroundColor = 'var(--mui-palette-primary-light)';
                                e.currentTarget.style.color = '#1976d2';
                              } else {
                                e.currentTarget.style.backgroundColor = 'var(--mui-palette-primary-dark)';
                                e.currentTarget.style.color = '#1976d2';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = isActive(item.path) ? 'var(--mui-palette-primary-main)' : 'transparent';
                              e.currentTarget.style.color = isActive(item.path) ? '#1976d2' : 'inherit';
                            }}
                          >
                            {item.icon}
                            <span style={{ fontWeight: 400 }}>
                              {item.text}
                            </span>
                            {item.subtitle && (
                              <span style={{ opacity: 0.7, fontSize: '0.7rem', marginLeft: 'auto' }}>
                                {item.subtitle}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </React.Fragment>
                  );
                })}
                {/* Render uncategorized items if any */}
                {uncategorizedItems.length > 0 && (
                  <>
                    {uncategorizedItems.map((item) => (
                      <div
                        key={item.text}
                        onClick={() => handleItemClick(item.path)}
                        style={{
                          margin: '0 8px',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          backgroundColor: isActive(item.path) ? 'var(--mui-palette-primary-main)' : 'transparent',
                          color: isActive(item.path) ? '#1976d2' : 'inherit',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive(item.path)) {
                            e.currentTarget.style.backgroundColor = 'var(--mui-palette-primary-light)';
                            e.currentTarget.style.color = '#1976d2';
                          } else {
                            e.currentTarget.style.backgroundColor = 'var(--mui-palette-primary-dark)';
                            e.currentTarget.style.color = '#1976d2';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = isActive(item.path) ? 'var(--mui-palette-primary-main)' : 'transparent';
                          e.currentTarget.style.color = isActive(item.path) ? '#1976d2' : 'inherit';
                        }}
                      >
                        {item.icon}
                        <span style={{ fontWeight: 400 }}>
                          {item.text}
                        </span>
                        {item.subtitle && (
                          <span style={{ opacity: 0.7, fontSize: '0.7rem', marginLeft: 'auto' }}>
                            {item.subtitle}
                          </span>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </>
            );
          } else {
            // Non-org-admin users see flat list
            return navigationItems.regular.map((item) => (
              <div
                key={item.text}
                onClick={() => handleItemClick(item.path)}
                style={{
                  margin: '0 8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: isActive(item.path) ? 'var(--mui-palette-primary-main)' : 'transparent',
                  color: isActive(item.path) ? '#1976d2' : 'inherit',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive(item.path)) {
                    e.currentTarget.style.backgroundColor = 'var(--mui-palette-primary-light)';
                    e.currentTarget.style.color = '#1976d2';
                  } else {
                    e.currentTarget.style.backgroundColor = 'var(--mui-palette-primary-dark)';
                    e.currentTarget.style.color = '#1976d2';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isActive(item.path) ? 'var(--mui-palette-primary-main)' : 'transparent';
                  e.currentTarget.style.color = isActive(item.path) ? '#1976d2' : 'inherit';
                }}
              >
                {item.icon}
                <span style={{ fontWeight: 400 }}>
                  {item.text}
                </span>
                {item.subtitle && (
                  <span style={{ opacity: 0.7, fontSize: '0.7rem', marginLeft: 'auto' }}>
                    {item.subtitle}
                  </span>
                )}
              </div>
            ));
          }
        })()}
      </div>

      {/* Secondary Navigation - Profile */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '8px' }}>
        {secondaryItems.map((item) => (
          <div
            key={item.text}
            onClick={() => handleItemClick(item.path)}
            style={{
              margin: '0 8px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderRadius: '4px',
              cursor: 'pointer',
              backgroundColor: isActive(item.path) ? 'var(--mui-palette-primary-main)' : 'transparent',
              color: isActive(item.path) ? '#1976d2' : 'inherit',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isActive(item.path)) {
                e.currentTarget.style.backgroundColor = 'var(--mui-palette-primary-light)';
                e.currentTarget.style.color = '#1976d2';
              } else {
                e.currentTarget.style.backgroundColor = 'var(--mui-palette-primary-dark)';
                e.currentTarget.style.color = '#1976d2';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isActive(item.path) ? 'var(--mui-palette-primary-main)' : 'transparent';
              e.currentTarget.style.color = isActive(item.path) ? '#1976d2' : 'inherit';
            }}
          >
            {item.icon}
            <span style={{ fontWeight: 400 }}>
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
