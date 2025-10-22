import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add,
  MoreVert,
  Edit,
  Delete,
  Home,
  LocationOn,
  AttachMoney,
  Person,
  Apartment,
  CheckCircle,
  RadioButtonUnchecked,
  Groups,
} from '@mui/icons-material';
import toast from 'react-hot-toast';

import { propertiesAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import PropertySelectorDialog from '../components/PropertySelectorDialog';

const PropertiesPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyDialog, setPropertyDialog] = useState(false);

  // Fetch properties
  const {
    data: propertiesData,
    isLoading,
    error,
  } = useQuery('properties', propertiesAPI.getAll);

  // Delete property mutation
  const deletePropertyMutation = useMutation(propertiesAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('properties');
      toast.success('Property deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedProperty(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete property');
    },
  });

  const properties = propertiesData?.data?.properties || [];

  // Debug logging
  console.log('🏢 PropertiesPage - API Response:', propertiesData);
  console.log('🏢 PropertiesPage - Properties array:', properties);
  console.log('🏢 PropertiesPage - Properties count:', properties.length);

  const handleMenuClick = (event, property) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedProperty(property);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedProperty(null);
  };

  const handleEdit = () => {
    if (selectedProperty) {
      navigate(`/app/properties/${selectedProperty.id}?edit=true`);
    }
    handleMenuClose();
  };

  const handleAssignSpaces = () => {
    if (selectedProperty) {
      navigate(`/app/properties/${selectedProperty.id}/spaces`);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    handleMenuClose();
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedProperty) {
      deletePropertyMutation.mutate(selectedProperty.id);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'occupied':
        return 'success';
      case 'vacant':
        return 'warning';
      case 'maintenance':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'occupied':
        return 'Occupied';
      case 'vacant':
        return 'Vacant';
      case 'maintenance':
        return 'Maintenance';
      default:
        return status;
    }
  };

  // Helper function to calculate available spaces for each property
  const getSpaceAvailability = (property) => {
    if (property.type === 'building' && property.buildingDetails) {
      const floors = property.buildingDetails.floors || [];
      let totalSpaces = 0;
      let occupiedSpaces = 0;
      let availableSpaces = 0;

      floors.forEach(floor => {
        if (floor.spaces) {
          floor.spaces.forEach(space => {
            totalSpaces++;
            if (space.tenant && space.tenant.name) {
              occupiedSpaces++;
            } else {
              availableSpaces++;
            }
          });
        }
      });

      return {
        total: totalSpaces,
        occupied: occupiedSpaces,
        available: availableSpaces,
        occupancyRate: totalSpaces > 0 ? Math.round((occupiedSpaces / totalSpaces) * 100) : 0
      };
    } 
    
    if (property.type === 'land' && property.landDetails) {
      const squatters = property.landDetails.squatters || [];
      return {
        total: squatters.length,
        occupied: squatters.length,
        available: 0,
        occupancyRate: 100
      };
    }

    return {
      total: 0,
      occupied: 0,
      available: 0,
      occupancyRate: 0
    };
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading properties..." />;
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load properties. Please try again.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            Properties & Tenant Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View all properties and available spaces for tenant assignments
          </Typography>
        </Box>
        {hasPermission('properties:create:organization') && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/app/properties/new')}
          >
            Add Property
          </Button>
        )}
      </Box>

      {/* Portfolio Summary for Tenant Management */}
      {properties.length > 0 && (
        <Card sx={{ mb: 4, backgroundColor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary.main" sx={{ display: 'flex', alignItems: 'center' }}>
              <Groups sx={{ mr: 1 }} />
              Portfolio Space Summary
            </Typography>
            
            {(() => {
              const totalSummary = properties.reduce((acc, property) => {
                const spaceInfo = getSpaceAvailability(property);
                acc.totalSpaces += spaceInfo.total;
                acc.occupiedSpaces += spaceInfo.occupied;
                acc.availableSpaces += spaceInfo.available;
                return acc;
              }, { totalSpaces: 0, occupiedSpaces: 0, availableSpaces: 0 });

              const overallOccupancyRate = totalSummary.totalSpaces > 0 
                ? Math.round((totalSummary.occupiedSpaces / totalSummary.totalSpaces) * 100) 
                : 0;

              return (
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" fontWeight="bold" color="primary.main">
                        {totalSummary.totalSpaces}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Spaces
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" fontWeight="bold" color="success.main">
                        {totalSummary.occupiedSpaces}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Occupied
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" fontWeight="bold" color="warning.main">
                        {totalSummary.availableSpaces}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Available
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" fontWeight="bold" color="info.main">
                        {overallOccupancyRate}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Occupancy Rate
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              );
            })()}

            {/* Available Spaces Call-to-Action */}
            {(() => {
              const availableCount = properties.reduce((acc, property) => {
                return acc + getSpaceAvailability(property).available;
              }, 0);
              
              return availableCount > 0 && (
                <Box sx={{ mt: 3, p: 2, backgroundColor: 'success.100', borderRadius: 2 }}>
                  <Typography variant="body1" fontWeight="medium" color="success.dark">
                    🎯 You have {availableCount} space{availableCount > 1 ? 's' : ''} ready for new tenants!
                  </Typography>
                  <Typography variant="body2" color="success.dark" sx={{ mt: 0.5 }}>
                    Click on any property below to manage tenant assignments.
                  </Typography>
                </Box>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Properties Grid */}
      {properties.length > 0 ? (
        <Grid container spacing={3}>
          {properties.map((property) => (
            <Grid item xs={12} sm={6} md={4} key={property.id}>
              <Card
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  },
                }}
                onClick={() => navigate(`/properties/${property.id}`)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" component="h3" gutterBottom>
                        {property.name}
                      </Typography>
                      <Chip
                        label={getStatusLabel(property.status)}
                        color={getStatusColor(property.status)}
                        size="small"
                      />
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuClick(e, property)}
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationOn fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {property.location?.village}, {property.location?.district}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Home fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {property.type?.charAt(0).toUpperCase() + property.type?.slice(1)} • {property.ownershipType || 'Unknown'}
                    </Typography>
                  </Box>

                  {/* Space Availability Display */}
                  {(() => {
                    const spaceInfo = getSpaceAvailability(property);
                    return (
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Apartment fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography variant="body2" fontWeight="medium">
                            Space Availability
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CheckCircle fontSize="small" sx={{ mr: 0.5, color: 'success.main' }} />
                            <Typography variant="body2" color="success.main">
                              {spaceInfo.occupied} Occupied
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <RadioButtonUnchecked fontSize="small" sx={{ mr: 0.5, color: 'warning.main' }} />
                            <Typography variant="body2" color="warning.main">
                              {spaceInfo.available} Available
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Total: {spaceInfo.total} spaces
                          </Typography>
                          {spaceInfo.total > 0 && (
                            <Chip
                              label={`${spaceInfo.occupancyRate}% Occupied`}
                              size="small"
                              color={spaceInfo.occupancyRate >= 80 ? 'success' : spaceInfo.occupancyRate >= 50 ? 'warning' : 'error'}
                              variant="outlined"
                            />
                          )}
                        </Box>

                        {/* Available Space Highlight */}
                        {spaceInfo.available > 0 && (
                          <Box 
                            sx={{ 
                              mt: 1, 
                              p: 1, 
                              backgroundColor: 'success.50', 
                              borderRadius: 1, 
                              border: '1px solid',
                              borderColor: 'success.200'
                            }}
                          >
                            <Typography variant="body2" color="success.dark" fontWeight="medium">
                              🎉 {spaceInfo.available} space{spaceInfo.available > 1 ? 's' : ''} ready for new tenants!
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    );
                  })()}

                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AttachMoney fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
                    <Typography variant="h6" color="success.main">
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
                  </Box>

                  {property.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 2,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {property.description}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            backgroundColor: 'grey.50',
            borderRadius: 2,
            border: '2px dashed',
            borderColor: 'grey.300',
          }}
        >
          <Home sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No properties found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Start by adding your first property to begin tracking rent and payments.
          </Typography>
          {hasPermission('properties:create:organization') && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/app/properties/new')}
            >
              Add Your First Property
            </Button>
          )}
        </Box>
      )}

      {/* Property Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleAssignSpaces}>
          <Groups fontSize="small" sx={{ mr: 1 }} />
          Manage Tenants
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Edit Property
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Delete Property
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Property</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedProperty?.name}"? This will also delete all related rent records and payments.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmDelete}
            color="error"
            disabled={deletePropertyMutation.isLoading}
          >
            {deletePropertyMutation.isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PropertiesPage;
