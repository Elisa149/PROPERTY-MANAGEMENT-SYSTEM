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
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const getAllNavigationItems = (userRole, hasPermission, hasAnyPermission, hasRole, isAdmin, userPermissions) => {
  const items = [];

  // Dashboard - everyone can see
  items.push({
    text: 'Dashboard',
    icon: <Dashboard />,
    path: '/app/dashboard',
    show: true, // Everyone can see dashboard
  });

  // Properties - based on role and permissions
  const hasPropertiesAccess = hasAnyPermission(['properties:read:organization', 'properties:read:assigned']);
  console.log('🏠 Properties access check:', {
    hasPropertiesAccess,
    permissions: ['properties:read:organization', 'properties:read:assigned'],
    userPermissions
  });
  
  if (hasPropertiesAccess) {
    items.push({
      text: 'Properties',
      icon: <Home />,
      path: '/app/properties',
      show: true,
      roleInfo: userRole ? `${userRole.displayName} Access` : 'Properties',
    });
  }

  // Properties Overview - enhanced view for admins and property managers
  if (hasAnyPermission(['properties:read:organization', 'properties:read:assigned', 'reports:read:organization'])) {
    items.push({
      text: 'Properties Overview', 
      icon: <Assessment />,
      path: '/app/properties-overview',
      subtitle: 'Collection data & analytics',
      show: true,
    });
  }

  // All Spaces - property managers and above
  if (hasAnyPermission(['properties:read:organization', 'properties:read:assigned'])) {
    items.push({
      text: 'All Spaces',
      icon: <AccountCircle />,
      path: '/app/spaces',
      subtitle: 'View all rentable spaces',
      show: true,
    });
  }

  // Tenants - based on tenant management permissions
  if (hasAnyPermission(['tenants:read:organization', 'tenants:read:assigned'])) {
    items.push({
      text: 'All Tenants',
      icon: <People />,
      path: '/app/tenants',
      subtitle: 'Tenant details & payments',
      show: true,
    });
  }

  // Rent Management - property managers and above
  if (hasAnyPermission(['payments:create:organization', 'payments:create:assigned', 'properties:read:assigned'])) {
    items.push({
      text: 'Rent Management',
      icon: <Receipt />,
      path: '/app/rent',
      show: true,
    });
  }

  // Payments - based on payment access (including financial viewers)
  const hasPaymentsAccess = hasAnyPermission(['payments:read:organization', 'payments:read:assigned']);
  console.log('💰 Payments access check:', {
    hasPaymentsAccess,
    permissions: ['payments:read:organization', 'payments:read:assigned'],
    userPermissions
  });
  
  if (hasPaymentsAccess) {
    items.push({
      text: 'Payments',
      icon: <Payment />,
      path: '/app/payments',
      show: true,
      roleInfo: hasPermission('payments:read:organization') ? 'Full Access' : 'Assigned Properties',
    });
  }

  // Financial Analytics - for financial viewers and admins
  if (hasAnyPermission(['reports:read:organization'])) {
    items.push({
      text: 'Financial Analytics',
      icon: <Analytics />,
      path: '/app/analytics',
      subtitle: 'Financial reports & insights',
      show: true,
    });
  }

  // User Management - org admins and super admins only
  if (hasAnyPermission(['users:read:organization'])) {
    items.push({
      text: 'User Management',
      icon: <ManageAccounts />,
      path: '/app/users',
      subtitle: 'Manage team & roles',
      show: true,
    });
  }

  // Admin Dashboard - org admins and super admins only
  if (isAdmin()) {
    items.push({
      text: 'Admin Dashboard',
      icon: <AdminPanelSettings />,
      path: '/app/admin/dashboard',
      subtitle: 'Admin overview & controls',
      show: true,
    });
  }

  // Organization Settings - org admins and super admins only
  if (isAdmin()) {
    items.push({
      text: 'Organization Settings',
      icon: <SupervisorAccount />,
      path: '/app/admin/settings',
      subtitle: 'Settings & configuration',
      show: true,
    });
  }

  // Property Assignments - org admins and super admins only
  if (isAdmin()) {
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
             text: 'System Admin',
             icon: <AdminPanelSettings />,
             path: '/app/admin',
             subtitle: 'System-wide management',
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
      roleName: userRole?.name
    });
    
    // Safety check: if role data isn't loaded yet, show at least dashboard
    if (!userRole || !userPermissions) {
      console.log('⚠️ Missing role or permissions, showing dashboard only');
      return [{
        text: 'Dashboard',
        icon: <Dashboard />,
        path: '/app/dashboard',
        show: true,
      }];
    }
    
    const items = getAllNavigationItems(userRole, hasPermission, hasAnyPermission, hasRole, isAdmin, userPermissions);
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
