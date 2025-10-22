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

const AdminDashboardPage = () => {
  const { userRole, userProfile } = useAuth();

  // Mock dashboard data
  const dashboardStats = {
    totalRevenue: 2450000,
    monthlyGrowth: 12.5,
    totalProperties: 12,
    activeUsers: 15,
    pendingApprovals: 3,
    maintenanceRequests: 8,
    collectionRate: 94.2,
    occupancyRate: 89.5,
  };

  const recentActivities = [
    {
      id: 1,
      type: 'payment',
      message: 'Payment received from OSC Building Unit 3',
      amount: 350000,
      time: '2 hours ago',
      status: 'success'
    },
    {
      id: 2,
      type: 'user',
      message: 'New user registration: Jane Smith',
      time: '4 hours ago',
      status: 'pending'
    },
    {
      id: 3,
      type: 'maintenance',
      message: 'Maintenance request at Downtown Complex',
      time: '6 hours ago',
      status: 'warning'
    },
    {
      id: 4,
      type: 'property',
      message: 'New property added: Suburb Apartments',
      time: '1 day ago',
      status: 'success'
    },
  ];

  const pendingApprovals = [
    {
      id: 1,
      userName: 'John Doe',
      email: 'john@example.com',
      requestedRole: 'Property Manager',
      requestDate: '2025-01-20',
      message: 'Experienced in property management with 5 years background'
    },
    {
      id: 2,
      userName: 'Sarah Wilson',
      email: 'sarah@example.com',
      requestedRole: 'Financial Viewer',
      requestDate: '2025-01-19',
      message: 'Need access to financial reports for accounting purposes'
    },
    {
      id: 3,
      userName: 'Mike Johnson',
      email: 'mike@example.com',
      requestedRole: 'Caretaker',
      requestDate: '2025-01-18',
      message: 'On-site maintenance staff for OSC properties'
    },
  ];

  const topProperties = [
    { name: 'OSC Building', revenue: 1200000, occupancy: 95, trend: 'up' },
    { name: 'OSC Land', revenue: 800000, occupancy: 85, trend: 'up' },
    { name: 'Downtown Complex', revenue: 450000, occupancy: 78, trend: 'down' },
  ];

  const systemAlerts = [
    {
      id: 1,
      type: 'warning',
      message: 'Server backup completed with warnings',
      time: '1 hour ago'
    },
    {
      id: 2,
      type: 'info',
      message: 'System maintenance scheduled for Sunday 2 AM',
      time: '3 hours ago'
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
                          <TableCell>{approval.requestDate}</TableCell>
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

