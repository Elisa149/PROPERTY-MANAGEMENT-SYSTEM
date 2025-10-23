import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Dashboard,
  TrendingUp,
  TrendingDown,
  Home,
  People,
  AttachMoney,
  Warning,
  CheckCircle,
  Schedule,
  Notifications,
  Settings,
  Assessment,
  SupervisorAccount,
  Build,
  Person,
  Email,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { useQuery } from 'react-query';
import { usersAPI } from '../../services/api';
import toast from 'react-hot-toast';

const AdminDashboardPage = () => {
  const { userRole, userProfile } = useAuth();

  // Fetch admin dashboard data from API
  const {
    data: dashboardData,
    isLoading,
    error,
  } = useQuery('adminDashboardStats', usersAPI.getAdminDashboardStats, {
    retry: 2,
    retryDelay: 1000,
    onError: (error) => {
      console.error('Admin dashboard error:', error);
      toast.error(error.response?.data?.error || 'Failed to load dashboard data');
    }
  });

  const dashboardStats = dashboardData?.data?.stats || {
    totalRevenue: 0,
    monthlyGrowth: 0,
    totalProperties: 0,
    activeUsers: 0,
    pendingApprovals: 0,
    collectionRate: 0,
    occupancyRate: 0,
  };

  const recentActivities = dashboardData?.data?.recentActivities || [];
  const pendingApprovals = dashboardData?.data?.pendingApprovals || [];
  const topProperties = dashboardData?.data?.topProperties || [];

  const systemAlerts = [
    {
      id: 1,
      type: 'info',
      message: 'System running smoothly',
      time: 'Now'
    },
  ];

  if (!userRole || !['org_admin', 'super_admin'].includes(userRole.name)) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Access Denied</Typography>
          <Typography>Only organization administrators can access the admin dashboard.</Typography>
        </Alert>
      </Box>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Error Loading Dashboard</Typography>
          <Typography>{error.response?.data?.error || 'Failed to load dashboard data. Please try again.'}</Typography>
        </Alert>
      </Box>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Admin Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {userProfile?.displayName || 'Administrator'}! Here's your organization overview.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Key Metrics */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AttachMoney color="success" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Total Revenue
                </Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {formatCurrency(dashboardStats.totalRevenue)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <TrendingUp color="success" fontSize="small" />
                <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                  +{dashboardStats.monthlyGrowth}% this month
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Home color="primary" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Properties
                </Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {dashboardStats.totalProperties}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {dashboardStats.occupancyRate}% occupancy rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <People color="info" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Active Users
                </Typography>
              </Box>
              <Typography variant="h4" color="info.main">
                {dashboardStats.activeUsers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Across all roles
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: dashboardStats.pendingApprovals > 0 ? 'warning.50' : 'background.paper' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Schedule color="warning" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Pending Approvals
                </Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                {dashboardStats.pendingApprovals}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Require your attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Pending User Approvals */}
        {dashboardStats.pendingApprovals > 0 && (
          <Grid item xs={12}>
            <Card sx={{ bgcolor: 'warning.50' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" color="warning.main">
                    ⚠️ Pending User Approvals ({dashboardStats.pendingApprovals})
                  </Typography>
                  <Button variant="contained" color="warning" href="/app/users">
                    Review All
                  </Button>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Requested Role</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Message</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pendingApprovals.map((approval) => (
                        <TableRow key={approval.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
                                <Person />
                              </Avatar>
                              {approval.userName}
                            </Box>
                          </TableCell>
                          <TableCell>{approval.email}</TableCell>
                          <TableCell>
                            <Chip label={approval.requestedRole} size="small" />
                          </TableCell>
                          <TableCell>
                            {approval.requestDate instanceof Date 
                              ? format(approval.requestDate, 'MMM dd, yyyy')
                              : approval.requestDate}
                          </TableCell>
                          <TableCell sx={{ maxWidth: 200 }}>
                            <Typography variant="body2" noWrap>
                              {approval.message}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Performance Overview */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Property Performance Overview
              </Typography>
              {topProperties.map((property, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Home color="primary" sx={{ mr: 1 }} />
                      <Typography variant="body1">{property.name}</Typography>
                      {property.trend === 'up' ? (
                        <TrendingUp color="success" sx={{ ml: 1 }} />
                      ) : (
                        <TrendingDown color="warning" sx={{ ml: 1 }} />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {formatCurrency(property.revenue)} • {property.occupancy}% occupied
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={property.occupancy}
                    sx={{ height: 8, borderRadius: 4 }}
                    color={property.occupancy > 90 ? 'success' : property.occupancy > 75 ? 'primary' : 'warning'}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <List dense>
                <ListItem button component="a" href="/app/users">
                  <ListItemIcon>
                    <People color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Manage Users" secondary="Review access requests" />
                </ListItem>
                <ListItem button component="a" href="/app/admin/settings">
                  <ListItemIcon>
                    <Settings color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Organization Settings" secondary="Configure system" />
                </ListItem>
                <ListItem button component="a" href="/app/admin/analytics">
                  <ListItemIcon>
                    <Assessment color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="View Analytics" secondary="Performance reports" />
                </ListItem>
                <ListItem button component="a" href="/app/admin/assignments">
                  <ListItemIcon>
                    <SupervisorAccount color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Property Assignments" secondary="Assign staff to properties" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activities */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activities
              </Typography>
              <List>
                {recentActivities.map((activity) => (
                  <ListItem key={activity.id}>
                    <ListItemIcon>
                      {activity.type === 'payment' && <AttachMoney color="success" />}
                      {activity.type === 'user' && <Person color="info" />}
                      {activity.type === 'maintenance' && <Build color="warning" />}
                      {activity.type === 'property' && <Home color="primary" />}
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.message}
                      secondary={activity.time}
                    />
                    <Chip
                      label={activity.status}
                      color={
                        activity.status === 'success' ? 'success' :
                        activity.status === 'pending' ? 'warning' : 'default'
                      }
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* System Alerts */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Alerts
              </Typography>
              <List>
                {systemAlerts.map((alert) => (
                  <ListItem key={alert.id}>
                    <ListItemIcon>
                      {alert.type === 'warning' ? (
                        <Warning color="warning" />
                      ) : (
                        <Notifications color="info" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={alert.message}
                      secondary={alert.time}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboardPage;

