import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
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
  Grid,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Receipt,
  Add,
  Person,
  Home,
} from '@mui/icons-material';
import toast from 'react-hot-toast';

import { rentAPI, invoicesAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Helper functions
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

const RentPage = () => {
  const queryClient = useQueryClient();
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedRentForInvoice, setSelectedRentForInvoice] = useState(null);
  
  const [newInvoice, setNewInvoice] = useState({
    rentId: '',
    amount: '',
    month: new Date().getMonth() + 1, // Current month (1-12)
    year: new Date().getFullYear(), // Current year
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    description: '',
    notes: '',
  });

  // Fetch rent records (only active ones for invoice creation)
  const { 
    data: rentData, 
    isLoading: rentLoading,
    error: rentError 
  } = useQuery('rent', rentAPI.getAll);

  // Fetch invoices to check if invoice already exists for current month
  const { 
    data: invoicesData 
  } = useQuery('invoices', invoicesAPI.getAll);

  // Create invoice mutation
  const createInvoiceMutation = useMutation(invoicesAPI.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('invoices');
      queryClient.invalidateQueries('rent');
      toast.success('Invoice created successfully!');
      setInvoiceDialogOpen(false);
      const currentDate = new Date();
      setNewInvoice({
        rentId: '',
        amount: '',
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: '',
        notes: '',
      });
      setSelectedRentForInvoice(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create invoice');
    },
  });

  if (rentLoading) {
    return <LoadingSpinner message="Loading tenants..." />;
  }

  if (rentError) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        Failed to load tenant records. Please try again.
      </Alert>
    );
  }

  const rentRecords = rentData?.data?.rentRecords || [];
  const invoices = invoicesData?.data?.invoices || [];
  
  // Filter to show only active rent agreements
  const activeRentRecords = rentRecords.filter(rent => rent.status === 'active');

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];

  // Get current month and year
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentYear = currentDate.getFullYear();

  // Check if invoice already exists for a rent record in the current month
  const hasInvoiceForCurrentMonth = (rentId) => {
    return invoices.some(invoice => {
      if (invoice.rentId !== rentId) return false;
      
      // Check if invoice was created in the current month
      const issueDate = invoice.issueDate ? new Date(invoice.issueDate) : null;
      if (!issueDate) return false;
      
      const invoiceMonth = issueDate.getMonth() + 1;
      const invoiceYear = issueDate.getFullYear();
      
      return invoiceMonth === currentMonth && invoiceYear === currentYear;
    });
  };

  const handleCreateInvoice = (rent) => {
    // Check if invoice already exists for current month
    if (hasInvoiceForCurrentMonth(rent.id)) {
      toast.error(`Invoice already created for ${monthNames[currentMonth - 1]} ${currentYear}`);
      return;
    }
    
    // Set due date to the 1st of the current month
    const dueDate = new Date(currentYear, currentMonth - 1, 1); // 1st of current month (month is 0-indexed)
    
    setSelectedRentForInvoice(rent);
    setNewInvoice({
      rentId: rent.id,
      amount: rent.monthlyRent || 0,
      month: currentMonth,
      year: currentYear,
      dueDate: dueDate.toISOString().split('T')[0],
      description: `Monthly rent for ${monthNames[currentMonth - 1]} ${currentYear} - ${rent.propertyName}${rent.spaceName ? ` - ${rent.spaceName}` : ''}`,
      notes: '',
    });
    setInvoiceDialogOpen(true);
  };
  
  const getYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    // Show current year and next 2 years
    for (let i = 0; i < 3; i++) {
      years.push(currentYear + i);
    }
    return years;
  };

  const handleMonthYearChange = (field, value) => {
    const updatedInvoice = { ...newInvoice, [field]: value };
    
    // Update due date when month/year changes (set to 1st of selected month)
    if (field === 'month' || field === 'year') {
      const selectedMonth = field === 'month' ? parseInt(value) : updatedInvoice.month;
      const selectedYear = field === 'year' ? parseInt(value) : updatedInvoice.year;
      const dueDate = new Date(selectedYear, selectedMonth - 1, 1); // month is 0-indexed
      updatedInvoice.dueDate = dueDate.toISOString().split('T')[0];
      
      // Update description with new month/year
      updatedInvoice.description = `Monthly rent for ${monthNames[selectedMonth - 1]} ${selectedYear} - ${selectedRentForInvoice?.propertyName || ''}${selectedRentForInvoice?.spaceName ? ` - ${selectedRentForInvoice.spaceName}` : ''}`;
    }
    
    setNewInvoice(updatedInvoice);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Receipt color="primary" />
            Monthly Invoice Creation
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create monthly invoices for all active tenants
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={() => {
            if (activeRentRecords.length === 0) {
              toast.error('No active tenants found');
              return;
            }
            // Find first tenant without invoice for current month
            const tenantWithoutInvoice = activeRentRecords.find(rent => !hasInvoiceForCurrentMonth(rent.id));
            if (!tenantWithoutInvoice) {
              toast.error(`All tenants already have invoices for ${monthNames[currentMonth - 1]} ${currentYear}`);
              return;
            }
            // Open dialog with first tenant without invoice pre-selected
            handleCreateInvoice(tenantWithoutInvoice);
          }}
          disabled={activeRentRecords.length === 0 || activeRentRecords.every(rent => hasInvoiceForCurrentMonth(rent.id))}
        >
          Create Invoice
        </Button>
      </Box>

      {/* Active Tenants Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Tenant</strong></TableCell>
                <TableCell><strong>Property</strong></TableCell>
                <TableCell><strong>Space</strong></TableCell>
                <TableCell><strong>Monthly Rent</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activeRentRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No active tenants found. Please assign tenants to properties first.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                activeRentRecords.map((rent) => (
                  <TableRow key={rent.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                          {getInitials(rent.tenantName)}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            {rent.tenantName}
                          </Typography>
                          {rent.tenantPhone && (
                            <Typography variant="caption" color="text.secondary">
                              {rent.tenantPhone}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Home color="primary" />
                        <Typography variant="body2">
                          {rent.propertyName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={rent.spaceName || 'N/A'} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1" fontWeight="medium" color="primary.main">
                        {formatCurrency(rent.monthlyRent || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {hasInvoiceForCurrentMonth(rent.id) ? (
                        <Chip 
                          label="Invoice Created" 
                          color="success" 
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <Chip 
                          label="Pending" 
                          color="warning" 
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {hasInvoiceForCurrentMonth(rent.id) ? (
                        <Tooltip title={`Invoice already created for ${monthNames[currentMonth - 1]} ${currentYear}. Available next month.`}>
                          <span>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<Receipt />}
                              disabled
                            >
                              Create Invoice
                            </Button>
                          </span>
                        </Tooltip>
                      ) : (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<Receipt />}
                          onClick={() => handleCreateInvoice(rent)}
                        >
                          Create Invoice
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create Invoice Dialog */}
      <Dialog open={invoiceDialogOpen} onClose={() => setInvoiceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Monthly Invoice</DialogTitle>
        <DialogContent>
          {selectedRentForInvoice && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Tenant Information
              </Typography>
              <Typography variant="body1"><strong>Tenant:</strong> {selectedRentForInvoice.tenantName}</Typography>
              <Typography variant="body1"><strong>Property:</strong> {selectedRentForInvoice.propertyName}</Typography>
              {selectedRentForInvoice.spaceName && (
                <Typography variant="body1"><strong>Space:</strong> {selectedRentForInvoice.spaceName}</Typography>
              )}
            </Box>
          )}
          <Alert severity="info" sx={{ mb: 2 }}>
            Creating invoice for <strong>{monthNames[newInvoice.month - 1]} {newInvoice.year}</strong>. 
            Only one invoice per month is allowed per tenant.
          </Alert>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel htmlFor="invoice-month">Month *</InputLabel>
                <Select
                  id="invoice-month"
                  value={newInvoice.month}
                  label="Month *"
                  onChange={(e) => handleMonthYearChange('month', e.target.value)}
                  disabled
                >
                  {monthNames.map((month, index) => (
                    <MenuItem key={index + 1} value={index + 1}>
                      {month}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel htmlFor="invoice-year">Year *</InputLabel>
                <Select
                  id="invoice-year"
                  value={newInvoice.year}
                  label="Year *"
                  onChange={(e) => handleMonthYearChange('year', e.target.value)}
                  disabled
                >
                  {getYears().map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="invoiceAmount"
                label="Invoice Amount *"
                type="number"
                value={newInvoice.amount}
                onChange={(e) => setNewInvoice(prev => ({ ...prev, amount: e.target.value }))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">UGX</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="invoiceDueDate"
                label="Due Date *"
                type="date"
                value={newInvoice.dueDate}
                onChange={(e) => setNewInvoice(prev => ({ ...prev, dueDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="invoiceDescription"
                label="Description"
                multiline
                rows={3}
                value={newInvoice.description}
                onChange={(e) => setNewInvoice(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Invoice description (e.g., Monthly rent for January 2024)"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="invoiceNotes"
                label="Additional Notes (Optional)"
                multiline
                rows={2}
                value={newInvoice.notes}
                onChange={(e) => setNewInvoice(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes for this invoice"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvoiceDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (!newInvoice.rentId || !newInvoice.amount) {
                toast.error('Please enter invoice amount');
                return;
              }
              
              const invoiceData = {
                rentId: newInvoice.rentId,
                propertyId: selectedRentForInvoice?.propertyId,
                amount: parseFloat(newInvoice.amount),
                dueDate: newInvoice.dueDate,
                description: newInvoice.description || '',
                notes: newInvoice.notes || '',
              };
              
              createInvoiceMutation.mutate(invoiceData);
            }}
            variant="contained"
            disabled={createInvoiceMutation.isLoading}
          >
            {createInvoiceMutation.isLoading ? 'Creating...' : 'Create Invoice'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RentPage;
