import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Delete,
  Home,
  LocationOn,
  AttachMoney,
  Person,
  Phone,
  Business,
  CalendarToday,
  Star,
  Receipt,
  Payment,
  Layers,
  ExpandMore,
  Terrain,
  Apartment,
  AspectRatio,
} from '@mui/icons-material';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import { propertiesAPI, rentAPI, paymentsAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

const PropertyDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isEditMode = searchParams.get('edit') === 'true';

  // Fetch property details
  const {
    data: propertyData,
    isLoading: propertyLoading,
    error: propertyError,
  } = useQuery(['property', id], () => propertiesAPI.getById(id), {
    enabled: !!id,
  });

  // Fetch property statistics
  const { data: statsData } = useQuery(
    ['property-stats', id],
    () => propertiesAPI.getStats(id),
    { enabled: !!id }
  );

  // Fetch rent records for this property
  const { data: rentData } = useQuery(
    ['property-rent', id],
    () => rentAPI.getByProperty(id),
    { enabled: !!id }
  );

  // Delete property mutation
  const deletePropertyMutation = useMutation(propertiesAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('properties');
      toast.success('Property deleted successfully');
      navigate('/app/properties');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete property');
    },
  });

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    deletePropertyMutation.mutate(id);
    setDeleteDialogOpen(false);
  };

  if (propertyLoading) {
    return <LoadingSpinner message="Loading property details..." />;
  }

  if (propertyError) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load property details. Please try again.
        </Alert>
        <Button onClick={() => navigate('/app/properties')}>
          Back to Properties
        </Button>
      </Box>
    );
  }

  const property = propertyData?.data?.property;
  const stats = statsData?.data?.stats;
  const rentRecords = rentData?.data?.rentRecords || [];

  if (!property) {
    return (
      <Alert severity="error">Property not found</Alert>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'occupied':
        return 'success';
      case 'vacant':
        return 'warning';
      case 'maintenance':
        return 'error';
      case 'under_construction':
        return 'info';
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
        return 'Under Maintenance';
      case 'under_construction':
        return 'Under Construction';
      default:
        return status;
    }
  };

  const formatLocation = (location) => {
    if (!location) return 'N/A';
    const parts = [location.village, location.parish, location.subCounty, location.county, location.district].filter(Boolean);
    return parts.join(', ');
  };

  // Building calculations
  const calculateTotalIncome = (floors = []) => {
    return floors.reduce((total, floor) => {
      const floorIncome = floor.spaces?.reduce((spaceTotal, space) => spaceTotal + (space.monthlyRent || 0), 0) || 0;
      return total + floorIncome;
    }, 0);
  };

  const calculateTotalSpaces = (floors = []) => {
    return floors.reduce((total, floor) => total + (floor.spaces?.length || 0), 0);
  };

  // Land calculations
  const calculateLandIncome = (squatters = []) => {
    return squatters.reduce((total, squatter) => total + (squatter.monthlyPayment || 0), 0);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/app/properties')}>
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold">
              {property.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              {property.type === 'land' ? <Terrain color="action" /> : <Apartment color="action" />}
              <Typography variant="body1" color="text.secondary">
                {property.type?.charAt(0).toUpperCase() + property.type?.slice(1)} Property
              </Typography>
              {property.plotNumber && (
                <Typography variant="body2" color="text.secondary">
                  • Plot: {property.plotNumber}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip
            label={getStatusLabel(property.status)}
            color={getStatusColor(property.status)}
          />
          <Chip
            label={property.ownershipType?.charAt(0).toUpperCase() + property.ownershipType?.slice(1)}
            variant="outlined"
          />
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={() => navigate(`/app/properties/${id}?edit=true`)}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Main Property Information */}
        <Grid item xs={12} md={8}>
          
          {/* Basic Information */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              📋 Basic Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <CalendarToday color="primary" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Establishment Date
                    </Typography>
                    <Typography variant="body1" fontWeight="500">
                      {property.establishmentDate ? format(new Date(property.establishmentDate), 'MMMM dd, yyyy') : 'N/A'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Business color="primary" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Ownership Type
                    </Typography>
                    <Typography variant="body1" fontWeight="500">
                      {property.ownershipType?.charAt(0).toUpperCase() + property.ownershipType?.slice(1)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              {property.plotNumber && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOn color="primary" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Plot Number
                      </Typography>
                      <Typography variant="body1" fontWeight="500">
                        {property.plotNumber}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* Location Information */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              📍 Location Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Administrative Location
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Village:</strong> {property.location?.village}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Parish:</strong> {property.location?.parish}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Sub County:</strong> {property.location?.subCounty}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>County:</strong> {property.location?.county}
                </Typography>
                <Typography variant="body1">
                  <strong>District:</strong> {property.location?.district}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                {property.location?.landmarks && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Landmarks & Directions
                    </Typography>
                    <Typography variant="body1">
                      {property.location.landmarks}
                    </Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          </Paper>

          {/* Caretaker Information */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              👤 Caretaker Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person color="primary" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Caretaker Name
                    </Typography>
                    <Typography variant="body1" fontWeight="500">
                      {property.caretakerName}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Phone color="primary" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Contact Phone
                    </Typography>
                    <Typography variant="body1" fontWeight="500">
                      {property.caretakerPhone}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Building Details - Only for building type */}
          {property.type === 'building' && property.buildingDetails && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                🏢 Building Details
              </Typography>
              
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Home color="primary" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Building Type
                      </Typography>
                      <Typography variant="body1" fontWeight="500">
                        {property.buildingDetails.buildingType?.charAt(0).toUpperCase() + property.buildingDetails.buildingType?.slice(1)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Layers color="primary" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Number of Floors
                      </Typography>
                      <Typography variant="body1" fontWeight="500">
                        {property.buildingDetails.numberOfFloors}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Business color="primary" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Total Rentable Spaces
                      </Typography>
                      <Typography variant="body1" fontWeight="500">
                        {calculateTotalSpaces(property.buildingDetails.floors || [])} Spaces
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              {/* Floor Details Table */}
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                Floor Configuration
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Floor</strong></TableCell>
                      <TableCell><strong>Rentable Spaces</strong></TableCell>
                      <TableCell><strong>Monthly Rent (per space)</strong></TableCell>
                      <TableCell><strong>Total Monthly Income</strong></TableCell>
                      <TableCell><strong>Description</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {property.buildingDetails.floors?.map((floor, index) => (
                      <TableRow key={index}>
                        <TableCell>Floor {floor.floorNumber}</TableCell>
                        <TableCell>{floor.rentableSpaces}</TableCell>
                        <TableCell>UGX {floor.monthlyRentAmount?.toLocaleString()}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="success.main" fontWeight="bold">
                            UGX {(floor.rentableSpaces * floor.monthlyRentAmount).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>{floor.description || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Building Financial Summary */}
              <Paper sx={{ p: 2, mt: 3, backgroundColor: 'success.light', color: 'success.contrastText' }}>
                <Typography variant="h6" gutterBottom>
                  💰 Building Income Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2">Total Spaces</Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {calculateTotalSpaces(property.buildingDetails.floors || [])}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2">Floors</Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {property.buildingDetails.numberOfFloors}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2">Total Monthly Potential</Typography>
                    <Typography variant="h6" fontWeight="bold">
                      UGX {calculateTotalIncome(property.buildingDetails.floors || []).toLocaleString()}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Paper>
          )}

          {/* Land Details - Only for land type */}
          {property.type === 'land' && property.landDetails && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                🌱 Land Details
              </Typography>
              
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Terrain color="primary" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Land Use
                      </Typography>
                      <Typography variant="body1" fontWeight="500">
                        {property.landDetails.landUse?.charAt(0).toUpperCase() + property.landDetails.landUse?.slice(1)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AspectRatio color="primary" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Total Area
                      </Typography>
                      <Typography variant="body1" fontWeight="500">
                        {property.landDetails.totalArea || 'Not specified'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Person color="primary" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Total Squatters
                      </Typography>
                      <Typography variant="body1" fontWeight="500">
                        {property.landDetails.squatters?.length || 0} People
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              {/* Squatters Table */}
              {property.landDetails.squatters && property.landDetails.squatters.length > 0 && (
                <>
                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                    Registered Squatters
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Squatter Name</strong></TableCell>
                          <TableCell><strong>Phone</strong></TableCell>
                          <TableCell><strong>Assigned Area</strong></TableCell>
                          <TableCell><strong>Area Size</strong></TableCell>
                          <TableCell><strong>Monthly Payment</strong></TableCell>
                          <TableCell><strong>Agreement Date</strong></TableCell>
                          <TableCell><strong>Status</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {property.landDetails.squatters.map((squatter, index) => (
                          <TableRow key={squatter.squatterId}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Person fontSize="small" color="primary" />
                                {squatter.squatterName}
                              </Box>
                            </TableCell>
                            <TableCell>{squatter.squatterPhone || 'N/A'}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LocationOn fontSize="small" color="action" />
                                {squatter.assignedArea}
                              </Box>
                            </TableCell>
                            <TableCell>{squatter.areaSize || 'N/A'}</TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold" color="success.main">
                                UGX {squatter.monthlyPayment?.toLocaleString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {squatter.agreementDate ? format(new Date(squatter.agreementDate), 'MMM dd, yyyy') : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={squatter.status} 
                                size="small" 
                                color={squatter.status === 'active' ? 'success' : squatter.status === 'disputed' ? 'error' : 'warning'} 
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}

              {/* Land Financial Summary */}
              <Paper sx={{ p: 2, mt: 3, backgroundColor: 'success.light', color: 'success.contrastText' }}>
                <Typography variant="h6" gutterBottom>
                  💰 Land Income Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2">Total Squatters</Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {property.landDetails.squatters?.length || 0}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2">Land Use</Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {property.landDetails.landUse?.charAt(0).toUpperCase() + property.landDetails.landUse?.slice(1)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2">Total Monthly Income</Typography>
                    <Typography variant="h6" fontWeight="bold">
                      UGX {calculateLandIncome(property.landDetails.squatters || []).toLocaleString()}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Paper>
          )}

          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                ⭐ Amenities & Features
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {property.amenities.map((amenity, index) => (
                  <Chip
                    key={index}
                    label={amenity}
                    color="primary"
                    variant="outlined"
                    size="small"
                    icon={<Star />}
                  />
                ))}
              </Box>
            </Paper>
          )}

          {/* Description */}
          {property.description && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                📝 Property Description
              </Typography>
              <Typography variant="body1">
                {property.description}
              </Typography>
            </Paper>
          )}

          {/* Rent Records */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                📊 Rent Records
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Receipt />}
                onClick={() => navigate('/app/rent')}
                size="small"
              >
                Manage Rent
              </Button>
            </Box>

            {rentRecords.length > 0 ? (
              <List>
                {rentRecords.slice(0, 3).map((rent, index) => (
                  <ListItem key={rent.id} divider={index < Math.min(rentRecords.length, 3) - 1}>
                    <ListItemIcon>
                      <Receipt color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={rent.tenantName}
                      secondary={`${format(new Date(rent.leaseStart), 'MMM dd, yyyy')} - ${format(new Date(rent.leaseEnd), 'MMM dd, yyyy')}`}
                    />
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" color="success.main">
                        UGX {rent.monthlyAmount?.toLocaleString()}/month
                      </Typography>
                      <Chip
                        label={rent.status}
                        color={rent.status === 'active' ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                No rent records found. Add a tenant to start tracking rent.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Financial Summary Sidebar */}
        <Grid item xs={12} md={4}>
          
          {/* Property Overview */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              🏠 Property Overview
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Property Type
              </Typography>
              <Typography variant="h6">
                {property.type?.charAt(0).toUpperCase() + property.type?.slice(1)}
              </Typography>
            </Box>

            {property.type === 'building' && property.buildingDetails && (
              <>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Building Type
                  </Typography>
                  <Typography variant="h6">
                    {property.buildingDetails.buildingType?.charAt(0).toUpperCase() + property.buildingDetails.buildingType?.slice(1)}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Monthly Potential
                  </Typography>
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    UGX {calculateTotalIncome(property.buildingDetails.floors || []).toLocaleString()}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Rentable Spaces
                  </Typography>
                  <Typography variant="h6">
                    {calculateTotalSpaces(property.buildingDetails.floors || [])} Spaces
                  </Typography>
                </Box>
              </>
            )}

            {/* Land Financial Summary */}
            {property.type === 'land' && property.landDetails && (
              <>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Land Use Type
                  </Typography>
                  <Typography variant="h6">
                    {property.landDetails.landUse?.charAt(0).toUpperCase() + property.landDetails.landUse?.slice(1)}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Monthly Income
                  </Typography>
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    UGX {calculateLandIncome(property.landDetails.squatters || []).toLocaleString()}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Squatters
                  </Typography>
                  <Typography variant="h6">
                    {property.landDetails.squatters?.length || 0} People
                  </Typography>
                </Box>

                {property.landDetails.totalArea && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Area
                    </Typography>
                    <Typography variant="h6">
                      {property.landDetails.totalArea}
                    </Typography>
                  </Box>
                )}
              </>
            )}

            {stats && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Collected
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    UGX {stats.totalCollected?.toLocaleString() || '0'}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Collection Rate
                  </Typography>
                  <Typography variant="h6">
                    {stats.collectionRate?.toFixed(1) || '0'}%
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Payments
                  </Typography>
                  <Typography variant="h6">
                    {stats.totalPayments || 0}
                  </Typography>
                </Box>
              </>
            )}
          </Paper>

          {/* Caretaker Contact */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              👤 Caretaker Contact
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Person color="primary" />
                <Typography variant="body1" fontWeight="500">
                  {property.caretakerName}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Phone color="primary" />
                <Typography variant="body1" fontWeight="500">
                  {property.caretakerPhone}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Quick Actions */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              🚀 Quick Actions
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Person />}
                onClick={() => navigate(`/app/properties/${id}/spaces`)}
              >
                Assign Tenants to Spaces
              </Button>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<Receipt />}
                onClick={() => navigate('/app/rent')}
              >
                Manage Rent Agreements
              </Button>
              
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Payment />}
                onClick={() => navigate('/app/payments')}
              >
                Record Payment
              </Button>
              
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => navigate(`/app/properties/${id}?edit=true`)}
              >
                Edit Property
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Property</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{property.name}"? This will also delete all related rent records and payments.
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

export default PropertyDetailsPage;