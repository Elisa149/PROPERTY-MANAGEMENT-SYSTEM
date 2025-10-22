import React, { useState } from 'react';
import { useQuery } from 'react-query';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Collapse,
  Alert,
  LinearProgress,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Home,
  Apartment,
  Terrain,
  LocationOn,
  AttachMoney,
  People,
  CalendarToday,
  Info,
  Visibility,
  Assessment,
} from '@mui/icons-material';
import { format } from 'date-fns';

import { propertiesAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

const PropertiesOverviewPage = () => {
  const [expandedProperty, setExpandedProperty] = useState(null);  
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  // Fetch properties data
  const {
    data: propertiesData,
    isLoading,
    error,
  } = useQuery('properties', propertiesAPI.getAll);

  const properties = propertiesData?.data?.properties || [];

  if (isLoading) {
    return <LoadingSpinner message="Loading properties overview..." />;
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load properties data: {error.response?.data?.error || error.message}
      </Alert>
    );
  }

  // Calculate overview statistics
  const stats = {
    totalProperties: properties.length,
    buildings: properties.filter(p => p.type === 'building').length,
    lands: properties.filter(p => p.type === 'land').length,
    totalSpaces: properties.reduce((total, property) => {
      if (property.type === 'building' && property.buildingDetails?.floors) {
        return total + property.buildingDetails.floors.reduce((floorTotal, floor) => {
          return floorTotal + (floor.spaces?.length || 0);
        }, 0);
      }
      return total;
    }, 0),
    totalSquatters: properties.reduce((total, property) => {
      if (property.type === 'land' && property.landDetails?.squatters) {
        return total + property.landDetails.squatters.length;
      }
      return total;
    }, 0),
    totalMonthlyIncome: properties.reduce((total, property) => {
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
    }, 0),
  };

  const handleExpandClick = (propertyId) => {
    setExpandedProperty(expandedProperty === propertyId ? null : propertyId);
  };

  const handleViewDetails = (property) => {
    setSelectedProperty(property);
    setDialogOpen(true);
  };

  const getPropertyIcon = (type) => {
    return type === 'building' ? <Apartment /> : <Terrain />;
  };

  const getStatusColor = (status) => {
    const statusColors = {
      vacant: 'warning',
      occupied: 'success',
      maintenance: 'error',
      under_construction: 'info',
    };
    return statusColors[status] || 'default';
  };

  const renderPropertyDetails = (property) => {
    if (property.type === 'building') {
      return (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>Building Details</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography><strong>Building Type:</strong> {property.buildingDetails?.buildingType}</Typography>
              <Typography><strong>Floors:</strong> {property.buildingDetails?.numberOfFloors}</Typography>
              <Typography><strong>Total Spaces:</strong> {property.buildingDetails?.totalRentableSpaces}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography><strong>Plot Number:</strong> {property.plotNumber || 'N/A'}</Typography>
              <Typography><strong>Ownership:</strong> {property.ownershipType}</Typography>
              <Typography><strong>Caretaker:</strong> {property.caretakerName}</Typography>
            </Grid>
          </Grid>
          
          {property.buildingDetails?.floors && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>Floors & Spaces</Typography>
              {property.buildingDetails.floors.map((floor, index) => (
                <Card key={index} sx={{ mb: 1, bgcolor: 'grey.50' }}>
                  <CardContent sx={{ pb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Floor {floor.floorNumber} - {floor.floorName || `Floor ${floor.floorNumber}`}
                    </Typography>
                    <Grid container spacing={1} sx={{ mt: 1 }}>
                      {floor.spaces?.map((space, spaceIndex) => (
                        <Grid item xs={12} sm={6} md={4} key={spaceIndex}>
                          <Paper sx={{ p: 1, bgcolor: 'white' }}>
                            <Typography variant="body2" fontWeight="bold">{space.spaceName}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {space.spaceType} • UGX {space.monthlyRent?.toLocaleString()}/month
                            </Typography>
                            <br />
                            <Chip 
                              label={space.status} 
                              size="small" 
                              color={getStatusColor(space.status)}
                              sx={{ mt: 0.5 }}
                            />
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      );
    } else if (property.type === 'land') {
      return (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>Land Details</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography><strong>Total Area:</strong> {property.landDetails?.totalArea || 'N/A'}</Typography>
              <Typography><strong>Land Use:</strong> {property.landDetails?.landUse}</Typography>
              <Typography><strong>Total Squatters:</strong> {property.landDetails?.totalSquatters || 0}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography><strong>Plot Number:</strong> {property.plotNumber || 'N/A'}</Typography>
              <Typography><strong>Ownership:</strong> {property.ownershipType}</Typography>
              <Typography><strong>Caretaker:</strong> {property.caretakerName}</Typography>
            </Grid>
          </Grid>

          {property.landDetails?.squatters && property.landDetails.squatters.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>Squatters</Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Area</TableCell>
                      <TableCell>Size</TableCell>
                      <TableCell>Monthly Payment</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {property.landDetails.squatters.map((squatter, index) => (
                      <TableRow key={index}>
                        <TableCell>{squatter.squatterName}</TableCell>
                        <TableCell>{squatter.assignedArea}</TableCell>
                        <TableCell>{squatter.areaSize || 'N/A'}</TableCell>
                        <TableCell>UGX {squatter.monthlyPayment?.toLocaleString()}</TableCell>
                        <TableCell>
                          <Chip 
                            label={squatter.status} 
                            size="small" 
                            color={squatter.status === 'active' ? 'success' : 'warning'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      );
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            Properties Collection Overview
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive view of all properties, spaces, and data from your collection
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assessment color="primary" />
          <Typography variant="h6" color="primary" fontWeight="bold">
            {properties.length} Properties
          </Typography>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Home sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold" color="primary">
                {stats.totalProperties}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Properties
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Apartment sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold" color="info.main">
                {stats.buildings}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Buildings
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Terrain sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {stats.lands}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Land Properties
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <People sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {stats.totalSpaces + stats.totalSquatters}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Rentable Units
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stats.totalSpaces} spaces • {stats.totalSquatters} squatters
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AttachMoney sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" fontWeight="bold" color="success.main">
                UGX {stats.totalMonthlyIncome.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Monthly Income
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Properties List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Home />
            Properties Collection Data
          </Typography>
          
          {properties.length === 0 ? (
            <Alert severity="info">
              No properties found in your collection. Add your first property to get started!
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Property</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Monthly Income</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {properties.map((property) => {
                    const monthlyIncome = property.type === 'building' 
                      ? property.buildingDetails?.floors?.reduce((total, floor) => 
                          total + (floor.spaces?.reduce((spaceTotal, space) => 
                            spaceTotal + (space.monthlyRent || 0), 0) || 0), 0) || 0
                      : property.landDetails?.squatters?.reduce((total, squatter) => 
                          total + (squatter.monthlyPayment || 0), 0) || 0;

                    return (
                      <React.Fragment key={property.id}>
                        <TableRow>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {getPropertyIcon(property.type)}
                              <Box>
                                <Typography variant="subtitle2" fontWeight="bold">
                                  {property.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  ID: {property.id.substring(0, 8)}...
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={property.type} 
                              size="small"
                              color={property.type === 'building' ? 'primary' : 'success'}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2">
                                {property.location.village}, {property.location.district}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={property.status} 
                              size="small"
                              color={getStatusColor(property.status)}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold" color="success.main">
                              UGX {monthlyIncome.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {property.createdAt ? format(new Date(property.createdAt), 'MMM dd, yyyy') : 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title="View Details">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleViewDetails(property)}
                                >
                                  <Visibility />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={expandedProperty === property.id ? "Collapse" : "Expand"}>
                                <IconButton 
                                  size="small"
                                  onClick={() => handleExpandClick(property.id)}
                                >
                                  {expandedProperty === property.id ? <ExpandLess /> : <ExpandMore />}
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                        
                        {/* Expanded Row */}
                        <TableRow>
                          <TableCell colSpan={7} sx={{ p: 0 }}>
                            <Collapse in={expandedProperty === property.id}>
                              <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                                {renderPropertyDetails(property)}
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Property Details Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {selectedProperty && getPropertyIcon(selectedProperty.type)}
            {selectedProperty?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedProperty && (
            <Box>
              <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                <Tab label="Basic Info" />
                <Tab label="Location" />
                <Tab label={selectedProperty.type === 'building' ? 'Building Details' : 'Land Details'} />
              </Tabs>
              
              <Box sx={{ mt: 2 }}>
                {tabValue === 0 && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography><strong>Name:</strong> {selectedProperty.name}</Typography>
                      <Typography><strong>Type:</strong> {selectedProperty.type}</Typography>
                      <Typography><strong>Status:</strong> {selectedProperty.status}</Typography>
                      <Typography><strong>Ownership:</strong> {selectedProperty.ownershipType}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography><strong>Caretaker:</strong> {selectedProperty.caretakerName}</Typography>
                      <Typography><strong>Phone:</strong> {selectedProperty.caretakerPhone}</Typography>
                      <Typography><strong>Plot Number:</strong> {selectedProperty.plotNumber || 'N/A'}</Typography>
                      <Typography><strong>Establishment:</strong> {selectedProperty.establishmentDate ? format(new Date(selectedProperty.establishmentDate), 'MMM dd, yyyy') : 'N/A'}</Typography>
                    </Grid>
                    {selectedProperty.description && (
                      <Grid item xs={12}>
                        <Typography><strong>Description:</strong></Typography>
                        <Typography variant="body2" sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                          {selectedProperty.description}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                )}
                
                {tabValue === 1 && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography><strong>Village:</strong> {selectedProperty.location.village}</Typography>
                      <Typography><strong>Parish:</strong> {selectedProperty.location.parish}</Typography>
                      <Typography><strong>Sub County:</strong> {selectedProperty.location.subCounty}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography><strong>County:</strong> {selectedProperty.location.county}</Typography>
                      <Typography><strong>District:</strong> {selectedProperty.location.district}</Typography>
                      {selectedProperty.location.landmarks && (
                        <Typography><strong>Landmarks:</strong> {selectedProperty.location.landmarks}</Typography>
                      )}
                    </Grid>
                  </Grid>
                )}
                
                {tabValue === 2 && renderPropertyDetails(selectedProperty)}
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default PropertiesOverviewPage;

