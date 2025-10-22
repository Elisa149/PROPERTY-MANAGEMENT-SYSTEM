import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from 'react-query';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  ArrowBack,
  Person,
  Phone,
  AttachMoney,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';

import { propertiesAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

const propertyTypes = [
  { value: 'land', label: 'Land' },
  { value: 'building', label: 'Building' },
];

const buildingTypes = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'other', label: 'Other' },
];

const ownershipTypes = [
  { value: 'owned', label: 'Owned' },
  { value: 'leasing', label: 'Leasing' },
];

const SimpleCreatePropertyPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: {
      name: '',
      type: '',
      village: '',
      parish: '',
      subCounty: '',
      county: '',
      district: '',
      landmarks: '',
      establishmentDate: '',
      caretakerName: '',
      caretakerPhone: '',
      plotNumber: '',
      ownershipType: '',
      buildingType: '',
      numberOfFloors: 1,
      rentableSpaces: 0,
      monthlyRent: 0,
      description: '',
    },
  });

  const watchedType = watch('type');

  const createPropertyMutation = useMutation(propertiesAPI.create, {
    onSuccess: (data) => {
      queryClient.invalidateQueries('properties');
      toast.success('Property created successfully!');
      navigate('/app/properties');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create property');
    },
  });

  const onSubmit = (data) => {
    // Check if user has organizationId
    if (!userProfile?.organizationId) {
      toast.error('You must be assigned to an organization to create properties');
      return;
    }

    // Restructure data to match backend schema
    const propertyData = {
      name: data.name,
      type: data.type,
      organizationId: userProfile.organizationId, // Add organizationId from user profile
      assignedManagers: [], // Optional: can be assigned later
      caretakerId: '', // Optional: can be assigned later
      location: {
        village: data.village,
        parish: data.parish,
        subCounty: data.subCounty,
        county: data.county,
        district: data.district,
        landmarks: data.landmarks,
      },
      establishmentDate: data.establishmentDate,
      caretakerName: data.caretakerName,
      caretakerPhone: data.caretakerPhone,
      plotNumber: data.plotNumber,
      ownershipType: data.ownershipType,
      description: data.description,
      amenities: [],
      status: 'vacant',
    };

    // Add building details if building type
    if (data.type === 'building') {
      propertyData.buildingDetails = {
        buildingType: data.buildingType,
        numberOfFloors: data.numberOfFloors,
        floors: [{
          floorNumber: 0,
          rentableSpaces: data.rentableSpaces,
          monthlyRentAmount: data.monthlyRent,
          description: 'Main floor'
        }],
        totalRentableSpaces: data.rentableSpaces,
      };
    }

    createPropertyMutation.mutate(propertyData);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/app/properties')}>
          <ArrowBack />
        </IconButton>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Add New Property
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Complete property registration with detailed information
          </Typography>
        </Box>
      </Box>

      <Paper sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                📋 Basic Property Information
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="name"
                control={control}
                rules={{ required: 'Property name is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Property Name"
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    placeholder="e.g., Sunrise Apartments"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="type"
                control={control}
                rules={{ required: 'Property type is required' }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.type}>
                    <InputLabel>Property Type</InputLabel>
                    <Select {...field} label="Property Type">
                      {propertyTypes.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.type && (
                      <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                        {errors.type.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="establishmentDate"
                control={control}
                rules={{ required: 'Establishment date is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="date"
                    label="Establishment Date"
                    error={!!errors.establishmentDate}
                    helperText={errors.establishmentDate?.message}
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="ownershipType"
                control={control}
                rules={{ required: 'Ownership type is required' }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.ownershipType}>
                    <InputLabel>Ownership Type</InputLabel>
                    <Select {...field} label="Ownership Type">
                      {ownershipTypes.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="plotNumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Plot Number (Optional)"
                    placeholder="e.g., Plot 123"
                  />
                )}
              />
            </Grid>

            {/* Location Information */}
            <Grid item xs={12} sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom color="primary">
                📍 Location Information
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="village"
                control={control}
                rules={{ required: 'Village is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Village"
                    error={!!errors.village}
                    helperText={errors.village?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="parish"
                control={control}
                rules={{ required: 'Parish is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Parish"
                    error={!!errors.parish}
                    helperText={errors.parish?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="subCounty"
                control={control}
                rules={{ required: 'Sub County is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Sub County"
                    error={!!errors.subCounty}
                    helperText={errors.subCounty?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="county"
                control={control}
                rules={{ required: 'County is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="County"
                    error={!!errors.county}
                    helperText={errors.county?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="district"
                control={control}
                rules={{ required: 'District is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="District"
                    error={!!errors.district}
                    helperText={errors.district?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="landmarks"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Landmarks (Optional)"
                    placeholder="Near market, next to school"
                  />
                )}
              />
            </Grid>

            {/* Caretaker Information */}
            <Grid item xs={12} sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom color="primary">
                👤 Caretaker Information
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="caretakerName"
                control={control}
                rules={{ required: 'Caretaker name is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Caretaker Name"
                    error={!!errors.caretakerName}
                    helperText={errors.caretakerName?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="caretakerPhone"
                control={control}
                rules={{ required: 'Caretaker phone is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Caretaker Phone"
                    error={!!errors.caretakerPhone}
                    helperText={errors.caretakerPhone?.message}
                    placeholder="+256 700 123 456"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            {/* Building Details - Only for buildings */}
            {watchedType === 'building' && (
              <>
                <Grid item xs={12} sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    🏢 Building Details
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="buildingType"
                    control={control}
                    rules={{ 
                      required: watchedType === 'building' ? 'Building type is required' : false 
                    }}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.buildingType}>
                        <InputLabel>Building Type</InputLabel>
                        <Select {...field} label="Building Type">
                          {buildingTypes.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                              {type.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="numberOfFloors"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        type="number"
                        label="Number of Floors"
                        inputProps={{ min: 1, max: 50 }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="rentableSpaces"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        type="number"
                        label="Total Rentable Spaces"
                        inputProps={{ min: 0 }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="monthlyRent"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        type="number"
                        label="Monthly Rent (per space)"
                        inputProps={{ min: 0 }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <AttachMoney />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>
              </>
            )}

            {/* Description */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    multiline
                    rows={3}
                    label="Property Description (Optional)"
                    placeholder="Describe the property..."
                  />
                )}
              />
            </Grid>

            {/* Form Actions */}
            <Grid item xs={12} sx={{ mt: 4 }}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/app/properties')}
                  disabled={createPropertyMutation.isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={createPropertyMutation.isLoading}
                  sx={{ minWidth: 120 }}
                >
                  {createPropertyMutation.isLoading ? (
                    <LoadingSpinner size={20} />
                  ) : (
                    'Create Property'
                  )}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default SimpleCreatePropertyPage;



