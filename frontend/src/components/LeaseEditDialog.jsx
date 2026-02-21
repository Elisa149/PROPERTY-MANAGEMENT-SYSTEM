import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  Divider,
} from '@mui/material';
import {
  Person,
  Phone,
  Email,
  AttachMoney,
  CalendarMonth,
  Description,
  Save,
  Close,
  Badge,
  ContactPhone,
  Security,
  ElectricBolt,
  Percent,
} from '@mui/icons-material';
import { format } from 'date-fns';

const LeaseEditDialog = ({ open, onClose, lease, space, onSave }) => {
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    if (lease && open) {
      // Populate form with existing lease data
      setFormData({
        tenantName: lease.tenantName || '',
        tenantEmail: lease.tenantEmail || '',
        tenantPhone: lease.tenantPhone || '',
        nationalId: lease.nationalId || '',
        emergencyContact: lease.emergencyContact || '',
        leaseStart: lease.leaseStart ? (typeof lease.leaseStart === 'string' ? lease.leaseStart.split('T')[0] : format(new Date(lease.leaseStart), 'yyyy-MM-dd')) : '',
        leaseEnd: lease.leaseEnd ? (typeof lease.leaseEnd === 'string' ? lease.leaseEnd.split('T')[0] : format(new Date(lease.leaseEnd), 'yyyy-MM-dd')) : '',
        leasePeriodType: lease.leasePeriodType || 'yearly',
        leaseDuration: lease.leaseDuration || 12,
        monthlyRent: lease.monthlyRent || 0,
        deposit: lease.deposit || 0,
        securityDeposit: lease.securityDeposit || 0,
        paymentDueDate: lease.paymentDueDate || 1,
        rentEscalation: lease.rentEscalation || 0,
        includeUtilities: lease.includeUtilities || false,
        utilitiesAmount: lease.utilitiesAmount || 0,
        notes: lease.notes || '',
        agreementType: lease.agreementType || 'standard',
      });
    }
  }, [lease, open]);

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    // Ensure all numeric fields are properly converted to numbers
    const sanitizedData = {
      ...formData,
      monthlyRent: Number(formData.monthlyRent) || 0,
      deposit: Number(formData.deposit) || 0,
      securityDeposit: Number(formData.securityDeposit) || 0,
      paymentDueDate: Number(formData.paymentDueDate) || 1,
      rentEscalation: Number(formData.rentEscalation) || 0,
      leaseDuration: Number(formData.leaseDuration) || 12,
      utilitiesAmount: Number(formData.utilitiesAmount) || 0,
    };
    onSave(sanitizedData);
  };

  if (!lease) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Person />
          <div>
            <Typography variant="h6">Edit Lease Agreement</Typography>
            <Typography variant="caption" color="text.secondary">
              {space?.spaceName || space?.assignedArea}
            </Typography>
          </div>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Tenant Information Section */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
              <Person /> Tenant Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Tenant Name"
              value={formData.tenantName}
              onChange={handleChange('tenantName')}
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
              label="Email"
              type="email"
              value={formData.tenantEmail}
              onChange={handleChange('tenantEmail')}
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
              label="Phone Number"
              value={formData.tenantPhone}
              onChange={handleChange('tenantPhone')}
              required
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
              label="National ID"
              value={formData.nationalId}
              onChange={handleChange('nationalId')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Badge />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Emergency Contact"
              value={formData.emergencyContact}
              onChange={handleChange('emergencyContact')}
              helperText="Name and phone number of emergency contact"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <ContactPhone />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Lease Dates Section */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600, mt: 2 }}>
              <CalendarMonth /> Lease Period
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Lease Start Date"
              type="date"
              value={formData.leaseStart}
              onChange={handleChange('leaseStart')}
              required
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarMonth />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Lease End Date"
              type="date"
              value={formData.leaseEnd}
              onChange={handleChange('leaseEnd')}
              required
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarMonth />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Lease Period Type</InputLabel>
              <Select
                value={formData.leasePeriodType}
                onChange={handleChange('leasePeriodType')}
                label="Lease Period Type"
              >
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
                <MenuItem value="yearly">Yearly</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Lease Duration"
              type="number"
              value={formData.leaseDuration}
              onChange={handleChange('leaseDuration')}
              helperText={`In ${formData.leasePeriodType === 'monthly' ? 'months' : formData.leasePeriodType === 'quarterly' ? 'quarters' : 'years'}`}
            />
          </Grid>

          {/* Financial Details Section */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600, mt: 2 }}>
              <AttachMoney /> Financial Details
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Monthly Rent"
              type="number"
              value={formData.monthlyRent}
              onChange={handleChange('monthlyRent')}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AttachMoney />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Deposit Amount"
              type="number"
              value={formData.deposit}
              onChange={handleChange('deposit')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AttachMoney />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Security Deposit"
              type="number"
              value={formData.securityDeposit}
              onChange={handleChange('securityDeposit')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Security />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Payment Due Date"
              type="number"
              value={formData.paymentDueDate}
              onChange={handleChange('paymentDueDate')}
              helperText="Day of the month (1-31)"
              inputProps={{ min: 1, max: 31 }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Rent Escalation"
              type="number"
              value={formData.rentEscalation}
              onChange={handleChange('rentEscalation')}
              helperText="Annual increase percentage"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Percent />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">%</InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Utilities Section */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600, mt: 2 }}>
              <ElectricBolt /> Utilities
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.includeUtilities}
                  onChange={handleChange('includeUtilities')}
                />
              }
              label="Include Utilities in Rent"
            />
          </Grid>

          {formData.includeUtilities && (
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Utilities Amount"
                type="number"
                value={formData.utilitiesAmount}
                onChange={handleChange('utilitiesAmount')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoney />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          )}

          {/* Agreement Details Section */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600, mt: 2 }}>
              <Description /> Agreement Details
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Agreement Type</InputLabel>
              <Select
                value={formData.agreementType}
                onChange={handleChange('agreementType')}
                label="Agreement Type"
              >
                <MenuItem value="standard">Standard Lease</MenuItem>
                <MenuItem value="short_term">Short Term</MenuItem>
                <MenuItem value="month_to_month">Month-to-Month</MenuItem>
                <MenuItem value="commercial">Commercial Lease</MenuItem>
                <MenuItem value="custom">Custom Agreement</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notes / Special Terms"
              value={formData.notes}
              onChange={handleChange('notes')}
              multiline
              rows={4}
              placeholder="Add any special terms, conditions, or notes about this lease..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 2 }}>
                    <Description />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={onClose}
          startIcon={<Close />}
          color="inherit"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={<Save />}
          disabled={!formData.tenantName || !formData.tenantPhone || !formData.leaseStart || !formData.leaseEnd || !formData.monthlyRent}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LeaseEditDialog;

