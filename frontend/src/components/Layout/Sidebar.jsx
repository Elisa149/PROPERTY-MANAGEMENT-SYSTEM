import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
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
  const items = [];
  const roleName = userRole?.name;
  const hasPermissions = userPermissions && userPermissions.length > 0;

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

  // Dashboard - everyone can see
  items.push({
    text: 'Dashboard',
    icon: <Dashboard />,
    path: '/app/dashboard',
    show: true, // Everyone can see dashboard
  });

  // Properties - based on role and permissions
  if (checkAccessWithFallback(
    ['properties:read:organization', 'properties:read:assigned'],
    ['org_admin', 'property_manager', 'financial_viewer', 'super_admin']
  )) {
    items.push({
      text: 'Properties',
      icon: <Home />,
      path: '/app/properties',
      show: true,
      roleInfo: userRole ? `${userRole.displayName} Access` : 'Properties',
    });
  }

  // Properties Overview - enhanced view for admins and property managers
  if (checkAccessWithFallback(
    ['properties:read:organization', 'properties:read:assigned', 'reports:read:organization'],
    ['org_admin', 'property_manager', 'financial_viewer', 'super_admin']
  )) {
    items.push({
      text: 'Properties Overview', 
      icon: <Assessment />,
      path: '/app/properties-overview',
      subtitle: 'Collection data & analytics',
      show: true,
    });
  }

  // All Spaces - property managers and above (anyone who can read properties)
  if (checkAccessWithFallback(
    ['properties:read:organization', 'properties:read:assigned'],
    ['org_admin', 'property_manager', 'super_admin']
  )) {
    items.push({
      text: 'All Spaces',
      icon: <AccountCircle />,
      path: '/app/spaces',
      subtitle: 'View all rentable spaces',
      show: true,
    });
  }

  // Tenants - based on tenant management permissions
  if (checkAccessWithFallback(
    ['tenants:read:organization', 'tenants:read:assigned'],
    ['org_admin', 'property_manager', 'super_admin']
  )) {
    items.push({
      text: 'Tenants',
      icon: <People />,
      path: '/app/tenants',
      subtitle: 'Tenant details & payments',
      show: true,
    });
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
    items.push({
      text: 'Rent Management',
      icon: <Receipt />,
      path: '/app/rent',
      subtitle: 'Manage rent agreements',
      show: true,
    });
  }

  // Payments - based on payment access (including financial viewers)
  if (checkAccessWithFallback(
    ['payments:read:organization', 'payments:read:assigned'],
    ['org_admin', 'property_manager', 'financial_viewer', 'super_admin']
  )) {
    items.push({
      text: 'Payments',
      icon: <Payment />,
      path: '/app/payments',
      show: true,
      roleInfo: hasPermission('payments:read:organization') ? 'Full Access' : 'Assigned Properties',
    });
  }

  // Financial Analytics - for financial viewers and admins
  // Note: This is the organization-level analytics page
  if (checkAccessWithFallback(
    ['reports:read:organization'],
    ['org_admin', 'financial_viewer', 'super_admin']
  )) {
    items.push({
      text: 'Analytics & Reports',
      icon: <Analytics />,
      path: '/app/admin/analytics',
      subtitle: 'Financial reports & insights',
      show: true,
    });
  }

  // User Management - org admins and super admins only
  if (checkAccessWithFallback(
    ['users:read:organization'],
    ['org_admin', 'super_admin']
  ) || (roleName === 'org_admin' || roleName === 'super_admin')) {
    items.push({
      text: 'User Management',
      icon: <ManageAccounts />,
      path: '/app/users',
      subtitle: 'Manage team & roles',
      show: true,
    });
  }

  // Admin Dashboard - org admins and super admins only
  if (isAdmin() || roleName === 'org_admin' || roleName === 'super_admin') {
    items.push({
      text: 'Admin Dashboard',
      icon: <AdminPanelSettings />,
      path: '/app/admin/dashboard',
      subtitle: 'Admin overview & controls',
      show: true,
    });
  }

  // Organization Settings - org admins and super admins only
  if (isAdmin() || roleName === 'org_admin' || roleName === 'super_admin') {
    items.push({
      text: 'Organization Settings',
      icon: <SupervisorAccount />,
      path: '/app/admin/settings',
      subtitle: 'Settings & configuration',
      show: true,
    });
  }

  // Property Assignments - org admins and super admins only
  if (isAdmin() || roleName === 'org_admin' || roleName === 'super_admin') {
    items.push({
      text: 'Property Assignments',
      icon: <ManageAccounts />,
      path: '/app/admin/assignments',
      subtitle: 'Assign staff to properties',
      show: true,
    });
  }

         // System Administration - super admins only
         if (hasRole('super_admin')) {
           items.push({
             text: 'System Dashboard',
             icon: <AdminPanelSettings />,
             path: '/app/admin/system',
             subtitle: 'System-wide overview',
             show: true,
           });
           items.push({
             text: 'Organizations',
             icon: <Business />,
             path: '/app/admin/organizations',
             subtitle: 'Manage all organizations',
             show: true,
           });
           items.push({
             text: 'Global Users',
             icon: <People />,
             path: '/app/admin/users',
             subtitle: 'Manage users across all orgs',
             show: true,
           });
           items.push({
             text: 'Global Analytics',
             icon: <Assessment />,
             path: '/app/admin/global-analytics',
             subtitle: 'Cross-organization analytics',
             show: true,
           });
           items.push({
             text: 'System Settings',
             icon: <Settings />,
             path: '/app/admin/system-settings',
             subtitle: 'System-wide configuration',
             show: true,
           });
           items.push({
             text: 'Global Rent Records',
             icon: <Home />,
             path: '/app/admin/rent',
             subtitle: 'All rent records by organization',
             show: true,
           });
         }

  return items.filter(item => item.show);
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
      return [{
        text: 'Dashboard',
        icon: <Dashboard />,
        path: '/app/dashboard',
        show: true,
      }];
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
    console.log('📋 Generated navigation items:', items.map(item => ({ text: item.text, show: item.show })));
    return items;
  }, [userRole, userPermissions, hasPermission, hasAnyPermission, hasRole, isAdmin]);

  const handleItemClick = (path) => {
    navigate(path);
    if (onItemClick) {
      onItemClick();
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo/Title */}
      <Toolbar sx={{ flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp color="primary" />
          <Typography variant="h6" component="div" color="primary" fontWeight="bold">
            PropertyPro
          </Typography>
        </Box>
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

      {/* Main Navigation */}
      <List sx={{ flexGrow: 1, pt: 1 }}>
        {navigationItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={isActive(item.path)}
              onClick={() => handleItemClick(item.path)}
              sx={{
                mx: 1,
                borderRadius: 1,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
                '&:hover': {
                  backgroundColor: 'primary.light',
                  color: 'white',
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: isActive(item.path) ? 'white' : 'inherit',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                sx={{
                  '& .MuiListItemText-primary': {
                    fontWeight: isActive(item.path) ? 600 : 400,
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      {/* Secondary Navigation */}
      <List sx={{ pb: 2 }}>
        {secondaryItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={isActive(item.path)}
              onClick={() => handleItemClick(item.path)}
              sx={{
                mx: 1,
                borderRadius: 1,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
                '&:hover': {
                  backgroundColor: 'primary.light',
                  color: 'white',
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: isActive(item.path) ? 'white' : 'inherit',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                sx={{
                  '& .MuiListItemText-primary': {
                    fontWeight: isActive(item.path) ? 600 : 400,
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default Sidebar;
