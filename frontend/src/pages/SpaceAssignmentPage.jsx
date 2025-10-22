import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  ArrowBack,
  Person,
  Phone,
  Email,
  AttachMoney,
  Assignment,
  Home,
  LocationOn,
  ExpandMore,
  PersonAdd,
  CheckCircle,
  Cancel,
  Edit,
  CalendarMonth,
  Security,
  Description,
  AccountBalance,
  ElectricBolt,
  Percent,
} from '@mui/icons-material';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import { propertiesAPI, rentAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

const SpaceAssignmentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [assignmentDialog, setAssignmentDialog] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [tenantForm, setTenantForm] = useState({
    tenantName: '',
    tenantEmail: '',
    tenantPhone: '',
    nationalId: '',
    emergencyContact: '',
    leaseStart: '',
    leaseEnd: '',
    leasePeriodType: 'yearly', // monthly, yearly, custom
    leaseDuration: 12, // in months
    monthlyRent: 0,
    deposit: 0,
    securityDeposit: 0,
    paymentDueDate: 1, // day of month
    rentEscalation: 0, // percentage per year
    includeUtilities: false,
    utilitiesAmount: 0,
    notes: '',
    agreementType: 'standard', // standard, custom
  });

  // Fetch property details
  const {
    data: propertyData,
    isLoading: propertyLoading,
    error: propertyError,
  } = useQuery(['property', id], () => propertiesAPI.getById(id), {
    enabled: !!id,
  });

  // Fetch existing rent records for this property
  const { data: rentData } = useQuery(
    ['property-rent', id],
    () => rentAPI.getByProperty(id),
    { enabled: !!id }
  );

  // Create rent assignment mutation
  const assignSpaceMutation = useMutation(rentAPI.create, {
    onSuccess: () => {
      queryClient.invalidateQueries(['property-rent', id]);
      queryClient.invalidateQueries(['property', id]);
      toast.success('Space assigned successfully!');
      setAssignmentDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to assign space');
    },
  });

  const resetForm = () => {
    setTenantForm({
      tenantName: '',
      tenantEmail: '',
      tenantPhone: '',
      nationalId: '',
      emergencyContact: '',
      leaseStart: '',
      leaseEnd: '',
      leasePeriodType: 'yearly',
      leaseDuration: 12,
      monthlyRent: 0,
      deposit: 0,
      securityDeposit: 0,
      paymentDueDate: 1,
      rentEscalation: 0,
      includeUtilities: false,
      utilitiesAmount: 0,
      notes: '',
      agreementType: 'standard',
    });
    setSelectedSpace(null);
  };

  const openAssignmentDialog = (space, floorNumber = null) => {
    const monthlyRent = space.monthlyRent || space.monthlyPayment || 0;
    const startDate = new Date();

    setSelectedSpace({ ...space, floorNumber });
    setTenantForm({
      tenantName: '',
      tenantEmail: '',
      tenantPhone: '',
      nationalId: '',
      emergencyContact: '',
      leaseStart: startDate.toISOString().substring(0, 10),
      leaseEnd: '', // Optional - leave empty
      leasePeriodType: 'yearly',
      leaseDuration: 12,
      monthlyRent: monthlyRent, // Auto-filled from space
      deposit: 0, // Optional - default 0
      securityDeposit: 0, // Optional - default 0
      paymentDueDate: 1,
      rentEscalation: 0, // Optional - default 0
      includeUtilities: false,
      utilitiesAmount: 0,
      notes: '',
      agreementType: 'standard',
    });
    setAssignmentDialog(true);
  };

  // Calculate lease end date based on period type and duration
  const calculateLeaseEndDate = (startDate, periodType, duration) => {
    const start = new Date(startDate);
    const end = new Date(start);
    
    if (periodType === 'monthly') {
      end.setMonth(end.getMonth() + duration);
    } else if (periodType === 'yearly') {
      end.setFullYear(end.getFullYear() + Math.floor(duration / 12));
      end.setMonth(end.getMonth() + (duration % 12));
    }
    
    return end.toISOString().substring(0, 10);
  };

  // Handle lease period changes
  const handleLeasePeriodChange = (field, value) => {
    const newForm = { ...tenantForm, [field]: value };
    
    if (field === 'leasePeriodType' || field === 'leaseDuration' || field === 'leaseStart') {
      if (newForm.leasePeriodType !== 'custom') {
        newForm.leaseEnd = calculateLeaseEndDate(
          newForm.leaseStart, 
          newForm.leasePeriodType, 
          newForm.leaseDuration
        );
      }
    }
    
    setTenantForm(newForm);
  };

  const handleAssignSpace = () => {
    // Validate required fields - only tenant info and lease start
    if (!selectedSpace || !tenantForm.tenantName || !tenantForm.tenantPhone || !tenantForm.leaseStart) {
      toast.error('Please fill in tenant name, phone, and lease start date');
      return;
    }

    // Validate lease dates only if end date is provided
    if (tenantForm.leaseEnd) {
      const startDate = new Date(tenantForm.leaseStart);
      const endDate = new Date(tenantForm.leaseEnd);
      
      if (endDate <= startDate) {
        toast.error('Lease end date must be after start date');
        return;
      }
    }

    const totalRent = tenantForm.monthlyRent + (tenantForm.includeUtilities ? tenantForm.utilitiesAmount : 0);

    const assignmentData = {
      propertyId: id,
      spaceId: selectedSpace.spaceId || selectedSpace.squatterId,
      spaceName: selectedSpace.spaceName || selectedSpace.assignedArea,
      tenantName: tenantForm.tenantName,
      tenantEmail: tenantForm.tenantEmail,
      tenantPhone: tenantForm.tenantPhone,
      nationalId: tenantForm.nationalId,
      emergencyContact: tenantForm.emergencyContact,
      monthlyRent: totalRent,
      baseRent: tenantForm.monthlyRent,
      utilitiesAmount: tenantForm.includeUtilities ? tenantForm.utilitiesAmount : 0,
      leaseStart: tenantForm.leaseStart,
      leaseEnd: tenantForm.leaseEnd || null, // Optional
      leaseDurationMonths: tenantForm.leaseDuration,
      deposit: tenantForm.deposit || 0, // Optional
      securityDeposit: tenantForm.securityDeposit || 0, // Optional
      paymentDueDate: tenantForm.paymentDueDate,
      rentEscalation: tenantForm.rentEscalation || 0, // Optional
      status: 'active',
      agreementType: tenantForm.agreementType,
      notes: tenantForm.notes,
    };

    assignSpaceMutation.mutate(assignmentData);
  };

  if (propertyLoading) {
    return <LoadingSpinner message="Loading property spaces..." />;
  }

  if (propertyError || !propertyData?.data?.property) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load property details.
        </Alert>
        <Button onClick={() => navigate('/app/properties')}>
          Back to Properties
        </Button>
      </Box>
    );
  }

  const property = propertyData.data.property;
  const rentRecords = rentData?.data?.rentRecords || [];
  
  // Create lookup for assigned spaces
  const assignedSpaces = {};
  rentRecords.forEach(rent => {
    if (rent.spaceId) {
      assignedSpaces[rent.spaceId] = rent;
    }
  });

  const isSpaceAssigned = (spaceId) => {
    return !!assignedSpaces[spaceId];
  };

  const getSpaceStatus = (space) => {
    const spaceId = space.spaceId || space.squatterId;
    if (assignedSpaces[spaceId]) {
      return 'occupied';
    }
    return space.status || 'vacant';
  };

  const getTenantForSpace = (spaceId) => {
    return assignedSpaces[spaceId];
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate(`/app/properties/${id}`)}>
          <ArrowBack />
        </IconButton>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Space Assignment - {property.name}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage tenant assignments for all available spaces
          </Typography>
        </Box>
      </Box>

      {/* Property Overview */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Typography variant="h6" color="primary">Property Overview</Typography>
            <Typography variant="body1">
              <strong>Type:</strong> {property.type?.charAt(0).toUpperCase() + property.type?.slice(1)}
            </Typography>
            <Typography variant="body1">
              <strong>Location:</strong> {property.location?.village}, {property.location?.district}
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Typography variant="h6" color="success.main">
              {property.type === 'building' 
                ? property.buildingDetails?.floors?.reduce((total, floor) => total + (floor.spaces?.length || 0), 0) || 0
                : property.landDetails?.squatters?.length || 0
              }
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total {property.type === 'building' ? 'Spaces' : 'Squatter Areas'}
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Typography variant="h6" color="warning.main">
              {property.type === 'building' 
                ? property.buildingDetails?.floors?.reduce((total, floor) => {
                    return total + (floor.spaces?.filter(space => getSpaceStatus(space) === 'vacant').length || 0);
                  }, 0) || 0
                : property.landDetails?.squatters?.filter(squatter => getSpaceStatus(squatter) === 'vacant').length || 0
              }
            </Typography>
            <Typography variant="body2" color="text.secondary">Available Spaces</Typography>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Typography variant="h6" color="success.main">
              UGX {property.type === 'building'
                ? (property.buildingDetails?.floors?.reduce((total, floor) => {
                    const floorIncome = floor.spaces?.reduce((spaceTotal, space) => spaceTotal + (space.monthlyRent || 0), 0) || 0;
                    return total + floorIncome;
                  }, 0) || 0).toLocaleString()
                : (property.landDetails?.squatters?.reduce((total, squatter) => total + (squatter.monthlyPayment || 0), 0) || 0).toLocaleString()
              }
            </Typography>
            <Typography variant="body2" color="text.secondary">Total Monthly Potential</Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Building Spaces */}
      {property.type === 'building' && property.buildingDetails?.floors && (
        <Box>
          {property.buildingDetails.floors.map((floor, floorIndex) => (
            <Accordion key={floorIndex} defaultExpanded sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                  <Typography variant="h6">
                    {floor.floorName || `Floor ${floor.floorNumber}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {floor.spaces?.length || 0} spaces
                  </Typography>
                </Box>
              </AccordionSummary>
              
              <AccordionDetails>
                <Grid container spacing={2}>
                  {floor.spaces?.map((space, spaceIndex) => {
                    const spaceStatus = getSpaceStatus(space);
                    const tenant = getTenantForSpace(space.spaceId);
                    
                    return (
                      <Grid item xs={12} md={6} lg={4} key={space.spaceId}>
                        <Card sx={{ 
                          height: '100%',
                          border: spaceStatus === 'occupied' ? '2px solid' : '1px solid',
                          borderColor: spaceStatus === 'occupied' ? 'success.main' : 'divider',
                        }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                              <Typography variant="h6" component="h3">
                                {space.spaceName}
                              </Typography>
                              <Chip
                                label={spaceStatus}
                                color={spaceStatus === 'occupied' ? 'success' : spaceStatus === 'vacant' ? 'warning' : 'error'}
                                size="small"
                              />
                            </Box>

                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              <strong>Type:</strong> {space.spaceType?.charAt(0).toUpperCase() + space.spaceType?.slice(1)}
                            </Typography>
                            
                            {space.size && (
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                <strong>Size:</strong> {space.size}
                              </Typography>
                            )}

                            <Typography variant="h6" color="success.main" sx={{ mb: 2 }}>
                              UGX {space.monthlyRent?.toLocaleString()}/month
                            </Typography>

                            {spaceStatus === 'occupied' && tenant && (
                              <Box sx={{ p: 2, backgroundColor: 'success.light', borderRadius: 1, mb: 2 }}>
                                <Typography variant="body2" fontWeight="bold">
                                  Current Tenant:
                                </Typography>
                                <Typography variant="body1">{tenant.tenantName}</Typography>
                                {tenant.tenantPhone && (
                                  <Typography variant="body2" color="text.secondary">
                                    📞 {tenant.tenantPhone}
                                  </Typography>
                                )}
                                <Typography variant="body2" color="text.secondary">
                                  Lease: {format(new Date(tenant.leaseStart), 'MMM yyyy')} - {format(new Date(tenant.leaseEnd), 'MMM yyyy')}
                                </Typography>
                              </Box>
                            )}

                            {space.description && (
                              <Typography variant="body2" color="text.secondary">
                                {space.description}
                              </Typography>
                            )}
                          </CardContent>
                          
                          <CardActions>
                            {spaceStatus === 'vacant' ? (
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<PersonAdd />}
                                onClick={() => openAssignmentDialog(space, floor.floorNumber)}
                                fullWidth
                              >
                                Assign Tenant
                              </Button>
                            ) : (
                              <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<Edit />}
                                  fullWidth
                                >
                                  Edit Assignment
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  startIcon={<Cancel />}
                                >
                                  Terminate
                                </Button>
                              </Box>
                            )}
                          </CardActions>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {/* Land Squatter Areas */}
      {property.type === 'land' && property.landDetails?.squatters && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            🌱 Land Squatter Areas
          </Typography>
          
          <Grid container spacing={2}>
            {property.landDetails.squatters.map((squatter, squatterIndex) => {
              const spaceStatus = getSpaceStatus(squatter);
              const tenant = getTenantForSpace(squatter.squatterId);
              
              return (
                <Grid item xs={12} md={6} lg={4} key={squatter.squatterId}>
                  <Card sx={{ 
                    height: '100%',
                    border: spaceStatus === 'occupied' ? '2px solid' : '1px solid',
                    borderColor: spaceStatus === 'occupied' ? 'success.main' : 'divider',
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" component="h3">
                          {squatter.assignedArea}
                        </Typography>
                        <Chip
                          label={squatter.status}
                          color={squatter.status === 'active' ? 'success' : squatter.status === 'disputed' ? 'error' : 'warning'}
                          size="small"
                        />
                      </Box>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        <strong>Current Squatter:</strong> {squatter.squatterName}
                      </Typography>
                      
                      {squatter.areaSize && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          <strong>Size:</strong> {squatter.areaSize}
                        </Typography>
                      )}

                      {squatter.squatterPhone && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          <strong>Phone:</strong> {squatter.squatterPhone}
                        </Typography>
                      )}

                      <Typography variant="h6" color="success.main" sx={{ mb: 2 }}>
                        UGX {squatter.monthlyPayment?.toLocaleString()}/month
                      </Typography>

                      {tenant ? (
                        <Box sx={{ p: 2, backgroundColor: 'success.light', borderRadius: 1, mb: 2 }}>
                          <Typography variant="body2" fontWeight="bold">
                            Formalized Tenant:
                          </Typography>
                          <Typography variant="body1">{tenant.tenantName}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Lease: {format(new Date(tenant.leaseStart), 'MMM yyyy')} - {format(new Date(tenant.leaseEnd), 'MMM yyyy')}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
                          Informal agreement - consider formalizing lease
                        </Typography>
                      )}

                      {squatter.description && (
                        <Typography variant="body2" color="text.secondary">
                          {squatter.description}
                        </Typography>
                      )}
                    </CardContent>
                    
                    <CardActions>
                      {!tenant ? (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<Assignment />}
                          onClick={() => openAssignmentDialog(squatter)}
                          fullWidth
                        >
                          Formalize Lease
                        </Button>
                      ) : (
                        <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Edit />}
                            fullWidth
                          >
                            Edit Lease
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<Cancel />}
                          >
                            Terminate
                          </Button>
                        </Box>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      )}

      {/* Enhanced Assignment Dialog */}
      <Dialog open={assignmentDialog} onClose={() => setAssignmentDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Assignment />
            Book Space for Occupation - {selectedSpace?.spaceName || selectedSpace?.assignedArea}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedSpace && (
            <Paper sx={{ mb: 3, p: 3, backgroundColor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
              <Typography variant="h6" gutterBottom color="primary.main">
                📍 Space Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="body1">
                    <strong>Space:</strong> {selectedSpace.spaceName || selectedSpace.assignedArea}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Type:</strong> {selectedSpace.spaceType?.replace('_', ' ')}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body1">
                    <strong>Monthly Rent:</strong> UGX {(selectedSpace.monthlyRent || selectedSpace.monthlyPayment)?.toLocaleString()}
                  </Typography>
                  {selectedSpace.size && (
                    <Typography variant="body1">
                      <strong>Size:</strong> {selectedSpace.size}
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12} md={4}>
                  {selectedSpace.floorNumber && (
                    <Typography variant="body1">
                      <strong>Floor:</strong> {selectedSpace.floorNumber}
                    </Typography>
                  )}
                  <Typography variant="body1">
                    <strong>Status:</strong> Available for booking
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              👤 Tenant Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Tenant Name *"
                  value={tenantForm.tenantName}
                  onChange={(e) => setTenantForm({ ...tenantForm, tenantName: e.target.value })}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number *"
                  value={tenantForm.tenantPhone}
                  onChange={(e) => setTenantForm({ ...tenantForm, tenantPhone: e.target.value })}
                  required
                  placeholder="+256 700 123 456"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="email"
                  label="Email Address"
                  value={tenantForm.tenantEmail}
                  onChange={(e) => setTenantForm({ ...tenantForm, tenantEmail: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="National ID / Passport"
                  value={tenantForm.nationalId}
                  onChange={(e) => setTenantForm({ ...tenantForm, nationalId: e.target.value })}
                  placeholder="CF12345678901234"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Emergency Contact"
                  value={tenantForm.emergencyContact}
                  onChange={(e) => setTenantForm({ ...tenantForm, emergencyContact: e.target.value })}
                  placeholder="Name and phone number"
                />
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              📅 Lease Period & Booking Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Lease Period Type</InputLabel>
                  <Select
                    value={tenantForm.leasePeriodType}
                    onChange={(e) => handleLeasePeriodChange('leasePeriodType', e.target.value)}
                    label="Lease Period Type"
                  >
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="yearly">Yearly</MenuItem>
                    <MenuItem value="custom">Custom Period</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {tenantForm.leasePeriodType !== 'custom' && (
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label={`Duration (${tenantForm.leasePeriodType === 'monthly' ? 'Months' : 'Years'})`}
                    value={tenantForm.leasePeriodType === 'yearly' ? Math.floor(tenantForm.leaseDuration / 12) : tenantForm.leaseDuration}
                    onChange={(e) => {
                      const duration = parseInt(e.target.value) || 1;
                      const months = tenantForm.leasePeriodType === 'yearly' ? duration * 12 : duration;
                      handleLeasePeriodChange('leaseDuration', months);
                    }}
                    inputProps={{ min: 1 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarMonth />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              )}

              <Grid item xs={12} md={tenantForm.leasePeriodType === 'custom' ? 6 : 4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Lease Start Date *"
                  value={tenantForm.leaseStart}
                  onChange={(e) => handleLeasePeriodChange('leaseStart', e.target.value)}
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={tenantForm.leasePeriodType === 'custom' ? 6 : 12}>
                <TextField
                  fullWidth
                  type="date"
                  label="Lease End Date (Optional)"
                  value={tenantForm.leaseEnd}
                onChange={(e) => handleLeasePeriodChange('leaseEnd', e.target.value)}
                InputLabelProps={{ shrink: true }}
                disabled={tenantForm.leasePeriodType !== 'custom'}
                helperText={tenantForm.leasePeriodType !== 'custom' ? 'Auto-calculated, or leave empty if ongoing' : 'Leave empty if ongoing/indefinite'}
              />
            </Grid>
            </Grid>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              💰 Rent Information
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Monthly rent is auto-filled from space. Financial terms (deposits, payments) are managed in the Payments section.
            </Alert>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Monthly Rent (UGX)"
                  value={tenantForm.monthlyRent}
                  disabled
                  helperText="Auto-filled from space rent amount"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoney />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiInputBase-input.Mui-disabled': {
                      WebkitTextFillColor: '#000',
                      fontWeight: 600,
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Payment Due Date (Day of Month)"
                  value={tenantForm.paymentDueDate}
                  onChange={(e) => setTenantForm({ ...tenantForm, paymentDueDate: parseInt(e.target.value) || 1 })}
                  inputProps={{ min: 1, max: 31 }}
                  helperText="e.g., 1 for 1st of month, 15 for 15th"
                />
              </Grid>
            </Grid>

          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              📄 Agreement Terms
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Agreement Type</InputLabel>
                  <Select
                    value={tenantForm.agreementType}
                    onChange={(e) => setTenantForm({ ...tenantForm, agreementType: e.target.value })}
                    label="Agreement Type"
                  >
                    <MenuItem value="standard">Standard Lease Agreement</MenuItem>
                    <MenuItem value="custom">Custom Agreement</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Additional Notes & Terms"
                  value={tenantForm.notes}
                  onChange={(e) => setTenantForm({ ...tenantForm, notes: e.target.value })}
                  placeholder="Any special conditions, restrictions, or additional terms..."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                        <Description />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, backgroundColor: 'grey.50' }}>
          <Button onClick={() => setAssignmentDialog(false)} size="large">
            Cancel
          </Button>
          <Button 
            onClick={handleAssignSpace} 
            variant="contained"
            size="large"
            disabled={assignSpaceMutation.isLoading}
            startIcon={<Assignment />}
          >
            {assignSpaceMutation.isLoading ? 'Booking Space...' : 'Book Space for Occupation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SpaceAssignmentPage;

