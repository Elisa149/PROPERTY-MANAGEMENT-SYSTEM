import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, Typography, Paper, Alert } from '@mui/material';
import { Lock, Warning } from '@mui/icons-material';

const RoleGuard = ({ 
  children, 
  requiredPermissions = [], 
  requiredRoles = [],
  fallbackComponent,
  redirectTo = '/app/dashboard'
}) => {
  const { userRole, hasPermission, hasAnyPermission, hasRole, loading } = useAuth();

  // Show loading while auth is being determined
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  // Check role requirements
  const hasRequiredRole = requiredRoles.length === 0 || requiredRoles.some(role => hasRole(role));
  
  // Check permission requirements
  const hasRequiredPermissions = requiredPermissions.length === 0 || hasAnyPermission(requiredPermissions);

  // If user meets requirements, show content
  if (hasRequiredRole && hasRequiredPermissions) {
    return children;
  }

  // If fallback component provided, use it
  if (fallbackComponent) {
    return fallbackComponent;
  }

  // Default unauthorized component
  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Lock sx={{ fontSize: 60, color: 'warning.main', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Access Restricted
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          You don't have the necessary permissions to access this page.
        </Typography>
        
        {userRole && (
          <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>
            <Typography variant="body2">
              <strong>Your Current Role:</strong> {userRole.displayName}
            </Typography>
            {requiredPermissions.length > 0 && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Required Permissions:</strong> {requiredPermissions.join(', ')}
              </Typography>
            )}
            {requiredRoles.length > 0 && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Required Roles:</strong> {requiredRoles.join(', ')}
              </Typography>
            )}
          </Alert>
        )}

        <Typography variant="body2" sx={{ mt: 2 }}>
          Contact your administrator if you believe this is an error.
        </Typography>
      </Paper>
    </Box>
  );
};

// Higher-order component for route protection
export const withRoleGuard = (Component, requirements = {}) => {
  return (props) => (
    <RoleGuard {...requirements}>
      <Component {...props} />
    </RoleGuard>
  );
};

export default RoleGuard;

