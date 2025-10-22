import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  InputAdornment,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  Home,
  Person,
  AttachMoney,
  LocationOn,
  PersonAdd,
  FilterList,
  Search,
  Terrain,
  Apartment,
  Phone,
  Email,
  CalendarMonth,
  SquareFoot,
  CheckCircle,
  RadioButtonUnchecked,
  Build,
  Info,
  Visibility,
  Clear,
} from '@mui/icons-material';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import { propertiesAPI, rentAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

const AllSpacesPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [landFilter, setLandFilter] = useState('all');

  // Fetch all properties
  const {
    data: propertiesData,
    isLoading: propertiesLoading,
    error: propertiesError,
  } = useQuery('properties', propertiesAPI.getAll);

  // Fetch all rent records
  const {
    data: rentData,
    isLoading: rentLoading,
  } = useQuery('rent', rentAPI.getAll);

  if (propertiesLoading || rentLoading) {
    return <LoadingSpinner message="Loading all spaces..." />;
  }

  if (propertiesError) {
    return (
      <Alert severity="error">
        Failed to load properties. Please try again.
      </Alert>
    );
  }

  const properties = propertiesData?.data?.properties || [];
  const rentRecords = rentData?.data?.rentRecords || [];

  // Get all building and land properties for filter dropdowns
  const buildingProperties = properties.filter(property => property.type === 'building');
  const landProperties = properties.filter(property => property.type === 'land');

  // Create lookup for assigned spaces
  const assignedSpaces = {};
  rentRecords.forEach(rent => {
    if (rent.spaceId) {
      assignedSpaces[rent.spaceId] = rent;
    }
  });

  // Get all spaces from all properties
  const getAllSpaces = () => {
    const allSpaces = [];
    
    properties.forEach(property => {
      if (property.type === 'building' && property.buildingDetails?.floors) {
        property.buildingDetails.floors.forEach(floor => {
          floor.spaces?.forEach(space => {
            allSpaces.push({
              ...space,
              propertyId: property.id,
              propertyName: property.name,
              propertyType: 'building',
              floorNumber: floor.floorNumber,
              floorName: floor.floorName,
              address: property.address,
              location: property.location,
              propertyDescription: property.description,
              amenities: space.amenities || [],
              isAssigned: !!assignedSpaces[space.spaceId],
              tenant: assignedSpaces[space.spaceId],
              leaseStartDate: assignedSpaces[space.spaceId]?.leaseStart,
              leaseEndDate: assignedSpaces[space.spaceId]?.leaseEnd,
            });
          });
        });
      } else if (property.type === 'land' && property.landDetails?.squatters) {
        property.landDetails.squatters.forEach(squatter => {
          allSpaces.push({
            ...squatter,
            spaceId: squatter.squatterId,
            spaceName: squatter.assignedArea,
            spaceType: 'land_area',
            monthlyRent: squatter.monthlyPayment,
            propertyId: property.id,
              propertyName: property.name,
              propertyType: 'land',
              address: property.address,
              location: property.location,
              propertyDescription: property.description,
              amenities: [],
              isAssigned: !!assignedSpaces[squatter.squatterId],
              tenant: assignedSpaces[squatter.squatterId],
              leaseStartDate: assignedSpaces[squatter.squatterId]?.leaseStart,
              leaseEndDate: assignedSpaces[squatter.squatterId]?.leaseEnd,
          });
        });
      }
    });

    return allSpaces;
  };

  const allSpaces = getAllSpaces();

  // Filter spaces based on tab and search
  const filterSpaces = (spaces) => {
    let filtered = spaces;

    // Filter by tab
    if (tabValue === 1) {
      filtered = filtered.filter(space => !space.isAssigned); // Available only
    } else if (tabValue === 2) {
      filtered = filtered.filter(space => space.isAssigned); // Occupied only
    }

    // Filter by property type
    if (statusFilter !== 'all') {
      filtered = filtered.filter(space => space.propertyType === statusFilter);
    }

    // Filter by specific building
    if (buildingFilter !== 'all') {
      filtered = filtered.filter(space => space.propertyId === buildingFilter);
    }

    // Filter by specific land property
    if (landFilter !== 'all') {
      filtered = filtered.filter(space => space.propertyId === landFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(space => 
        space.spaceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        space.propertyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        space.tenant?.tenantName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredSpaces = filterSpaces(allSpaces);
  const availableSpaces = allSpaces.filter(space => !space.isAssigned);
  const occupiedSpaces = allSpaces.filter(space => space.isAssigned);

  const getStatusColor = (space) => {
    if (space.isAssigned) return 'success';
    return space.status === 'vacant' ? 'warning' : space.status === 'maintenance' ? 'error' : 'default';
  };

  const getStatusLabel = (space) => {
    if (space.isAssigned) return 'Occupied';
    return space.status === 'vacant' ? 'Available' : space.status === 'maintenance' ? 'Maintenance' : space.status;
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          All Spaces - Detailed View
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Complete listing of all rentable spaces with detailed information, status, and tenant assignments
        </Typography>
      </Box>

      {/* Summary Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary">
                {allSpaces.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Spaces
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="warning.main">
                {availableSpaces.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Available Spaces
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main">
                {occupiedSpaces.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Occupied Spaces
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main">
                {Math.round((occupiedSpaces.length / Math.max(allSpaces.length, 1)) * 100)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Occupancy Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', p: 2, gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search spaces, properties, or tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300 }}
          />
          
          <TextField
            size="small"
            select
            label="Property Type"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              // Reset specific property filters when changing property type
              if (e.target.value !== 'building') {
                setBuildingFilter('all');
              }
              if (e.target.value !== 'land') {
                setLandFilter('all');
              }
            }}
            sx={{ minWidth: 130 }}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="building">Buildings</MenuItem>
            <MenuItem value="land">Land</MenuItem>
          </TextField>

          {/* Building Filter - Only show when Buildings are selected or All Types */}
          {(statusFilter === 'all' || statusFilter === 'building') && buildingProperties.length > 0 && (
            <TextField
              size="small"
              select
              label="Specific Building"
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="all">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Apartment fontSize="small" />
                  All Buildings
                </Box>
              </MenuItem>
              {buildingProperties.map((property) => (
                <MenuItem key={property.id} value={property.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Apartment fontSize="small" color="primary" />
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {property.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {property.buildingDetails?.floors?.reduce((total, floor) => 
                          total + (floor.spaces?.length || 0), 0) || 0} spaces
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          )}

          {/* Land Filter - Only show when Land is selected or All Types */}
          {(statusFilter === 'all' || statusFilter === 'land') && landProperties.length > 0 && (
            <TextField
              size="small"
              select
              label="Specific Land"
              value={landFilter}
              onChange={(e) => setLandFilter(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="all">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Terrain fontSize="small" />
                  All Land Properties
                </Box>
              </MenuItem>
              {landProperties.map((property) => (
                <MenuItem key={property.id} value={property.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Terrain fontSize="small" color="success" />
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {property.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {property.landDetails?.squatters?.length || 0} areas
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          )}

          {/* Clear Filters Button */}
          {(searchTerm || statusFilter !== 'all' || buildingFilter !== 'all' || landFilter !== 'all') && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setBuildingFilter('all');
                setLandFilter('all');
              }}
              startIcon={<Clear />}
            >
              Clear Filters
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
          >
            <Tab label={`All Spaces (${allSpaces.length})`} />
            <Tab label={`Available (${availableSpaces.length})`} />
            <Tab label={`Occupied (${occupiedSpaces.length})`} />
          </Tabs>

          {/* Active Filters Display */}
          {(statusFilter !== 'all' || buildingFilter !== 'all' || landFilter !== 'all') && (
            <Box sx={{ display: 'flex', gap: 1, p: 1, flexWrap: 'wrap' }}>
              {statusFilter !== 'all' && (
                <Chip
                  label={`Type: ${statusFilter === 'building' ? 'Buildings' : 'Land'}`}
                  size="small"
                  onDelete={() => setStatusFilter('all')}
                  color="primary"
                  variant="outlined"
                />
              )}
              {buildingFilter !== 'all' && (
                <Chip
                  label={`Building: ${buildingProperties.find(p => p.id === buildingFilter)?.name || 'Unknown'}`}
                  size="small"
                  onDelete={() => setBuildingFilter('all')}
                  color="secondary"
                  variant="outlined"
                  icon={<Apartment fontSize="small" />}
                />
              )}
              {landFilter !== 'all' && (
                <Chip
                  label={`Land: ${landProperties.find(p => p.id === landFilter)?.name || 'Unknown'}`}
                  size="small"
                  onDelete={() => setLandFilter('all')}
                  color="success"
                  variant="outlined"
                  icon={<Terrain fontSize="small" />}
                />
              )}
            </Box>
          )}
        </Box>
      </Paper>

      {/* Spaces Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell><strong>Property & Space</strong></TableCell>
              <TableCell><strong>Details & Type</strong></TableCell>
              <TableCell><strong>Location & Address</strong></TableCell>
              <TableCell><strong>Rent & Status</strong></TableCell>
              <TableCell><strong>Tenant Information</strong></TableCell>
              <TableCell><strong>Lease Period</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSpaces.map((space, index) => (
              <TableRow 
                key={`${space.propertyId}-${space.spaceId}`}
                hover
                sx={{ 
                  backgroundColor: space.isAssigned ? 'success.50' : 'warning.50',
                  '&:hover': {
                    backgroundColor: space.isAssigned ? 'success.100' : 'warning.100',
                  }
                }}
              >
                {/* Property & Space */}
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    {space.propertyType === 'building' ? 
                      <Apartment fontSize="medium" color="primary" /> : 
                      <Terrain fontSize="medium" color="success" />
                    }
                    <Box>
                      <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
                        {space.propertyName}
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" color="primary.main">
                        {space.spaceName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {space.propertyType === 'building' ? 
                          `Floor ${space.floorNumber}` : 
                          'Land Area'
                        }
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                
                {/* Details & Type */}
                <TableCell>
                  <Box>
                    <Chip 
                      label={space.spaceType?.replace('_', ' ').toUpperCase()} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                      sx={{ mb: 1 }}
                    />
                    
                    {space.size && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <SquareFoot fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                        <Typography variant="body2" fontWeight="medium">
                          {space.size}
                        </Typography>
                      </Box>
                    )}
                    
                    {space.amenities && space.amenities.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Amenities:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {space.amenities.slice(0, 2).map((amenity, idx) => (
                            <Chip 
                              key={idx}
                              label={amenity}
                              size="small"
                              variant="outlined"
                              color="secondary"
                            />
                          ))}
                          {space.amenities.length > 2 && (
                            <Chip 
                              label={`+${space.amenities.length - 2} more`}
                              size="small"
                              variant="outlined"
                              color="info"
                            />
                          )}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </TableCell>
                
                {/* Location & Address */}
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                    <LocationOn fontSize="small" sx={{ color: 'primary.main', mt: 0.2 }} />
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {space.address}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {space.location?.village && `${space.location.village}, `}
                        {space.location?.district}
                      </Typography>
                      {space.location?.region && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {space.location.region}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </TableCell>
                
                {/* Rent & Status */}
                <TableCell>
                  <Box>
                    <Typography variant="h6" fontWeight="bold" color="success.main" sx={{ mb: 1 }}>
                      UGX {space.monthlyRent?.toLocaleString() || '0'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      {space.isAssigned ? 
                        <CheckCircle fontSize="small" color="success" /> : 
                        <RadioButtonUnchecked fontSize="small" color="warning" />
                      }
                      <Chip 
                        label={getStatusLabel(space)}
                        color={getStatusColor(space)}
                        size="small"
                        variant="filled"
                      />
                    </Box>
                    {space.status === 'maintenance' && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Build fontSize="small" color="error" />
                        <Typography variant="caption" color="error.main">
                          Under maintenance
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </TableCell>
                
                {/* Tenant Information */}
                <TableCell>
                  {space.tenant ? (
                    <Box>
                      <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
                        {space.tenant.tenantName}
                      </Typography>
                      
                      {space.tenant.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <Phone fontSize="small" color="primary" />
                          <Typography variant="caption">
                            {space.tenant.phone}
                          </Typography>
                        </Box>
                      )}
                      
                      {space.tenant.email && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <Email fontSize="small" color="primary" />
                          <Typography variant="caption">
                            {space.tenant.email}
                          </Typography>
                        </Box>
                      )}
                      
                      <Chip 
                        label="Occupied"
                        color="success"
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 1 }}>
                      <RadioButtonUnchecked sx={{ color: 'warning.main', mb: 0.5 }} />
                      <Typography variant="body2" color="warning.main" fontWeight="medium">
                        Available
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Ready for tenant
                      </Typography>
                    </Box>
                  )}
                </TableCell>

                {/* Lease Period */}
                <TableCell>
                  {space.tenant && space.leaseStartDate && space.leaseEndDate ? (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <CalendarMonth fontSize="small" color="primary" />
                        <Typography variant="caption" fontWeight="medium">
                          Lease Period
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        {format(new Date(space.leaseStartDate), 'MMM dd, yyyy')}
                      </Typography>
                      <Typography variant="body2" color="primary.main" fontWeight="bold">
                        {format(new Date(space.leaseEndDate), 'MMM dd, yyyy')}
                      </Typography>
                      
                      {/* Days remaining */}
                      {(() => {
                        const daysRemaining = Math.ceil((new Date(space.leaseEndDate) - new Date()) / (1000 * 60 * 60 * 24));
                        return daysRemaining > 0 && (
                          <Typography variant="caption" color={daysRemaining < 30 ? 'error.main' : 'text.secondary'}>
                            {daysRemaining} days left
                          </Typography>
                        );
                      })()}
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        No lease
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Available for rent
                      </Typography>
                    </Box>
                  )}
                </TableCell>
                
                {/* Actions */}
                <TableCell>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Tooltip title="View Property Details">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Visibility />}
                        onClick={() => navigate(`/app/properties/${space.propertyId}`)}
                        fullWidth
                      >
                        View Property
                      </Button>
                    </Tooltip>
                    
                    <Tooltip title={space.isAssigned ? "Manage tenant assignment" : "Assign new tenant"}>
                      <Button
                        size="small"
                        variant={space.isAssigned ? "outlined" : "contained"}
                        startIcon={space.isAssigned ? <Person /> : <PersonAdd />}
                        onClick={() => navigate(`/app/properties/${space.propertyId}/spaces`)}
                        color={space.isAssigned ? "secondary" : "primary"}
                        fullWidth
                      >
                        {space.isAssigned ? 'Manage Tenant' : 'Assign Tenant'}
                      </Button>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredSpaces.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', mt: 2 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No spaces found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {allSpaces.length === 0 
              ? "Create properties with spaces first"
              : "Try adjusting your search or filters"
            }
          </Typography>
          {allSpaces.length === 0 && hasPermission('properties:create:organization') && (
            <Button
              variant="contained"
              startIcon={<Home />}
              onClick={() => navigate('/app/properties/new')}
            >
              Add Your First Property
            </Button>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default AllSpacesPage;

