import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  Analytics,
  TrendingUp,
  AttachMoney,
  Home,
  People,
  Assessment,
  DateRange,
  PieChart,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const AnalyticsPage = () => {
  const { userRole } = useAuth();
  const [timeRange, setTimeRange] = useState('month');
  const [reportType, setReportType] = useState('financial');

  // Mock analytics data
  const financialMetrics = {
    totalRevenue: 2450000,
    monthlyGrowth: 12.5,
    collectionRate: 94.2,
    averageRent: 350000,
    overduePending: 145000,
  };

  const propertyMetrics = {
    totalProperties: 12,
    occupancyRate: 89.5,
    avgOccupancyTime: 14, // months
    maintenanceRequests: 8,
    newProperties: 2,
  };

  const userMetrics = {
    totalUsers: 15,
    activeUsers: 12,
    newUsers: 3,
    roleDistribution: [
      { role: 'Property Manager', count: 4, percentage: 26.7 },
      { role: 'Financial Viewer', count: 6, percentage: 40.0 },
      { role: 'Caretaker', count: 3, percentage: 20.0 },
      { role: 'Tenant', count: 2, percentage: 13.3 },
    ]
  };

  const topProperties = [
    { name: 'OSC Building', revenue: 1200000, units: 8, occupancy: 95, status: 'Excellent' },
    { name: 'OSC Land', revenue: 800000, units: 12, occupancy: 85, status: 'Good' },
    { name: 'Kampala Plaza', revenue: 450000, units: 6, occupancy: 78, status: 'Average' },
  ];

  const recentActivities = [
    { date: '2025-01-20', activity: 'New payment received from OSC Building Unit 3', amount: 350000, type: 'payment' },
    { date: '2025-01-19', activity: 'User approved: John Manager (Property Manager)', amount: null, type: 'user' },
    { date: '2025-01-18', activity: 'Property added: Downtown Complex', amount: null, type: 'property' },
    { date: '2025-01-17', activity: 'Maintenance request completed at OSC Land Plot 5', amount: 45000, type: 'maintenance' },
  ];

  if (!userRole || !['org_admin', 'super_admin', 'financial_viewer'].includes(userRole.name)) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Access Denied</Typography>
          <Typography>You don't have permission to view analytics.</Typography>
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Analytics & Reports
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive insights into your property management performance
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
              <MenuItem value="quarter">This Quarter</MenuItem>
              <MenuItem value="year">This Year</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Report Type</InputLabel>
            <Select
              value={reportType}
              label="Report Type"
              onChange={(e) => setReportType(e.target.value)}
            >
              <MenuItem value="financial">Financial</MenuItem>
              <MenuItem value="property">Property</MenuItem>
              <MenuItem value="user">User Activity</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Key Metrics Cards */}
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
                {formatCurrency(financialMetrics.totalRevenue)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <TrendingUp color="success" fontSize="small" />
                <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                  +{financialMetrics.monthlyGrowth}% this month
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
                {propertyMetrics.totalProperties}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {propertyMetrics.occupancyRate}% occupancy rate
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
                {userMetrics.activeUsers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {userMetrics.newUsers} new this month
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Assessment color="warning" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Collection Rate
                </Typography>
              </Box>
              <Typography variant="h4" color="warning.main">
                {financialMetrics.collectionRate}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={financialMetrics.collectionRate} 
                sx={{ mt: 1 }}
                color="warning"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Top Performing Properties */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Performing Properties
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Property</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                      <TableCell align="right">Units</TableCell>
                      <TableCell align="right">Occupancy</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topProperties.map((property, index) => (
                      <TableRow key={index}>
                        <TableCell>{property.name}</TableCell>
                        <TableCell align="right">{formatCurrency(property.revenue)}</TableCell>
                        <TableCell align="right">{property.units}</TableCell>
                        <TableCell align="right">{property.occupancy}%</TableCell>
                        <TableCell>
                          <Chip 
                            label={property.status}
                            color={
                              property.status === 'Excellent' ? 'success' :
                              property.status === 'Good' ? 'primary' : 'warning'
                            }
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* User Role Distribution */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Role Distribution
              </Typography>
              {userMetrics.roleDistribution.map((item, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">{item.role}</Typography>
                    <Typography variant="body2">{item.count} ({item.percentage}%)</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={item.percentage}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activities */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activities
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Activity</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentActivities.map((activity, index) => (
                      <TableRow key={index}>
                        <TableCell>{activity.date}</TableCell>
                        <TableCell>{activity.activity}</TableCell>
                        <TableCell>
                          <Chip
                            label={activity.type}
                            color={
                              activity.type === 'payment' ? 'success' :
                              activity.type === 'user' ? 'info' :
                              activity.type === 'property' ? 'primary' : 'warning'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {activity.amount ? formatCurrency(activity.amount) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsPage;

