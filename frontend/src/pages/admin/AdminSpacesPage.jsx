import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  Button,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore,
  Business,
  Apartment,
  Terrain,
  LocationOn,
  AttachMoney,
  CheckCircle,
  RadioButtonUnchecked,
  Search,
  Visibility,
  PersonAdd,
  Person,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { propertiesAPI, rentAPI, organizationsAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';

const AdminSpacesPage = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Memoize isSuperAdmin to ensure stable boolean value
  // Use userRole directly to avoid function reference changes
  const isSuperAdmin = useMemo(() => {
    return Boolean(userRole && userRole.name === 'super_admin');
  }, [userRole]);

  // Fetch all properties (always call hook, but may return empty if not super admin)
  const {
    data: propertiesData,
    isLoading: propertiesLoading,
    error: propertiesError,
  } = useQuery('properties', propertiesAPI.getAll, {
    enabled: Boolean(isSuperAdmin),
    retry: false,
  });

  // Fetch all rent records (always call hook, but may return empty if not super admin)
  const {
    data: rentData,
    isLoading: rentLoading,
  } = useQuery('rent', rentAPI.getAll, {
    enabled: Boolean(isSuperAdmin),
    retry: false,
  });

  // Fetch all organizations (always call hook, but may return empty if not super admin)
  const {
    data: orgsData,
    isLoading: orgsLoading,
  } = useQuery('organizations', organizationsAPI.getAll, {
    enabled: Boolean(isSuperAdmin),
    retry: 2,
  });

  // Extract data (safe defaults for when loading)
  const properties = propertiesData?.data?.properties || [];
  const rentRecords = rentData?.data?.rentRecords || [];
  const organizations = orgsData?.data?.organizations || [];

  // Create lookup for assigned spaces
  const assignedSpaces = useMemo(() => {
    const lookup = {};
    rentRecords.forEach(rent => {
      if (rent.spaceId) {
        lookup[rent.spaceId] = rent;
      }
    });
    return lookup;
  }, [rentRecords]);

  // Get all spaces from all properties
  const allSpaces = useMemo(() => {
    const spaces = [];
    
    properties.forEach(property => {
      if (property.type === 'building' && property.buildingDetails?.floors) {
        property.buildingDetails.floors.forEach(floor => {
          floor.spaces?.forEach(space => {
            spaces.push({
              ...space,
              propertyId: property.id,
              propertyName: property.name,
              propertyType: 'building',
              organizationId: property.organizationId,
              floorNumber: floor.floorNumber,
              floorName: floor.floorName,
              location: property.location,
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
          spaces.push({
            ...squatter,
            spaceId: squatter.squatterId,
            spaceName: squatter.assignedArea,
            spaceType: 'land_area',
            monthlyRent: squatter.monthlyPayment,
            propertyId: property.id,
            propertyName: property.name,
            propertyType: 'land',
            organizationId: property.organizationId,
            location: property.location,
            amenities: [],
            isAssigned: !!assignedSpaces[squatter.squatterId],
            tenant: assignedSpaces[squatter.squatterId],
            leaseStartDate: assignedSpaces[squatter.squatterId]?.leaseStart,
            leaseEndDate: assignedSpaces[squatter.squatterId]?.leaseEnd,
          });
        });
      }
    });

    return spaces;
  }, [properties, assignedSpaces]);

  // Group spaces by organization
  const groupedSpaces = useMemo(() => {
    if (!isSuperAdmin || !organizations.length || !allSpaces.length) {
      return [];
    }
    
    const groups = {};
    const orgMap = {};
    
    // Create organization map
    organizations.forEach(org => {
      orgMap[org.id] = org;
    });

    // Group spaces by organizationId
    allSpaces.forEach(space => {
      const orgId = space.organizationId || 'unassigned';
      if (!groups[orgId]) {
        groups[orgId] = {
          organizationId: orgId,
          organizationName: orgMap[orgId]?.name || 'Unassigned Organization',
          organization: orgMap[orgId] || null,
          spaces: [],
        };
      }
      groups[orgId].spaces.push(space);
    });

    // Sort organizations by name and calculate stats
    return Object.values(groups)
      .map(group => ({
        ...group,
        totalSpaces: group.spaces.length,
        occupiedSpaces: group.spaces.filter(s => s.isAssigned).length,
        availableSpaces: group.spaces.filter(s => !s.isAssigned).length,
        occupancyRate: group.spaces.length > 0 
          ? Math.round((group.spaces.filter(s => s.isAssigned).length / group.spaces.length) * 100)
          : 0,
      }))
      .sort((a, b) => a.organizationName.localeCompare(b.organizationName));
  }, [allSpaces, organizations, isSuperAdmin]);

  // Filter spaces by search term (regular function, not a hook)
  const filterSpaces = (spaces) => {
    if (!searchTerm) return spaces;
    const term = searchTerm.toLowerCase();
    return spaces.filter(space => 
      space.spaceName?.toLowerCase().includes(term) ||
      space.propertyName?.toLowerCase().includes(term) ||
      space.tenant?.tenantName?.toLowerCase().includes(term)
    );
  };

  const getStatusColor = (space) => {
    if (space.isAssigned) return 'success';
    return space.status === 'vacant' ? 'warning' : space.status === 'maintenance' ? 'error' : 'default';
  };

  const getStatusLabel = (space) => {
    if (space.isAssigned) return 'Occupied';
    return space.status === 'vacant' ? 'Available' : space.status === 'maintenance' ? 'Maintenance' : space.status;
  };

  // Calculate totals
  const totalSpaces = allSpaces.length;
  const totalOccupied = allSpaces.filter(s => s.isAssigned).length;
  const totalAvailable = allSpaces.filter(s => !s.isAssigned).length;

  // Handle access denial
  if (!isSuperAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Access Denied</Typography>
          <Typography>Only Super Administrators can access this page.</Typography>
        </Alert>
      </Box>
    );
  }

  // Handle loading state
  if (propertiesLoading || rentLoading || orgsLoading) {
    return <LoadingSpinner message="Loading all spaces..." />;
  }

  // Handle error state
  if (propertiesError) {
    return (
      <Alert severity="error">
        Failed to load properties. Please try again.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          All Spaces - System View
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Complete listing of all rentable spaces across all organizations, grouped by organization
        </Typography>
      </Box>

      {/* Summary Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary">
                {totalSpaces}
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
                {totalAvailable}
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
                {totalOccupied}
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
                {totalSpaces > 0 ? Math.round((totalOccupied / totalSpaces) * 100) : 0}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Overall Occupancy Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <TextField
          fullWidth
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
        />
      </Paper>

      {/* Grouped by Organization */}
      {groupedSpaces.length > 0 ? (
        <Box>
          {groupedSpaces.map((group, groupIndex) => {
            const filteredGroupSpaces = filterSpaces(group.spaces);
            return (
              <Accordion key={group.organizationId} defaultExpanded={groupIndex === 0} sx={{ mb: 2 }}>
                <AccordionSummary
                  expandIcon={<ExpandMore />}
                  sx={{
                    backgroundColor: 'primary.50',
                    '&:hover': {
                      backgroundColor: 'primary.100',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 2 }}>
                    <Business sx={{ mr: 2, color: 'primary.main' }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {group.organizationName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {group.totalSpaces} spaces • {group.occupiedSpaces} occupied • {group.availableSpaces} available
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
                      <Chip
                        label={`${group.occupancyRate}% Occupied`}
                        color={group.occupancyRate >= 80 ? 'success' : group.occupancyRate >= 50 ? 'warning' : 'error'}
                        size="small"
                      />
                      {group.organization && (
                        <Chip
                          label={group.organization.status || 'active'}
                          color={group.organization.status === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                      )}
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {filteredGroupSpaces.length > 0 ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Property & Space</strong></TableCell>
                            <TableCell><strong>Type</strong></TableCell>
                            <TableCell><strong>Location</strong></TableCell>
                            <TableCell><strong>Rent</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell><strong>Tenant</strong></TableCell>
                            <TableCell><strong>Actions</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredGroupSpaces.map((space) => (
                            <TableRow key={`${space.propertyId}-${space.spaceId}`} hover>
                              <TableCell>
                                <Box>
                                  <Typography variant="body2" fontWeight="bold">
                                    {space.propertyName}
                                  </Typography>
                                  <Typography variant="body2" color="primary.main">
                                    {space.spaceName}
                                  </Typography>
                                  {space.propertyType === 'building' && (
                                    <Typography variant="caption" color="text.secondary">
                                      Floor {space.floorNumber}
                                    </Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>
                                {space.propertyType === 'building' ? (
                                  <Chip icon={<Apartment />} label="Building" size="small" color="primary" variant="outlined" />
                                ) : (
                                  <Chip icon={<Terrain />} label="Land" size="small" color="success" variant="outlined" />
                                )}
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <LocationOn fontSize="small" color="primary" />
                                  <Typography variant="body2">
                                    {space.location?.village}, {space.location?.district}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight="bold" color="success.main">
                                  UGX {space.monthlyRent?.toLocaleString() || '0'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={getStatusLabel(space)}
                                  color={getStatusColor(space)}
                                  size="small"
                                  icon={space.isAssigned ? <CheckCircle /> : <RadioButtonUnchecked />}
                                />
                              </TableCell>
                              <TableCell>
                                {space.tenant ? (
                                  <Typography variant="body2" fontWeight="medium">
                                    {space.tenant.tenantName}
                                  </Typography>
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    Available
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                  <Tooltip title="View Property">
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      startIcon={<Visibility />}
                                      onClick={() => navigate(`/app/properties/${space.propertyId}`)}
                                    >
                                      View
                                    </Button>
                                  </Tooltip>
                                  <Tooltip title={space.isAssigned ? "Manage Tenant" : "Assign Tenant"}>
                                    <Button
                                      size="small"
                                      variant={space.isAssigned ? "outlined" : "contained"}
                                      startIcon={space.isAssigned ? <Person /> : <PersonAdd />}
                                      onClick={() => navigate(`/app/properties/${space.propertyId}/spaces`)}
                                    >
                                      {space.isAssigned ? 'Manage' : 'Assign'}
                                    </Button>
                                  </Tooltip>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        No spaces found matching your search
                      </Typography>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No spaces found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No properties with spaces have been created yet
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default AdminSpacesPage;
