import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';

import { useAuth } from './contexts/AuthContext';
import PendingApproval from './components/PendingApproval';
import RoleGuard from './components/RoleGuard';
import Layout from './components/Layout/Layout';
import LoadingSpinner from './components/common/LoadingSpinner';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Main app pages
import Dashboard from './pages/Dashboard';
import PropertiesPage from './pages/PropertiesPage';
import PropertiesOverviewPage from './pages/PropertiesOverviewPage';
import CreatePropertyPage from './pages/CreatePropertyPage';
import PropertyDetailsPage from './pages/PropertyDetailsPage';
import SpaceAssignmentPage from './pages/SpaceAssignmentPage';
import AllSpacesPage from './pages/AllSpacesPage';
import TenantsPage from './pages/TenantsPage';
import RentPage from './pages/RentPage';
import PaymentsPage from './pages/PaymentsPage';
import ProfilePage from './pages/ProfilePage';
import UserManagementPage from './pages/UserManagementPage';

// Admin pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import OrganizationSettingsPage from './pages/admin/OrganizationSettingsPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import PropertyAssignmentPage from './pages/admin/PropertyAssignmentPage';

// Protected route wrapper with RBAC
const ProtectedRoute = ({ children }) => {
  const { user, loading, needsRoleAssignment, userProfile } = useAuth();
  const [showPendingApproval, setShowPendingApproval] = useState(false);
  
  useEffect(() => {
    if (user && (needsRoleAssignment || userProfile?.status === 'pending_approval' || userProfile?.status === 'rejected')) {
      setShowPendingApproval(true);
    } else {
      setShowPendingApproval(false);
    }
  }, [user, needsRoleAssignment, userProfile]);
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <>
      {children}
      <PendingApproval 
        open={showPendingApproval}
        onClose={() => setShowPendingApproval(false)}
      />
    </>
  );
};

// Public route wrapper (redirect to dashboard if already authenticated)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (user) {
    return <Navigate to="/app/dashboard" replace />;
  }
  
  return children;
};

function App() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Routes>
        {/* Default route - Login page */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />

        {/* Protected routes */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />

          {/* Properties */}
          <Route path="properties" element={<PropertiesPage />} />
          <Route path="properties-overview" element={<PropertiesOverviewPage />} />
          <Route path="properties/new" element={
            <RoleGuard requiredPermissions={['properties:create:organization']}>
              <CreatePropertyPage />
            </RoleGuard>
          } />
          <Route path="properties/:id" element={<PropertyDetailsPage />} />
          <Route path="properties/:id/spaces" element={<SpaceAssignmentPage />} />
          <Route path="spaces" element={<AllSpacesPage />} />
          <Route path="tenants" element={<TenantsPage />} />

          {/* Rent Management */}
          <Route path="rent" element={<RentPage />} />

          {/* Payment Tracking */}
          <Route path="payments" element={<PaymentsPage />} />

          {/* Profile */}
          <Route path="profile" element={<ProfilePage />} />
          
                 {/* User Management - Org Admins only */}
                 <Route path="users" element={
                   <RoleGuard requiredPermissions={['users:read:organization']}>
                     <UserManagementPage />
                   </RoleGuard>
                 } />
                 
                 {/* Admin Routes - Org Admins and Super Admins only */}
                 <Route path="admin" element={
                   <RoleGuard requiredRoles={['org_admin', 'super_admin']}>
                     <AdminDashboardPage />
                   </RoleGuard>
                 } />
                 <Route path="admin/dashboard" element={
                   <RoleGuard requiredRoles={['org_admin', 'super_admin']}>
                     <AdminDashboardPage />
                   </RoleGuard>
                 } />
                 <Route path="admin/settings" element={
                   <RoleGuard requiredRoles={['org_admin', 'super_admin']}>
                     <OrganizationSettingsPage />
                   </RoleGuard>
                 } />
                 <Route path="admin/analytics" element={
                   <RoleGuard requiredPermissions={['reports:read:organization']}>
                     <AnalyticsPage />
                   </RoleGuard>
                 } />
                 <Route path="admin/assignments" element={
                   <RoleGuard requiredRoles={['org_admin', 'super_admin']}>
                     <PropertyAssignmentPage />
                   </RoleGuard>
                 } />
        </Route>

        {/* Backward compatibility routes */}
        <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/properties" element={<Navigate to="/app/properties" replace />} />
        <Route path="/properties-overview" element={<Navigate to="/app/properties-overview" replace />} />
        <Route path="/spaces" element={<Navigate to="/app/spaces" replace />} />
        <Route path="/tenants" element={<Navigate to="/app/tenants" replace />} />
        <Route path="/rent" element={<Navigate to="/app/rent" replace />} />
        <Route path="/payments" element={<Navigate to="/app/payments" replace />} />
        <Route path="/profile" element={<Navigate to="/app/profile" replace />} />

        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Box>
  );
}

export default App;
