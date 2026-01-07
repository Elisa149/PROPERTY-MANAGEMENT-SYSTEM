import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
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
  TextField,
  InputAdornment,
  MenuItem,
  Tooltip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  People,
  Person,
  Phone,
  Email,
  LocationOn,
  AttachMoney,
  CalendarMonth,
  Home,
  Apartment,
  Terrain,
  Search,
  FilterList,
  Clear,
  Visibility,
  Edit,
  Payment,
  Warning,
  CheckCircle,
  Autorenew,
} from '@mui/icons-material';
import { format, differenceInDays, addMonths, addYears } from 'date-fns';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from 'react-query';

import { propertiesAPI, rentAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PropertySelectorDialog from '../components/PropertySelectorDialog';

const TenantsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [propertyDialog, setPropertyDialog] = useState(false);
  const [renewDialog, setRenewDialog] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [newLeaseEnd, setNewLeaseEnd] = useState('');
  const [renewalPeriod, setRenewalPeriod] = useState('12'); // months

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
    error: rentError,
  } = useQuery('rent', rentAPI.getAll);

  // Lease renewal mutation
  const renewLeaseMutation = useMutation(
    ({ rentId, updatedData }) => rentAPI.update(rentId, updatedData),
    {
      onSuccess: () => {
        toast.success('Lease renewed successfully!');
        queryClient.invalidateQueries('rent');
        setRenewDialog(false);
        setSelectedTenant(null);
        setNewLeaseEnd('');
        setRenewalPeriod('12');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to renew lease');
      },
    }
  );

  if (propertiesLoading || rentLoading) {
    return <LoadingSpinner message="Loading tenant information..." />;
  }

  if (propertiesError || rentError) {
    return (
      <Alert severity="error">
        Failed to load tenant data. Please try again.
      </Alert>
    );
  }

  const properties = propertiesData?.data?.properties || [];
  const rentRecords = rentData?.data?.rentRecords || [];

  // Debug logging
  console.log('🏢 Properties loaded:', properties.length);
  console.log('📋 Rent records loaded:', rentRecords.length);
  console.log('📋 Rent records:', rentRecords);

  // Create comprehensive tenant data by combining rent records with property/space info
  const getAllTenants = () => {
    const tenants = [];
    
    rentRecords.forEach(rent => {
      console.log('Processing rent record:', rent);
      if (rent.tenantName && rent.spaceId) {
        // Find the property and space details
        let propertyInfo = null;
        let spaceInfo = null;
        
        properties.forEach(property => {
          if (property.type === 'building' && property.buildingDetails?.floors) {
            property.buildingDetails.floors.forEach(floor => {
              floor.spaces?.forEach(space => {
                if (space.spaceId === rent.spaceId) {
                  propertyInfo = property;
                  spaceInfo = {
                    ...space,
                    floorNumber: floor.floorNumber,
                    floorName: floor.floorName,
                    propertyType: 'building'
                  };
                }
              });
            });
          } else if (property.type === 'land' && property.landDetails?.squatters) {
            property.landDetails.squatters.forEach(squatter => {
              if (squatter.squatterId === rent.spaceId) {
                propertyInfo = property;
                spaceInfo = {
                  spaceName: squatter.assignedArea,
                  spaceType: 'land_area',
                  monthlyRent: squatter.monthlyPayment,
                  propertyType: 'land'
                };
              }
            });
          }
        });

        if (propertyInfo && spaceInfo) {
          const today = new Date();
          let daysUntilExpiry = null;
          let isExpired = false;
          let isExpiringSoon = false;
          
          if (rent.leaseEnd) {
            const leaseEndDate = new Date(rent.leaseEnd);
            daysUntilExpiry = differenceInDays(leaseEndDate, today);
            isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0;
            isExpired = daysUntilExpiry < 0;
          }
          
          tenants.push({
            id: rent.id,
            tenantName: rent.tenantName,
            phone: rent.phone,
            email: rent.email,
            nationalId: rent.nationalId,
            emergencyContact: rent.emergencyContact,
            monthlyRent: rent.monthlyRent,
            leaseStart: rent.leaseStart,
            leaseEnd: rent.leaseEnd,
            daysUntilExpiry,
            isExpiringSoon,
            isExpired,
            // Property info
            propertyId: propertyInfo.id,
            propertyName: propertyInfo.name,
            propertyType: propertyInfo.type,
            propertyAddress: `${propertyInfo.location?.village}, ${propertyInfo.location?.district}`,
            location: propertyInfo.location,
            // Space info
            spaceId: rent.spaceId,
            spaceName: spaceInfo.spaceName,
            spaceType: spaceInfo.spaceType,
            floorNumber: spaceInfo.floorNumber,
            size: spaceInfo.size,
            amenities: spaceInfo.amenities || [],
          });
        }
      }
    });

    return tenants;
  };

  const allTenants = getAllTenants();
  
  console.log('👥 All tenants processed:', allTenants.length);
  console.log('👥 All tenants:', allTenants);

  // Filter tenants based on search and filters
  const filterTenants = (tenants) => {
    let filtered = tenants;

    // Filter by tab
    if (tabValue === 1) {
      filtered = filtered.filter(tenant => tenant.isExpiringSoon); // Expiring soon
    } else if (tabValue === 2) {
      filtered = filtered.filter(tenant => tenant.isExpired); // Expired leases
    }

    // Filter by property
    if (propertyFilter !== 'all') {
      filtered = filtered.filter(tenant => tenant.propertyId === propertyFilter);
    }

    // Filter by status
    if (statusFilter === 'active') {
      filtered = filtered.filter(tenant => !tenant.isExpired);
    } else if (statusFilter === 'expiring') {
      filtered = filtered.filter(tenant => tenant.isExpiringSoon);
    } else if (statusFilter === 'expired') {
      filtered = filtered.filter(tenant => tenant.isExpired);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(tenant => 
        tenant.tenantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.phone?.includes(searchTerm) ||
        tenant.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.propertyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.spaceName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredTenants = filterTenants(allTenants);
  const expiringSoonTenants = allTenants.filter(tenant => tenant.isExpiringSoon);
  const expiredTenants = allTenants.filter(tenant => tenant.isExpired);

  const getStatusColor = (tenant) => {
    if (tenant.isExpired) return 'error';
    if (tenant.isExpiringSoon) return 'warning';
    return 'success';
  };

  const getStatusLabel = (tenant) => {
    if (tenant.isExpired) return 'Expired';
    if (tenant.isExpiringSoon) return 'Expiring Soon';
    return 'Active';
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  // Handle lease renewal
  const handleRenewLease = (tenant) => {
    setSelectedTenant(tenant);
    // Calculate default new lease end date (12 months from today or from original end date if expired)
    const baseDate = tenant.isExpired && tenant.leaseEnd 
      ? new Date(tenant.leaseEnd) 
      : new Date();
    const defaultEndDate = addMonths(baseDate, 12);
    setNewLeaseEnd(format(defaultEndDate, 'yyyy-MM-dd'));
    setRenewalPeriod('12');
    setRenewDialog(true);
  };

  const handleRenewalPeriodChange = (period) => {
    setRenewalPeriod(period);
    const baseDate = selectedTenant?.isExpired && selectedTenant?.leaseEnd 
      ? new Date(selectedTenant.leaseEnd) 
      : new Date();
    const newEndDate = period === 'custom' 
      ? newLeaseEnd 
      : format(addMonths(baseDate, parseInt(period)), 'yyyy-MM-dd');
    setNewLeaseEnd(newEndDate);
  };

  const handleConfirmRenewal = () => {
    if (!selectedTenant || !newLeaseEnd) {
      toast.error('Please select a valid lease end date');
      return;
    }

    // Get the original rent record data
    const rentRecord = rentRecords.find(r => r.id === selectedTenant.id);
    if (!rentRecord) {
      toast.error('Rent record not found');
      return;
    }

    // Validate new lease end date is in the future
    const newEndDate = new Date(newLeaseEnd);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (newEndDate <= today) {
      toast.error('New lease end date must be in the future');
      return;
    }

    // Prepare update data - include all required fields from rent schema
    // Map fields correctly based on rent record structure
    // Handle Firestore Timestamp conversion for dates
    const getDateValue = (dateValue) => {
      if (!dateValue) return null;
      // Handle Firestore Timestamp
      if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        return dateValue.toDate();
      }
      // Handle Date object
      if (dateValue instanceof Date) {
        return dateValue;
      }
      // Handle string or number timestamp
      return new Date(dateValue);
    };

    const leaseStartDate = getDateValue(rentRecord.leaseStart) || new Date();
    
    const updatedData = {
      propertyId: rentRecord.propertyId,
      spaceId: rentRecord.spaceId || '',
      spaceName: rentRecord.spaceName || selectedTenant.spaceName || '',
      tenantName: rentRecord.tenantName,
      tenantEmail: rentRecord.email || rentRecord.tenantEmail || '',
      tenantPhone: rentRecord.phone || rentRecord.tenantPhone || '',
      nationalId: rentRecord.nationalId || '',
      emergencyContact: rentRecord.emergencyContact || '',
      // Ensure all numeric fields are numbers, not strings
      monthlyRent: Number(rentRecord.monthlyRent || selectedTenant.monthlyRent || 0),
      baseRent: Number(rentRecord.baseRent || rentRecord.monthlyRent || 0),
      utilitiesAmount: Number(rentRecord.utilitiesAmount || 0),
      deposit: Number(rentRecord.deposit || 0),
      securityDeposit: Number(rentRecord.securityDeposit || 0),
      paymentDueDate: Number(rentRecord.paymentDueDate || 1),
      rentEscalation: Number(rentRecord.rentEscalation || 0),
      agreementType: rentRecord.agreementType || 'standard',
      leaseDurationMonths: Number(rentRecord.leaseDurationMonths || 12),
      notes: rentRecord.notes || '',
      // Send dates as ISO strings (Joi will parse them correctly)
      leaseStart: format(leaseStartDate, 'yyyy-MM-dd'),
      leaseEnd: newLeaseEnd,
      status: 'active', // Reactivate if expired
    };

    renewLeaseMutation.mutate({
      rentId: selectedTenant.id,
      updatedData,
    });
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          All Tenants Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Complete overview of all tenants, their spaces, and payment information
        </Typography>
      </Box>

      {/* Summary Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <People color="primary" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" color="primary">
                    {allTenants.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Tenants
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CheckCircle color="success" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {allTenants.filter(t => !t.isExpired && !t.isExpiringSoon).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Leases
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Warning color="warning" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {expiringSoonTenants.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Expiring Soon
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h4" color="success.main" fontWeight="bold">
                  UGX
                </Typography>
                <Box>
                  <Typography variant="h5" color="success.main">
                    {allTenants.reduce((total, tenant) => total + (tenant.monthlyRent || 0), 0).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Monthly Revenue
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', p: 2, gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            id="searchTenants"
            placeholder="Search tenants, properties, or spaces..."
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
            id="propertyFilter"
            select
            label="Property"
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="all">All Properties</MenuItem>
            {properties.map((property) => (
              <MenuItem key={property.id} value={property.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {property.type === 'building' ? 
                    <Apartment fontSize="small" color="primary" /> : 
                    <Terrain fontSize="small" color="success" />
                  }
                  {property.name}
                </Box>
              </MenuItem>
            ))}
          </TextField>

          <TextField
            size="small"
            id="statusFilter"
            select
            label="Lease Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="expiring">Expiring Soon</MenuItem>
            <MenuItem value="expired">Expired</MenuItem>
          </TextField>

          {/* Clear Filters Button */}
          {(searchTerm || propertyFilter !== 'all' || statusFilter !== 'all') && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setSearchTerm('');
                setPropertyFilter('all');
                setStatusFilter('all');
              }}
              startIcon={<Clear />}
            >
              Clear Filters
            </Button>
          )}
        </Box>

        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ borderTop: 1, borderColor: 'divider' }}
        >
          <Tab label={`All Tenants (${allTenants.length})`} />
          <Tab label={`Expiring Soon (${expiringSoonTenants.length})`} />
          <Tab label={`Expired (${expiredTenants.length})`} />
        </Tabs>
      </Paper>

      {/* Tenants Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell><strong>Tenant</strong></TableCell>
              <TableCell><strong>Contact Information</strong></TableCell>
              <TableCell><strong>Property & Space</strong></TableCell>
              <TableCell><strong>Lease Details</strong></TableCell>
              <TableCell><strong>Monthly Payment</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTenants.map((tenant) => (
              <TableRow 
                key={tenant.id}
                hover
                sx={{ 
                  backgroundColor: tenant.isExpired ? 'error.50' : 
                                  tenant.isExpiringSoon ? 'warning.50' : 'success.50',
                  '&:hover': {
                    backgroundColor: tenant.isExpired ? 'error.100' : 
                                    tenant.isExpiringSoon ? 'warning.100' : 'success.100',
                  }
                }}
              >
                {/* Tenant Information */}
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {getInitials(tenant.tenantName)}
                    </Avatar>
                    <Box>
                      <Typography variant="body1" fontWeight="bold">
                        {tenant.tenantName}
                      </Typography>
                      {tenant.nationalId && (
                        <Typography variant="caption" color="text.secondary">
                          ID: {tenant.nationalId}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </TableCell>

                {/* Contact Information */}
                <TableCell>
                  <Box>
                    {tenant.phone && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <Phone fontSize="small" color="primary" />
                        <Typography variant="body2">
                          {tenant.phone}
                        </Typography>
                      </Box>
                    )}
                    
                    {tenant.email && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <Email fontSize="small" color="primary" />
                        <Typography variant="body2">
                          {tenant.email}
                        </Typography>
                      </Box>
                    )}

                    {tenant.emergencyContact && (
                      <Typography variant="caption" color="text.secondary">
                        Emergency: {tenant.emergencyContact}
                      </Typography>
                    )}
                  </Box>
                </TableCell>

                {/* Property & Space */}
                <TableCell>
                  <Box>
                    {/* Property Name */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      {tenant.propertyType === 'building' ? 
                        <Apartment fontSize="small" color="primary" /> : 
                        <Terrain fontSize="small" color="success" />
                      }
                      <Typography variant="body1" fontWeight="bold" color="primary.dark">
                        {tenant.propertyName}
                      </Typography>
                    </Box>
                    
                    {/* Space Name - Prominent */}
                    <Chip 
                      label={tenant.spaceName}
                      color="primary"
                      size="small"
                      sx={{ mb: 1, fontWeight: 600 }}
                    />
                    
                    {/* Floor/Type Info */}
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                      {tenant.propertyType === 'building' ? 
                        `Floor ${tenant.floorNumber} • ${tenant.spaceType}` : 
                        `Land Area • ${tenant.spaceType || 'Squatter'}`
                      }
                      {tenant.size && ` • ${tenant.size}`}
                    </Typography>

                    {/* Location */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationOn fontSize="small" sx={{ color: 'success.main', fontSize: 16 }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        {tenant.propertyAddress}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>

                {/* Lease Details */}
                <TableCell>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <CalendarMonth fontSize="small" color="primary" />
                      <Typography variant="caption" color="text.secondary">
                        Start: {format(new Date(tenant.leaseStart), 'MMM dd, yyyy')}
                      </Typography>
                    </Box>
                    
                    {tenant.leaseEnd ? (
                      <>
                        <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
                          End: {format(new Date(tenant.leaseEnd), 'MMM dd, yyyy')}
                        </Typography>
                        
                        <Typography 
                          variant="caption" 
                          color={tenant.isExpired ? 'error.main' : 
                                 tenant.isExpiringSoon ? 'warning.main' : 'text.secondary'}
                        >
                          {tenant.isExpired ? 
                            `Expired ${Math.abs(tenant.daysUntilExpiry)} days ago` :
                            `${tenant.daysUntilExpiry} days remaining`
                          }
                        </Typography>
                      </>
                    ) : (
                      <Chip 
                        label="Ongoing/Indefinite"
                        color="info"
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </TableCell>

                {/* Monthly Payment */}
                <TableCell>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="success.main" fontWeight="bold">
                      UGX {tenant.monthlyRent?.toLocaleString() || '0'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      per month
                    </Typography>
                  </Box>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Chip 
                    label={getStatusLabel(tenant)}
                    color={getStatusColor(tenant)}
                    size="small"
                    variant="filled"
                  />
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {(tenant.isExpired || tenant.isExpiringSoon) && (
                      <Tooltip title={tenant.isExpired ? "Renew Expired Lease" : "Renew Lease (Expiring Soon)"}>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<Autorenew />}
                          onClick={() => handleRenewLease(tenant)}
                          color={tenant.isExpired ? "error" : "warning"}
                          fullWidth
                          sx={{ mb: 1 }}
                        >
                          {tenant.isExpired ? "Renew Expired Lease" : "Renew Lease"}
                        </Button>
                      </Tooltip>
                    )}
                    
                    <Tooltip title="View Property Details">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Visibility />}
                        onClick={() => navigate(`/app/properties/${tenant.propertyId}`)}
                        fullWidth
                      >
                        View Property
                      </Button>
                    </Tooltip>
                    
                    <Tooltip title="Manage Space Assignment">
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<Edit />}
                        onClick={() => navigate(`/app/properties/${tenant.propertyId}/spaces`)}
                        color="primary"
                        fullWidth
                      >
                        Manage Space
                      </Button>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredTenants.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', mt: 2 }}>
          <People sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No tenants found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {allTenants.length === 0 
              ? "No tenants have been assigned to spaces yet"
              : "Try adjusting your search or filters"
            }
          </Typography>
          {allTenants.length === 0 && (
            <Button
              variant="contained"
              startIcon={<Home />}
              onClick={() => setPropertyDialog(true)}
            >
              Assign Tenants to Spaces
            </Button>
          )}
        </Paper>
      )}

      {/* Property Selector Dialog for Tenant Assignment */}
      <PropertySelectorDialog 
        open={propertyDialog}
        onClose={() => setPropertyDialog(false)}
      />

      {/* Lease Renewal Dialog */}
      <Dialog 
        open={renewDialog} 
        onClose={() => {
          setRenewDialog(false);
          setSelectedTenant(null);
          setNewLeaseEnd('');
          setRenewalPeriod('12');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Autorenew color="warning" />
            <Typography variant="h6">Renew Lease</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedTenant && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Tenant:</strong> {selectedTenant.tenantName}
                </Typography>
                <Typography variant="body2">
                  <strong>Property:</strong> {selectedTenant.propertyName} - {selectedTenant.spaceName}
                </Typography>
                <Typography variant="body2">
                  <strong>Current Lease End:</strong> {selectedTenant.leaseEnd 
                    ? format(new Date(selectedTenant.leaseEnd), 'MMM dd, yyyy')
                    : 'N/A'}
                </Typography>
                {selectedTenant.isExpired && (
                  <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
                    ⚠️ This lease expired {Math.abs(selectedTenant.daysUntilExpiry)} days ago
                  </Typography>
                )}
              </Alert>

              <FormControl fullWidth>
                <InputLabel htmlFor="renewal-period">Renewal Period</InputLabel>
                <Select
                  id="renewal-period"
                  value={renewalPeriod}
                  onChange={(e) => handleRenewalPeriodChange(e.target.value)}
                  label="Renewal Period"
                >
                  <MenuItem value="6">6 Months</MenuItem>
                  <MenuItem value="12">12 Months (1 Year)</MenuItem>
                  <MenuItem value="18">18 Months</MenuItem>
                  <MenuItem value="24">24 Months (2 Years)</MenuItem>
                  <MenuItem value="36">36 Months (3 Years)</MenuItem>
                  <MenuItem value="custom">Custom Date</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                id="newLeaseEnd"
                label="New Lease End Date"
                type="date"
                value={newLeaseEnd}
                onChange={(e) => setNewLeaseEnd(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  min: format(new Date(), 'yyyy-MM-dd'),
                }}
                helperText="Select the new lease expiration date"
              />

              {newLeaseEnd && (
                <Alert severity="success">
                  <Typography variant="body2">
                    <strong>New Lease End:</strong> {format(new Date(newLeaseEnd), 'MMMM dd, yyyy')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {differenceInDays(new Date(newLeaseEnd), new Date())} days from today
                  </Typography>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setRenewDialog(false);
              setSelectedTenant(null);
              setNewLeaseEnd('');
              setRenewalPeriod('12');
            }}
            disabled={renewLeaseMutation.isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmRenewal}
            variant="contained"
            color="warning"
            startIcon={<Autorenew />}
            disabled={!newLeaseEnd || renewLeaseMutation.isLoading}
          >
            {renewLeaseMutation.isLoading ? 'Renewing...' : 'Renew Lease'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TenantsPage;


