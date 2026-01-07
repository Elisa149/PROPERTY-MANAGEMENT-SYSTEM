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
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Home,
  People,
  Business,
  Assessment,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { organizationsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const GlobalAnalyticsPage = () => {
  const { hasRole } = useAuth();

  if (!hasRole('super_admin')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Access Denied</Typography>
          <Typography>Only Super Administrators can access global analytics.</Typography>
        </Alert>
      </Box>
    );
  }

  // Fetch all organizations with statistics
  const {
    data: orgsData,
    isLoading,
    error,
  } = useQuery('organizations', organizationsAPI.getAll, {
    retry: 2,
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to load analytics data');
    },
  });

  const organizations = orgsData?.data?.organizations || [];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Error Loading Analytics</Typography>
          <Typography>{error.message || 'Failed to load analytics data'}</Typography>
        </Alert>
      </Box>
    );
  }

  // Calculate global statistics
  const globalStats = {
    totalOrganizations: organizations.length,
    activeOrganizations: organizations.filter((o) => o.status === 'active').length,
    totalUsers: organizations.reduce((sum, o) => sum + (o.userCount || 0), 0),
    activeUsers: organizations.reduce((sum, o) => sum + (o.activeUserCount || 0), 0),
    totalRentRecords: organizations.reduce((sum, o) => sum + (o.rentCount || 0), 0),
    activeRentRecords: organizations.reduce((sum, o) => sum + (o.activeRentCount || 0), 0),
    totalMonthlyRent: organizations.reduce((sum, o) => sum + (o.totalMonthlyRent || 0), 0),
    totalProperties: organizations.reduce((sum, o) => sum + (o.propertyCount || 0), 0),
  };

  // Sort organizations by activity
  const sortedByRent = [...organizations]
    .filter((o) => (o.activeRentCount || 0) > 0)
    .sort((a, b) => (b.activeRentCount || 0) - (a.activeRentCount || 0))
    .slice(0, 10);

  const sortedByUsers = [...organizations]
    .filter((o) => (o.userCount || 0) > 0)
    .sort((a, b) => (b.userCount || 0) - (a.userCount || 0))
    .slice(0, 10);

  const sortedByRevenue = [...organizations]
    .filter((o) => (o.totalMonthlyRent || 0) > 0)
    .sort((a, b) => (b.totalMonthlyRent || 0) - (a.totalMonthlyRent || 0))
    .slice(0, 10);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Global Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary">
          System-wide analytics and insights across all organizations
        </Typography>
      </Box>

      {/* Global Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Organizations
                  </Typography>
                  <Typography variant="h4">{globalStats.totalOrganizations}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {globalStats.activeOrganizations} active
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
                  <Typography variant="h4">{globalStats.totalUsers}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {globalStats.activeUsers} active
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
                    Active Rentals
                  </Typography>
                  <Typography variant="h4">{globalStats.activeRentRecords}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {globalStats.totalRentRecords} total
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
                    Monthly Revenue
                  </Typography>
                  <Typography variant="h4">
                    {organizations.length > 0
                      ? `${organizations[0].settings?.currency || 'UGX'} ${globalStats.totalMonthlyRent.toLocaleString()}`
                      : 'UGX 0'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    All organizations
                  </Typography>
                </Box>
                <AttachMoney sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Top Organizations by Revenue */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp color="success" />
              Top Organizations by Revenue
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Organization</TableCell>
                    <TableCell align="right">Monthly Rent</TableCell>
                    <TableCell align="right">Active Rentals</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedByRevenue.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                        <Typography color="text.secondary">No revenue data available</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedByRevenue.map((org, index) => (
                      <TableRow key={org.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label={`#${index + 1}`} color="primary" size="small" />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {org.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {org.settings?.currency || 'UGX'}{' '}
                            {(org.totalMonthlyRent || 0).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">{org.activeRentCount || 0}</Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Top Organizations by Users */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <People color="primary" />
              Top Organizations by Users
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Organization</TableCell>
                    <TableCell align="right">Total Users</TableCell>
                    <TableCell align="right">Active Users</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedByUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                        <Typography color="text.secondary">No user data available</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedByUsers.map((org, index) => (
                      <TableRow key={org.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label={`#${index + 1}`} color="primary" size="small" />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {org.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {org.userCount || 0}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">{org.activeUserCount || 0}</Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Organization Activity Overview */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assessment color="primary" />
              Organization Activity Overview
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Organization</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Users</TableCell>
                    <TableCell>Rent Activity</TableCell>
                    <TableCell>Monthly Revenue</TableCell>
                    <TableCell>Activity Score</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {organizations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">No organizations found</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    organizations.map((org) => {
                      // Calculate activity score (0-100)
                      const activityScore =
                        ((org.activeUserCount || 0) > 0 ? 30 : 0) +
                        ((org.activeRentCount || 0) > 0 ? 50 : 0) +
                        ((org.totalMonthlyRent || 0) > 0 ? 20 : 0);

                      return (
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
                              {org.activeRentCount || 0} active rentals
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {org.settings?.currency || 'UGX'}{' '}
                              {(org.totalMonthlyRent || 0).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={activityScore}
                                sx={{ width: 100, height: 8, borderRadius: 1 }}
                                color={
                                  activityScore >= 70
                                    ? 'success'
                                    : activityScore >= 40
                                    ? 'warning'
                                    : 'error'
                                }
                              />
                              <Typography variant="body2" sx={{ minWidth: 35 }}>
                                {activityScore}%
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GlobalAnalyticsPage;

