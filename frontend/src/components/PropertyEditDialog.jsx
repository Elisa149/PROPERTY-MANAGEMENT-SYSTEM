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
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { Edit, Home, LocationOn, AspectRatio } from '@mui/icons-material';
import toast from 'react-hot-toast';

const PropertyEditDialog = ({ open, onClose, property, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'building',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'Uganda',
    description: '',
    // Building specific
    totalFloors: '',
    totalRentableSpaces: '',
    // Land specific
    acreage: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (property && open) {
      setFormData({
        name: property.name || '',
        type: property.type || 'building',
        address: property.address || '',
        city: property.city || '',
        state: property.state || '',
        zipCode: property.zipCode || '',
        country: property.country || 'Uganda',
        description: property.description || '',
        totalFloors: property.buildingDetails?.totalFloors || property.totalFloors || '',
        totalRentableSpaces: property.buildingDetails?.totalRentableSpaces || property.totalRentableSpaces || '',
        acreage: property.landDetails?.acreage || property.acreage || '',
      });
      setErrors({});
    }
  }, [property, open]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Property name is required';
    }
    if (!formData.type) {
      newErrors.type = 'Property type is required';
    }
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (formData.type === 'building') {
      if (formData.totalFloors && (formData.totalFloors < 1 || formData.totalFloors > 100)) {
        newErrors.totalFloors = 'Floors must be between 1 and 100';
      }
      if (formData.totalRentableSpaces && formData.totalRentableSpaces < 0) {
        newErrors.totalRentableSpaces = 'Spaces cannot be negative';
      }
    }

    if (formData.type === 'land') {
      if (formData.acreage && formData.acreage <= 0) {
        newErrors.acreage = 'Acreage must be positive';
      }
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
      // Prepare update data based on property type
      const updateData = {
        name: formData.name.trim(),
        type: formData.type,
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        zipCode: formData.zipCode.trim(),
        country: formData.country,
        description: formData.description.trim(),
      };

      if (formData.type === 'building') {
        updateData.buildingDetails = {
          totalFloors: parseInt(formData.totalFloors) || 0,
          totalRentableSpaces: parseInt(formData.totalRentableSpaces) || 0,
          floors: property.buildingDetails?.floors || [],
        };
        updateData.totalFloors = parseInt(formData.totalFloors) || 0;
        updateData.totalRentableSpaces = parseInt(formData.totalRentableSpaces) || 0;
      } else if (formData.type === 'land') {
        updateData.landDetails = {
          acreage: parseFloat(formData.acreage) || 0,
          squatters: property.landDetails?.squatters || [],
        };
        updateData.acreage = parseFloat(formData.acreage) || 0;
      }

      await onUpdate(property.id, updateData);
      toast.success('Property updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error updating property:', error);
      toast.error(error.response?.data?.error || 'Failed to update property');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Edit color="primary" />
          <Typography variant="h6">Edit Property</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {property && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Editing: <strong>{property.name}</strong>
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Property Name */}
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Property Name *"
                value={formData.name}
                onChange={handleChange('name')}
                error={Boolean(errors.name)}
                helperText={errors.name}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Home />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Property Type */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth error={Boolean(errors.type)}>
                <InputLabel>Property Type *</InputLabel>
                <Select
                  value={formData.type}
                  label="Property Type *"
                  onChange={handleChange('type')}
                >
                  <MenuItem value="building">Building</MenuItem>
                  <MenuItem value="land">Land</MenuItem>
                  <MenuItem value="house">House</MenuItem>
                  <MenuItem value="apartment">Apartment</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Address */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address *"
                value={formData.address}
                onChange={handleChange('address')}
                error={Boolean(errors.address)}
                helperText={errors.address}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationOn />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* City and State */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="City *"
                value={formData.city}
                onChange={handleChange('city')}
                error={Boolean(errors.city)}
                helperText={errors.city}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="State/Region"
                value={formData.state}
                onChange={handleChange('state')}
                error={Boolean(errors.state)}
                helperText={errors.state}
              />
            </Grid>

            {/* Zip Code and Country */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Zip/Postal Code"
                value={formData.zipCode}
                onChange={handleChange('zipCode')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Country"
                value={formData.country}
                onChange={handleChange('country')}
              />
            </Grid>

            {/* Building Specific Fields */}
            {formData.type === 'building' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Total Floors"
                    value={formData.totalFloors}
                    onChange={handleChange('totalFloors')}
                    error={Boolean(errors.totalFloors)}
                    helperText={errors.totalFloors}
                    InputProps={{
                      inputProps: { min: 1, max: 100 }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Total Rentable Spaces"
                    value={formData.totalRentableSpaces}
                    onChange={handleChange('totalRentableSpaces')}
                    error={Boolean(errors.totalRentableSpaces)}
                    helperText={errors.totalRentableSpaces}
                    InputProps={{
                      inputProps: { min: 0 }
                    }}
                  />
                </Grid>
              </>
            )}

            {/* Land Specific Fields */}
            {formData.type === 'land' && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Acreage"
                  value={formData.acreage}
                  onChange={handleChange('acreage')}
                  error={Boolean(errors.acreage)}
                  helperText={errors.acreage}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AspectRatio />
                      </InputAdornment>
                    ),
                    inputProps: { min: 0, step: 0.01 }
                  }}
                />
              </Grid>
            )}

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description}
                onChange={handleChange('description')}
                placeholder="Add any additional details about this property..."
              />
            </Grid>
          </Grid>
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
          {loading ? 'Updating...' : 'Update Property'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PropertyEditDialog;

