import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Home,
  Business,
  AttachMoney,
  ExpandMore,
  Search,
  FilterList,
  TrendingUp,
  People,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { rentAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const GlobalRentManagementPage = () => {
  const { hasRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOrganization, setFilterOrganization] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedOrgs, setExpandedOrgs] = useState({});

  if (!hasRole('super_admin')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Access Denied</Typography>
          <Typography>Only Super Administrators can view rent records across all organizations.</Typography>
        </Alert>
      </Box>
    );
  }

  // Fetch all rent records grouped by organization
  const {
    data: rentData,
    isLoading,
    error,
  } = useQuery('allRentRecords', rentAPI.getAllRentRecords, {
    retry: 2,
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to load rent records');
    },
  });

  const groupedRent = rentData?.data?.groupedByOrganization || [];
  const summary = rentData?.data?.summary || {
    totalRecords: 0,
    totalOrganizations: 0,
    totalActiveRecords: 0,
    totalTerminatedRecords: 0,
    totalMonthlyRent: 0,
  };

  // Filter organizations
  const filteredOrganizations = groupedRent.filter((org) => {
    const matchesSearch =
      !searchTerm ||
      org.organizationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.rentRecords.some((r) =>
        r.tenantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.propertyName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    const matchesOrg = !filterOrganization || org.organizationId === filterOrganization;
    const matchesStatus =
      !filterStatus ||
      (filterStatus === 'active' && org.activeRecords > 0) ||
      (filterStatus === 'terminated' && org.terminatedRecords > 0) ||
      (filterStatus === 'all' && org.totalRecords > 0);

    return matchesSearch && matchesOrg && matchesStatus;
  });

  const handleToggleOrg = (orgId) => {
    setExpandedOrgs((prev) => ({
      ...prev,
      [orgId]: !prev[orgId],
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'terminated':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Error Loading Rent Records</Typography>
          <Typography>{error.message || 'Failed to load rent records'}</Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Global Rent Management
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View and manage all rent records across all organizations
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Records
                  </Typography>
                  <Typography variant="h4">{summary.totalRecords}</Typography>
                </Box>
                <Home sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Active Rentals
                  </Typography>
                  <Typography variant="h4">{summary.totalActiveRecords}</Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Organizations
                  </Typography>
                  <Typography variant="h4">{summary.totalOrganizations}</Typography>
                </Box>
                <Business sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Monthly Rent
                  </Typography>
                  <Typography variant="h4">
                    UGX {summary.totalMonthlyRent.toLocaleString()}
                  </Typography>
                </Box>
                <AttachMoney sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search by organization, tenant, or property..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Filter by Organization</InputLabel>
              <Select
                value={filterOrganization}
                label="Filter by Organization"
                onChange={(e) => setFilterOrganization(e.target.value)}
              >
                <MenuItem value="">All Organizations</MenuItem>
                {groupedRent.map((org) => (
                  <MenuItem key={org.organizationId} value={org.organizationId}>
                    {org.organizationName} ({org.totalRecords} records)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Filter by Status</InputLabel>
              <Select
                value={filterStatus}
                label="Filter by Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="active">Active Only</MenuItem>
                <MenuItem value="terminated">Terminated Only</MenuItem>
                <MenuItem value="all">All Records</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Rent Records Grouped by Organization */}
      <Box>
        {filteredOrganizations.length === 0 ? (
          <Paper sx={{ p: 4 }}>
            <Typography align="center" color="text.secondary">
              {searchTerm || filterOrganization || filterStatus
                ? 'No rent records match the filters'
                : 'No rent records found'}
            </Typography>
          </Paper>
        ) : (
          filteredOrganizations.map((org) => (
            <Accordion
              key={org.organizationId}
              expanded={expandedOrgs[org.organizationId] || false}
              onChange={() => handleToggleOrg(org.organizationId)}
              sx={{ mb: 2 }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Business color="primary" />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {org.organizationName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {org.totalRecords} total records • {org.activeRecords} active • {org.terminatedRecords} terminated
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip
                      label={`${org.activeRecords} active`}
                      color="success"
                      size="small"
                    />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                      UGX {org.totalMonthlyRent.toLocaleString()}/mo
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Tenant</TableCell>
                        <TableCell>Property</TableCell>
                        <TableCell>Monthly Rent</TableCell>
                        <TableCell>Lease Start</TableCell>
                        <TableCell>Lease End</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {org.rentRecords.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                            <Typography color="text.secondary">No rent records</Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        org.rentRecords.map((record) => (
                          <TableRow key={record.id} hover>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {record.tenantName}
                                </Typography>
                                {record.tenantEmail && (
                                  <Typography variant="caption" color="text.secondary">
                                    {record.tenantEmail}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {record.propertyName}
                                </Typography>
                                {record.propertyAddress && (
                                  <Typography variant="caption" color="text.secondary">
                                    {record.propertyAddress}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                UGX {(record.monthlyRent || 0).toLocaleString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {record.leaseStart
                                  ? format(new Date(record.leaseStart), 'MMM dd, yyyy')
                                  : '-'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {record.leaseEnd
                                  ? format(new Date(record.leaseEnd), 'MMM dd, yyyy')
                                  : 'Ongoing'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={record.status || 'active'}
                                color={getStatusColor(record.status)}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Box>
    </Box>
  );
};

export default GlobalRentManagementPage;

