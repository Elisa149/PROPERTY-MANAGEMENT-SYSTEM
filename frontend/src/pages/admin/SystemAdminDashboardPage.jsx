import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Alert,
  Button,
} from '@mui/material';
import {
  Business,
  People,
  Home,
  AttachMoney,
  TrendingUp,
  CheckCircle,
  Warning,
  Schedule,
  Add,
  Settings,
  Assessment,
  ManageAccounts,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { organizationsAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const SystemAdminDashboardPage = () => {
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  if (!hasRole('super_admin')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Access Denied</Typography>
          <Typography>Only Super Administrators can access the system admin dashboard.</Typography>
        </Alert>
      </Box>
    );
  }

  // Fetch all organizations
  const {
    data: orgsData,
    isLoading: orgsLoading,
    error: orgsError,
  } = useQuery('organizations', organizationsAPI.getAll, {
    retry: 2,
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to load organizations');
    },
  });

  // Fetch all users (Super Admin endpoint)
  const {
    data: usersData,
    isLoading: usersLoading,
  } = useQuery('allUsers', () => usersAPI.getAllUsers(), {
    retry: 2,
    enabled: hasRole('super_admin'),
    onError: (error) => {
      console.error('Failed to load users:', error);
    },
  });

  const organizations = orgsData?.data?.organizations || [];
  const allUsers = usersData?.data?.users || [];

  if (orgsLoading || usersLoading) {
    return <LoadingSpinner />;
  }

  if (orgsError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Error Loading Data</Typography>
          <Typography>{orgsError.message || 'Failed to load dashboard data'}</Typography>
        </Alert>
      </Box>
    );
  }

  // Calculate system-wide statistics
  const systemStats = {
    totalOrganizations: organizations.length,
    activeOrganizations: organizations.filter((o) => o.status === 'active').length,
    totalUsers: allUsers.length,
    activeUsers: allUsers.filter((u) => u.status === 'active').length,
    pendingUsers: allUsers.filter(
      (u) => u.status === 'pending' || u.status === 'pending_approval'
    ).length,
    totalRentRecords: organizations.reduce((sum, o) => sum + (o.rentCount || 0), 0),
    activeRentRecords: organizations.reduce((sum, o) => sum + (o.activeRentCount || 0), 0),
    totalMonthlyRent: organizations.reduce((sum, o) => sum + (o.totalMonthlyRent || 0), 0),
    totalProperties: organizations.reduce((sum, o) => sum + (o.propertyCount || 0), 0),
  };

  // Get top organizations by rent activity
  const topOrganizations = [...organizations]
    .filter((o) => (o.activeRentCount || 0) > 0)
    .sort((a, b) => (b.activeRentCount || 0) - (a.activeRentCount || 0))
    .slice(0, 5);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            System Administration Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Overview of all organizations, users, and system activity
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/app/admin/organizations')}
            sx={{ minWidth: 180 }}
          >
            Create Organization
          </Button>
          <Button
            variant="outlined"
            startIcon={<Settings />}
            onClick={() => navigate('/app/admin/system-settings')}
          >
            System Settings
          </Button>
        </Box>
      </Box>

      {/* Quick Actions */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              cursor: 'pointer', 
              '&:hover': { bgcolor: 'action.hover' },
              transition: 'background-color 0.2s'
            }}
            onClick={() => navigate('/app/admin/organizations')}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Business sx={{ fontSize: 32, color: 'primary.main' }} />
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Manage Organizations
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    View & Edit All
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              cursor: 'pointer', 
              '&:hover': { bgcolor: 'action.hover' },
              transition: 'background-color 0.2s'
            }}
            onClick={() => navigate('/app/admin/users')}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <People sx={{ fontSize: 32, color: 'primary.main' }} />
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Manage Users
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    View & Edit All
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              cursor: 'pointer', 
              '&:hover': { bgcolor: 'action.hover' },
              transition: 'background-color 0.2s'
            }}
            onClick={() => navigate('/app/admin/global-analytics')}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Assessment sx={{ fontSize: 32, color: 'primary.main' }} />
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    View Analytics
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    System Reports
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              cursor: 'pointer', 
              '&:hover': { bgcolor: 'action.hover' },
              transition: 'background-color 0.2s'
            }}
            onClick={() => navigate('/app/admin/system-settings')}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Settings sx={{ fontSize: 32, color: 'primary.main' }} />
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    System Settings
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Configure System
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* System Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Organizations
                  </Typography>
                  <Typography variant="h4">{systemStats.totalOrganizations}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {systemStats.activeOrganizations} active
                  </Typography>
                </Box>
                <Business sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Users
                  </Typography>
                  <Typography variant="h4">{systemStats.totalUsers}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {systemStats.activeUsers} active, {systemStats.pendingUsers} pending
                  </Typography>
                </Box>
                <People sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Active Rent Records
                  </Typography>
                  <Typography variant="h4">{systemStats.activeRentRecords}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {systemStats.totalRentRecords} total
                  </Typography>
                </Box>
                <Home sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Monthly Rent
                  </Typography>
                  <Typography variant="h4">
                    {organizations.length > 0
                      ? `${organizations[0].settings?.currency || 'UGX'} ${systemStats.totalMonthlyRent.toLocaleString()}`
                      : 'UGX 0'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Across all organizations
                  </Typography>
                </Box>
                <AttachMoney sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Organizations Overview */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Organizations Overview
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Organization</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Users</TableCell>
                    <TableCell>Rent Activity</TableCell>
                    <TableCell>Monthly Rent</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {organizations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                        <Typography color="text.secondary">No organizations found</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    organizations.slice(0, 10).map((org) => (
                      <TableRow key={org.id} hover>
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {org.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={org.status || 'active'}
                            color={
                              org.status === 'active'
                                ? 'success'
                                : org.status === 'suspended'
                                ? 'error'
                                : 'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {org.activeUserCount || 0} / {org.userCount || 0}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {org.activeRentCount || 0} active
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {org.settings?.currency || 'UGX'}{' '}
                            {(org.totalMonthlyRent || 0).toLocaleString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              System Health
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Active Organizations</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {systemStats.activeOrganizations} / {systemStats.totalOrganizations}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={
                    systemStats.totalOrganizations > 0
                      ? (systemStats.activeOrganizations / systemStats.totalOrganizations) * 100
                      : 0
                  }
                  color="success"
                />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Active Users</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {systemStats.activeUsers} / {systemStats.totalUsers}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={
                    systemStats.totalUsers > 0
                      ? (systemStats.activeUsers / systemStats.totalUsers) * 100
                      : 0
                  }
                  color="primary"
                />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Active Rent Records</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {systemStats.activeRentRecords} / {systemStats.totalRentRecords}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={
                    systemStats.totalRentRecords > 0
                      ? (systemStats.activeRentRecords / systemStats.totalRentRecords) * 100
                      : 0
                  }
                  color="success"
                />
              </Box>
            </Box>
          </Paper>

          {/* Top Organizations by Activity */}
          {topOrganizations.length > 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Top Organizations
              </Typography>
              <Box sx={{ mt: 2 }}>
                {topOrganizations.map((org, index) => (
                  <Box
                    key={org.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1.5,
                      borderBottom:
                        index < topOrganizations.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {org.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {org.activeRentCount} active rentals
                      </Typography>
                    </Box>
                    <Chip
                      label={`#${index + 1}`}
                      color="primary"
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                ))}
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default SystemAdminDashboardPage;

