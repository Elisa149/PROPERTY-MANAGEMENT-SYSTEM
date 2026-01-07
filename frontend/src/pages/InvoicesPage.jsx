import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
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
  Tabs,
  Tab,
  Alert,
  LinearProgress,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Receipt,
  Payment,
  Person,
  Home,
  Warning,
  CheckCircle,
  TrendingUp,
  MonetizationOn,
  Edit,
  Visibility,
  Download,
  Email,
  Phone,
  CalendarToday,
  AttachMoney,
} from '@mui/icons-material';
import { format, differenceInDays, isValid, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

import { invoicesAPI, paymentsAPI, rentAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PaymentReceipt from '../components/PaymentReceipt';

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

const getInvoiceStatusColor = (status) => {
  switch (status) {
    case 'paid': return 'success';
    case 'partially_paid': return 'info';
    case 'overdue': return 'error';
    case 'pending': return 'warning';
    case 'cancelled': return 'default';
    default: return 'default';
  }
};

const TabPanel = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ paddingTop: 24 }}>
    {value === index && children}
  </div>
);

const InvoicesPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentTab, setCurrentTab] = useState(0);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [lastCreatedPayment, setLastCreatedPayment] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [newPayment, setNewPayment] = useState({
    invoiceId: '',
    rentId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    transactionId: '',
    notes: '',
  });

  // Fetch invoices
  const { 
    data: invoicesData, 
    isLoading: invoicesLoading 
  } = useQuery('invoices', invoicesAPI.getAll);

  // Fetch rent records for reference
  const { data: rentData } = useQuery('rent', rentAPI.getAll);

  // Create payment mutation
  const createPaymentMutation = useMutation(paymentsAPI.create, {
    onSuccess: (response) => {
      queryClient.invalidateQueries('payments');
      queryClient.invalidateQueries('invoices');
      queryClient.invalidateQueries('rent');
      toast.success('Payment recorded successfully!');
      setPaymentDialogOpen(false);
      
      // Store the created payment for receipt
      const createdPayment = response.data.payment;
      setLastCreatedPayment({
        ...createdPayment,
        tenantName: selectedInvoice?.tenantName,
        propertyName: selectedInvoice?.propertyName,
      });
      setReceiptDialogOpen(true);
      
      // Reset payment form
      setNewPayment({
        invoiceId: '',
        rentId: '',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        transactionId: '',
        notes: '',
      });
      setSelectedInvoice(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to record payment');
    },
  });

  // Get invoices data (always call hooks before early return)
  const invoices = invoicesData?.data?.invoices || [];
  const rentRecords = rentData?.data?.rentRecords || [];

  // Filter invoices - MUST be called before early return
  const filteredInvoices = useMemo(() => {
    if (filterStatus === 'all') return invoices;
    return invoices.filter(inv => inv.status === filterStatus);
  }, [invoices, filterStatus]);

  // Calculate stats - MUST be called before early return
  const today = new Date();
  const stats = useMemo(() => ({
    totalInvoices: invoices.length,
    totalAmount: invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0),
    totalPaid: invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0),
    totalPending: invoices.filter(inv => inv.status === 'pending').length,
    totalOverdue: invoices.filter(inv => inv.status === 'overdue').length,
    totalPartiallyPaid: invoices.filter(inv => inv.status === 'partially_paid').length,
  }), [invoices]);

  // Early return AFTER all hooks
  if (invoicesLoading) {
    return <LoadingSpinner message="Loading invoices..." />;
  }

  const handlePayInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    const remainingAmount = invoice.remainingAmount || (invoice.amount - (invoice.paidAmount || 0));
    setNewPayment({
      invoiceId: invoice.id,
      rentId: invoice.rentId,
      amount: remainingAmount,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      transactionId: '',
      notes: `Payment for invoice ${invoice.invoiceNumber}`,
    });
    setPaymentDialogOpen(true);
  };

  const handleRecordPayment = () => {
    if (!newPayment.invoiceId || !newPayment.amount) {
      toast.error('Please enter payment amount');
      return;
    }
    
    // Find the invoice to get propertyId
    const invoice = invoices.find(inv => inv.id === newPayment.invoiceId);
    if (!invoice) {
      toast.error('Invoice not found');
      return;
    }
    
    const paymentData = {
      rentId: newPayment.rentId,
      propertyId: invoice.propertyId,
      invoiceId: newPayment.invoiceId,
      amount: parseFloat(newPayment.amount),
      paymentDate: newPayment.paymentDate,
      paymentMethod: newPayment.paymentMethod,
      transactionId: newPayment.transactionId || '',
      notes: newPayment.notes || '',
      lateFee: 0,
      status: 'completed',
    };
    
    createPaymentMutation.mutate(paymentData);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Receipt color="primary" />
            Invoices
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View and manage invoices, track payments
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Filter Status</InputLabel>
            <Select
              value={filterStatus}
              label="Filter Status"
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="partially_paid">Partially Paid</MenuItem>
              <MenuItem value="paid">Paid</MenuItem>
              <MenuItem value="overdue">Overdue</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Receipt sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6" color="primary.main">
                  Total Invoices
                </Typography>
              </Box>
              <Typography variant="h4" color="primary.main">
                {stats.totalInvoices}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MonetizationOn sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="h6" color="success.main">
                  Total Amount
                </Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {formatCurrency(stats.totalAmount)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircle sx={{ color: 'info.main', mr: 1 }} />
                <Typography variant="h6" color="info.main">
                  Total Paid
                </Typography>
              </Box>
              <Typography variant="h4" color="info.main">
                {formatCurrency(stats.totalPaid)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Warning sx={{ color: 'error.main', mr: 1 }} />
                <Typography variant="h6" color="error.main">
                  Overdue
                </Typography>
              </Box>
              <Typography variant="h4" color="error.main">
                {stats.totalOverdue}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Invoices Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Invoice #</strong></TableCell>
              <TableCell><strong>Tenant</strong></TableCell>
              <TableCell><strong>Property</strong></TableCell>
              <TableCell><strong>Amount</strong></TableCell>
              <TableCell><strong>Paid</strong></TableCell>
              <TableCell><strong>Remaining</strong></TableCell>
              <TableCell><strong>Due Date</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Box sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No invoices found
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => {
                const dueDate = invoice.dueDate ? (invoice.dueDate instanceof Date ? invoice.dueDate : new Date(invoice.dueDate)) : null;
                const isOverdue = dueDate && dueDate < today && invoice.status !== 'paid';
                const remainingAmount = invoice.remainingAmount || (invoice.amount - (invoice.paidAmount || 0));
                
                return (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold" fontFamily="monospace">
                        {invoice.invoiceNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                          {invoice.tenantName?.charAt(0)?.toUpperCase() || '?'}
                        </Avatar>
                        <Typography variant="body2" fontWeight="medium">
                          {invoice.tenantName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {invoice.propertyName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(invoice.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="success.main">
                        {formatCurrency(invoice.paidAmount || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={remainingAmount > 0 ? 'error.main' : 'success.main'} fontWeight="bold">
                        {formatCurrency(remainingAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={isOverdue ? 'error.main' : 'text.primary'}>
                        {dueDate && isValid(dueDate) ? format(dueDate, 'MMM dd, yyyy') : 'N/A'}
                      </Typography>
                      {isOverdue && (
                        <Typography variant="caption" color="error.main" display="block">
                          {differenceInDays(today, dueDate)} days overdue
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={invoice.status?.replace('_', ' ').toUpperCase()}
                        color={getInvoiceStatusColor(invoice.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => navigate(`/app/invoices/${invoice.id}`)}>
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        {remainingAmount > 0 && invoice.status !== 'cancelled' && (
                          <Tooltip title="Pay Invoice">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handlePayInvoice(invoice)}
                            >
                              <Payment />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Pay Invoice</DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Invoice: {selectedInvoice.invoiceNumber}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tenant: {selectedInvoice.tenantName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Property: {selectedInvoice.propertyName}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">Total Amount:</Typography>
                <Typography variant="body2" fontWeight="bold">{formatCurrency(selectedInvoice.amount)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">Paid Amount:</Typography>
                <Typography variant="body2" color="success.main">{formatCurrency(selectedInvoice.paidAmount || 0)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" fontWeight="bold">Remaining:</Typography>
                <Typography variant="body2" fontWeight="bold" color="error.main">
                  {formatCurrency(selectedInvoice.remainingAmount || (selectedInvoice.amount - (selectedInvoice.paidAmount || 0)))}
                </Typography>
              </Box>
            </Box>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="paymentAmount"
                label="Payment Amount *"
                type="number"
                value={newPayment.amount}
                onChange={(e) => setNewPayment(prev => ({ ...prev, amount: e.target.value }))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">UGX</InputAdornment>,
                }}
                helperText={`Maximum: ${formatCurrency(selectedInvoice?.remainingAmount || 0)}`}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="paymentDate"
                label="Payment Date *"
                type="date"
                value={newPayment.paymentDate}
                onChange={(e) => setNewPayment(prev => ({ ...prev, paymentDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel htmlFor="payment-method">Payment Method</InputLabel>
                <Select
                  id="payment-method"
                  value={newPayment.paymentMethod}
                  label="Payment Method"
                  onChange={(e) => setNewPayment(prev => ({ ...prev, paymentMethod: e.target.value }))}
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="check">Check</MenuItem>
                  <MenuItem value="online">Online Payment</MenuItem>
                  <MenuItem value="credit_card">Credit Card</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="transactionId"
                label="Transaction ID / Reference"
                value={newPayment.transactionId}
                onChange={(e) => setNewPayment(prev => ({ ...prev, transactionId: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="paymentNotes"
                label="Notes"
                multiline
                rows={2}
                value={newPayment.notes}
                onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleRecordPayment}
            variant="contained"
            disabled={!newPayment.amount || parseFloat(newPayment.amount) <= 0}
          >
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Receipt Dialog */}
      <PaymentReceipt
        payment={lastCreatedPayment}
        open={receiptDialogOpen}
        onClose={() => setReceiptDialogOpen(false)}
      />
    </Box>
  );
};

export default InvoicesPage;

