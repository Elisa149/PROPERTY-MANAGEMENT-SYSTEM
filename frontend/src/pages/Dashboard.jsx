import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Home,
  AttachMoney,
  Receipt,
  TrendingUp,
  Add,
  Payment,
  Person,
} from '@mui/icons-material';
import { format } from 'date-fns';

import { paymentsAPI, propertiesAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import PropertySelectorDialog from '../components/PropertySelectorDialog';
import AnimatedProgressBar from '../components/common/AnimatedProgressBar';
import AnimatedCounter from '../components/common/AnimatedCounter';
import SystemAdminDashboardPage from './admin/SystemAdminDashboardPage';

const Dashboard = () => {
  const navigate = useNavigate();
  const { hasPermission, hasRole } = useAuth();
  const [propertyDialog, setPropertyDialog] = React.useState(false);

  // Check if super admin (must be before hooks)
  const isSuperAdmin = !!hasRole('super_admin');

  // Fetch dashboard data (always call hooks, even for super admin)
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useQuery('dashboard-summary', paymentsAPI.getDashboardSummary, {
    enabled: !isSuperAdmin, // Only fetch for non-super admins
    retry: 3,
    retryDelay: 1000,
    onError: (error) => {
      console.error('Dashboard summary error:', error);
    }
  });

  const {
    data: propertiesData,
    isLoading: propertiesLoading,
  } = useQuery('properties', propertiesAPI.getAll, {
    enabled: !isSuperAdmin, // Only fetch for non-super admins
  });

  // If user is super admin, show system admin dashboard (after all hooks)
  if (isSuperAdmin) {
    return <SystemAdminDashboardPage />;
  }

  if (summaryLoading || propertiesLoading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  // Create fallback dashboard data from properties if summary fails
  const properties = propertiesData?.data?.properties || [];
  
  const createFallbackData = () => {
    const totalSpaces = properties.reduce((total, property) => {
      if (property.type === 'building' && property.buildingDetails?.floors) {
        return total + property.buildingDetails.floors.reduce((floorTotal, floor) => {
          return floorTotal + (floor.spaces?.length || 0);
        }, 0);
      }
      if (property.type === 'land' && property.landDetails?.squatters) {
        return total + property.landDetails.squatters.length;
      }
      return total;
    }, 0);

    const expectedMonthlyRent = properties.reduce((total, property) => {
      if (property.type === 'building' && property.buildingDetails?.floors) {
        return total + property.buildingDetails.floors.reduce((floorTotal, floor) => {
          return floorTotal + (floor.spaces?.reduce((spaceTotal, space) => 
            spaceTotal + (space.monthlyRent || 0), 0) || 0);
        }, 0);
      }
      if (property.type === 'land' && property.landDetails?.squatters) {
        return total + property.landDetails.squatters.reduce((squatterTotal, squatter) => 
          squatterTotal + (squatter.monthlyPayment || 0), 0);
      }
      return total;
    }, 0);

    return {
      totalProperties: properties.length,
      totalSpaces,
      thisMonth: { 
        collected: 0, 
        expected: expectedMonthlyRent, 
        payments: 0, 
        collectionRate: 0 
      },
      lastMonth: { 
        collected: 0, 
        expected: expectedMonthlyRent, 
        payments: 0, 
        collectionRate: 0 
      },
      recentPayments: []
    };
  };

  const dashboardData = summaryError ? createFallbackData() : (summary?.data || {});
  
  // Show warning if using fallback data
  const usingFallbackData = !!summaryError;

  const formatCurrency = (amount) => {
    try {
      return new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: 'UGX',
        minimumFractionDigits: 0,
      }).format(amount || 0);
    } catch (error) {
      return `UGX ${(amount || 0).toLocaleString()}`;
    }
  };

  const stats = [
    {
      title: 'Total Properties',
      value: dashboardData.totalProperties || 0,
      icon: <Home />,
      color: 'primary',
      animated: true,
    },
    {
      title: 'Total Spaces',
      value: dashboardData.totalSpaces || 0,
      subtitle: 'Rentable units',
      icon: <Person />,
      color: 'info',
      animated: true,
    },
    {
      title: 'This Month Collected',
      value: dashboardData.thisMonth?.collected || 0,
      subtitle: `${dashboardData.thisMonth?.payments || 0} payments`,
      icon: <AttachMoney />,
      color: 'success',
      isCurrency: true,
    },
    {
      title: 'Monthly Potential',
      value: dashboardData.thisMonth?.expected || 0,
      subtitle: `${dashboardData.thisMonth?.collectionRate || 0}% collected`,
      icon: <TrendingUp />,
      color: (dashboardData.thisMonth?.collectionRate || 0) >= 80 ? 'success' : 'warning',
      isCurrency: true,
    },
  ];

  const getCollectionRateColor = (rate) => {
    if (rate >= 90) return 'success';
    if (rate >= 70) return 'warning';
    return 'error';
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome back! Here's what's happening with your properties.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {hasPermission('properties:create:organization') && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/app/properties/new')}
            >
              Add Property
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<Person />}
            onClick={() => setPropertyDialog(true)}
          >
            Assign Tenants
          </Button>
        </Box>
      </Box>

      {/* Property Selector Dialog for Tenant Assignment */}
      <PropertySelectorDialog 
        open={propertyDialog}
        onClose={() => setPropertyDialog(false)}
      />

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 1,
                      backgroundColor: `${stat.color}.light`,
                      color: `${stat.color}.contrastText`,
                      mr: 2,
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Typography variant="h6" component="div">
                    {stat.title}
                  </Typography>
                </Box>
                {stat.isCurrency ? (
                  <AnimatedCounter
                    value={stat.value}
                    formatCurrency={formatCurrency}
                    variant="h4"
                    color={`${stat.color}.main`}
                    sx={{ fontWeight: 'bold' }}
                  />
                ) : stat.animated ? (
                  <AnimatedCounter
                    value={stat.value}
                    variant="h4"
                    color={`${stat.color}.main`}
                    sx={{ fontWeight: 'bold' }}
                  />
                ) : (
                  <Typography variant="h4" component="div" fontWeight="bold">
                    {stat.value}
                  </Typography>
                )}
                {stat.subtitle && (
                  <Typography variant="body2" color="text.secondary">
                    {stat.subtitle}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Collection Rate Progress */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: '100%',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
              },
            }}
          >
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                💰 Monthly Collection Progress
              </Typography>
              <AnimatedProgressBar
                value={dashboardData.thisMonth?.collected || 0}
                total={dashboardData.thisMonth?.expected || 1}
                label="Collection Rate"
                showAmount={true}
                formatCurrency={formatCurrency}
                color="auto"
                height={16}
                animationDuration={2000}
                variant="default"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Month Comparison */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: '100%',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
              },
            }}
          >
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                📊 Month Comparison
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    This Month
                  </Typography>
                  <AnimatedCounter
                    value={dashboardData.thisMonth?.collected || 0}
                    formatCurrency={formatCurrency}
                    variant="h5"
                    color="success.main"
                    sx={{ fontWeight: 'bold' }}
                  />
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Last Month
                  </Typography>
                  <AnimatedCounter
                    value={dashboardData.lastMonth?.collected || 0}
                    formatCurrency={formatCurrency}
                    variant="h5"
                    color="info.main"
                    sx={{ fontWeight: 'bold' }}
                  />
                </Box>
              </Box>
              {dashboardData.thisMonth?.collected !== undefined && dashboardData.lastMonth?.collected !== undefined && (
                <Box>
                  {dashboardData.thisMonth.collected >= dashboardData.lastMonth.collected ? (
                    <Chip
                      label={`+${formatCurrency(dashboardData.thisMonth.collected - dashboardData.lastMonth.collected)} vs last month`}
                      color="success"
                      size="small"
                      icon={<TrendingUp />}
                      sx={{ fontWeight: 'medium' }}
                    />
                  ) : (
                    <Chip
                      label={`-${formatCurrency(dashboardData.lastMonth.collected - dashboardData.thisMonth.collected)} vs last month`}
                      color="error"
                      size="small"
                      sx={{ fontWeight: 'medium' }}
                    />
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Payments */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Recent Payments
                </Typography>
                <Button
                  size="small"
                  endIcon={<Payment />}
                  onClick={() => navigate('/app/payments')}
                >
                  View All
                </Button>
              </Box>
              
              {dashboardData.recentPayments?.length > 0 ? (
                <List>
                  {dashboardData.recentPayments.map((payment, index) => (
                    <ListItem
                      key={payment.id}
                      divider={index < dashboardData.recentPayments.length - 1}
                    >
                      <ListItemText
                        primary={`${payment.propertyName} - ${payment.tenantName}`}
                        secondary={`${payment.paymentMethod} • ${format(new Date(payment.paymentDate), 'MMM dd, yyyy')}`}
                      />
                      <ListItemSecondaryAction>
                        <Typography variant="h6" color="success.main">
                          ${payment.amount.toLocaleString()}
                        </Typography>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No recent payments found
                  </Typography>
                  <Button
                    variant="outlined"
                    sx={{ mt: 2 }}
                    onClick={() => navigate('/app/payments')}
                  >
                    Record Payment
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions for Property Management */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🚀 Quick Actions
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {hasPermission('properties:create:organization') && (
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Add />}
                    onClick={() => navigate('/app/properties/new')}
                  >
                    Add New Property
                  </Button>
                )}
                
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Person />}
                  onClick={() => setPropertyDialog(true)}
                  color="primary"
                >
                  Assign Tenants to Spaces
                </Button>
                
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Receipt />}
                  onClick={() => navigate('/app/rent')}
                >
                  Manage Rent Agreements
                </Button>
                
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Payment />}
                  onClick={() => navigate('/app/payments')}
                >
                  Record Payments
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Property Status Overview */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🏠 Property Overview
              </Typography>
              
              {properties.length > 0 ? (
                <List>
                  {properties.slice(0, 3).map((property) => (
                    <ListItem 
                      key={property.id}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: 'grey.50' },
                        borderRadius: 1,
                        mb: 1,
                      }}
                      onClick={() => navigate(`/app/properties/${property.id}/spaces`)}
                    >
                      <ListItemText
                        primary={property.name}
                        secondary={
                          <React.Fragment>
                            <Typography component="span" variant="body2" color="text.secondary" display="block">
                              {property.type === 'building' && property.buildingDetails 
                                ? `${property.buildingDetails.totalRentableSpaces || 0} spaces`
                                : property.type === 'land' && property.landDetails
                                ? `${property.landDetails.squatters?.length || 0} squatters`
                                : 'No spaces defined'
                              }
                            </Typography>
                            <Typography component="span" variant="body2" color="success.main" display="block">
                              UGX {
                                property.type === 'building' && property.buildingDetails
                                  ? (property.buildingDetails.floors?.reduce((total, floor) => {
                                      const floorIncome = floor.spaces?.reduce((spaceTotal, space) => spaceTotal + (space.monthlyRent || 0), 0) || 0;
                                      return total + floorIncome;
                                    }, 0) || 0).toLocaleString()
                                  : property.type === 'land' && property.landDetails
                                  ? (property.landDetails.squatters?.reduce((total, squatter) => total + (squatter.monthlyPayment || 0), 0) || 0).toLocaleString()
                                  : '0'
                              }/month
                            </Typography>
                          </React.Fragment>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Person />}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/app/properties/${property.id}/spaces`);
                          }}
                        >
                          Assign
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    No properties found
                  </Typography>
                  {hasPermission('properties:create:organization') && (
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Add />}
                      onClick={() => navigate('/app/properties/new')}
                    >
                      Add First Property
                    </Button>
                  )}
                </Box>
              )}
              
              {properties.length > 3 && (
                <Button
                  fullWidth
                  sx={{ mt: 2 }}
                  onClick={() => navigate('/app/properties')}
                >
                  View All Properties ({properties.length})
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
