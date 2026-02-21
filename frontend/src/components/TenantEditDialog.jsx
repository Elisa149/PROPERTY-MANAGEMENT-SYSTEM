import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  InputAdornment,
  Typography,
  Box,
  Alert,
  Avatar,
} from '@mui/material';
import {
  Edit,
  Person,
  Phone,
  Email,
  Badge,
  LocationOn,
} from '@mui/icons-material';
import toast from 'react-hot-toast';

const TenantEditDialog = ({ open, onClose, tenant, onUpdate }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    nationalId: '',
    emergencyContact: '',
    emergencyContactName: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (tenant && open) {
      // Handle different possible property names
      const fullName = tenant.fullName || tenant.tenantName || tenant.name || '';
      const nameParts = fullName.split(' ');
      const firstName = tenant.firstName || nameParts[0] || '';
      const lastName = tenant.lastName || nameParts.slice(1).join(' ') || '';

      setFormData({
        firstName: firstName,
        lastName: lastName,
        phone: tenant.phone || tenant.tenantPhone || '',
        email: tenant.email || tenant.tenantEmail || '',
        nationalId: tenant.nationalId || '',
        emergencyContact: tenant.emergencyContact || '',
        emergencyContactName: tenant.emergencyContactName || '',
        notes: tenant.notes || '',
      });
      setErrors({});
    }
  }, [tenant, open]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9+\s()-]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        fullName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        nationalId: formData.nationalId.trim(),
        emergencyContact: formData.emergencyContact.trim(),
        emergencyContactName: formData.emergencyContactName.trim(),
        notes: formData.notes.trim(),
      };

      await onUpdate(tenant.id, updateData);
      toast.success('Tenant information updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error updating tenant:', error);
      toast.error(error.response?.data?.error || 'Failed to update tenant information');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Edit color="primary" />
          <Typography variant="h6">Edit Tenant Information</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {tenant && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
                {getInitials(formData.firstName || 'T', formData.lastName || 'N')}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  {formData.firstName} {formData.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {tenant.propertyName && `${tenant.propertyName}${tenant.spaceName ? ` - ${tenant.spaceName}` : ''}`}
                </Typography>
              </Box>
            </Box>
          )}

          <Grid container spacing={3}>
            {/* First Name */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="First Name *"
                value={formData.firstName}
                onChange={handleChange('firstName')}
                error={Boolean(errors.firstName)}
                helperText={errors.firstName}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Last Name */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Name *"
                value={formData.lastName}
                onChange={handleChange('lastName')}
                error={Boolean(errors.lastName)}
                helperText={errors.lastName}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Phone */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone Number *"
                value={formData.phone}
                onChange={handleChange('phone')}
                error={Boolean(errors.phone)}
                helperText={errors.phone}
                placeholder="+256 xxx xxx xxx"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Email */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                error={Boolean(errors.email)}
                helperText={errors.email}
                placeholder="tenant@example.com"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* National ID */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="National ID / Passport"
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

            {/* Emergency Contact Name */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Emergency Contact Name"
                value={formData.emergencyContactName}
                onChange={handleChange('emergencyContactName')}
                placeholder="Contact person name"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Emergency Contact */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Emergency Contact Phone"
                value={formData.emergencyContact}
                onChange={handleChange('emergencyContact')}
                placeholder="+256 xxx xxx xxx"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={formData.notes}
                onChange={handleChange('notes')}
                placeholder="Add any additional notes about this tenant..."
              />
            </Grid>
          </Grid>

          <Alert severity="warning" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>Note:</strong> Changing tenant information will not affect existing rent agreements or payment records.
            </Typography>
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={<Edit />}
        >
          {loading ? 'Updating...' : 'Update Tenant'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TenantEditDialog;

