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
  Divider,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Radio,
  RadioGroup,
  FormControlLabel,
  Paper,
} from '@mui/material';
import {
  Edit,
  MeetingRoom,
  AspectRatio,
  AttachMoney,
  Description,
  CheckCircle,
  Cancel,
  Build,
  EventAvailable,
  Save,
  Close,
  Info,
  ArrowBack,
  KeyboardArrowRight,
  ToggleOn,
} from '@mui/icons-material';
import toast from 'react-hot-toast';

const SpaceEditDialog = ({ open, onClose, space, propertyType, onUpdate }) => {
  const [step, setStep] = useState('select'); // 'select' or 'edit'
  const [selectedEditType, setSelectedEditType] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Available edit options
  const editOptions = [
    {
      id: 'name',
      label: 'Edit Space Name',
      icon: <MeetingRoom />,
      description: 'Change the name or identifier of this space',
      color: 'primary',
    },
    {
      id: 'rent',
      label: 'Edit Monthly Rent',
      icon: <AttachMoney />,
      description: 'Update the monthly rent amount',
      color: 'success',
    },
    {
      id: 'size',
      label: 'Edit Size',
      icon: <AspectRatio />,
      description: 'Modify the size or area measurements',
      color: 'info',
    },
    {
      id: 'status',
      label: 'Change Status',
      icon: <ToggleOn />,
      description: 'Update availability status',
      color: 'warning',
    },
    {
      id: 'description',
      label: 'Edit Description',
      icon: <Description />,
      description: 'Add or modify description and notes',
      color: 'secondary',
    },
  ];

  const statusOptions = [
    { value: 'vacant', label: 'Vacant', color: 'success', icon: <CheckCircle />, description: 'Available for rent' },
    { value: 'occupied', label: 'Occupied', color: 'error', icon: <Cancel />, description: 'Currently rented' },
    { value: 'maintenance', label: 'Maintenance', color: 'warning', icon: <Build />, description: 'Under repair' },
    { value: 'reserved', label: 'Reserved', color: 'info', icon: <EventAvailable />, description: 'Reserved for future tenant' },
  ];

  useEffect(() => {
    if (space && open) {
      // Reset when dialog opens
      setStep('select');
      setSelectedEditType(null);
      setFormData({});
      setErrors({});
    }
  }, [space, open]);

  const handleSelectEditType = (editType) => {
    setSelectedEditType(editType);
    
    // Initialize form data based on selected edit type
    const initialData = {};
    
    switch (editType) {
      case 'name':
        initialData.spaceName = space?.spaceName || space?.squatterName || space?.assignedArea || '';
        break;
      case 'rent':
        initialData.monthlyRent = space?.monthlyRent || space?.monthlyPayment || 0;
        break;
      case 'size':
        initialData.size = space?.size || space?.areaSize || '';
        break;
      case 'status':
        initialData.status = space?.status || 'vacant';
        break;
      case 'description':
        initialData.description = space?.description || '';
        break;
    }
    
    setFormData(initialData);
    setStep('edit');
  };

  const handleBack = () => {
    setStep('select');
    setSelectedEditType(null);
    setFormData({});
    setErrors({});
  };

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    switch (selectedEditType) {
      case 'name':
        if (!formData.spaceName || !formData.spaceName.trim()) {
          newErrors.spaceName = 'Name is required';
        }
        break;
      case 'rent':
        if (!formData.monthlyRent || formData.monthlyRent < 0) {
          newErrors.monthlyRent = 'Valid rent amount is required';
        }
        break;
      case 'size':
        // Size is optional, but if provided should be valid
        if (formData.size && formData.size.length > 100) {
          newErrors.size = 'Size description is too long';
        }
        break;
      case 'status':
        if (!formData.status) {
          newErrors.status = 'Status is required';
        }
        break;
      case 'description':
        // Description is optional
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    try {
      // Prepare minimal update data - only the field being changed
      const updateData = {};
      
      switch (selectedEditType) {
        case 'name':
          if (propertyType === 'land') {
            updateData.squatterName = formData.spaceName.trim();
            updateData.assignedArea = formData.spaceName.trim();
          } else {
            updateData.spaceName = formData.spaceName.trim();
          }
          break;
        
        case 'rent':
          if (propertyType === 'land') {
            updateData.monthlyPayment = parseFloat(formData.monthlyRent) || 0;
          } else {
            updateData.monthlyRent = parseFloat(formData.monthlyRent) || 0;
          }
          break;
        
        case 'size':
          if (propertyType === 'land') {
            updateData.areaSize = formData.size ? String(formData.size).trim() : '';
          } else {
            updateData.size = formData.size ? String(formData.size).trim() : '';
          }
          break;
        
        case 'status':
          updateData.status = formData.status;
          break;
        
        case 'description':
          updateData.description = formData.description ? formData.description.trim() : '';
          break;
      }

      console.log('📝 Submitting space update:', updateData);
      
      await onUpdate(updateData);
      toast.success('Space updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error updating space:', error);
      if (error.response?.status === 403) {
        toast.error('Permission denied. You cannot edit this space.');
      } else {
        toast.error(error.response?.data?.error || 'Failed to update space');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderSelectStep = () => (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight="600" gutterBottom>
          Current Space: {space?.spaceName || space?.squatterName || space?.assignedArea || 'N/A'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Select what you want to edit below
        </Typography>
      </Alert>

      <List sx={{ width: '100%' }}>
        {editOptions.map((option) => (
          <Paper key={option.id} sx={{ mb: 2 }} elevation={1}>
            <ListItemButton
              onClick={() => handleSelectEditType(option.id)}
              sx={{
                py: 2,
                px: 3,
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: `${option.color}.50`,
                  borderColor: `${option.color}.main`,
                },
              }}
            >
              <ListItemIcon>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: `${option.color}.50`,
                    color: `${option.color}.main`,
                  }}
                >
                  {option.icon}
                </Box>
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="h6" component="div">
                    {option.label}
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" color="text.secondary">
                    {option.description}
                  </Typography>
                }
              />
              <KeyboardArrowRight color="action" />
            </ListItemButton>
          </Paper>
        ))}
      </List>
    </Box>
  );

  const renderEditStep = () => {
    const currentOption = editOptions.find(opt => opt.id === selectedEditType);
    
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={handleBack}
            size="small"
            variant="outlined"
          >
            Back
          </Button>
          <Box>
            <Typography variant="h6" component="div">
              {currentOption?.label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {currentOption?.description}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Name Edit */}
        {selectedEditType === 'name' && (
          <TextField
            fullWidth
            autoFocus
            label={propertyType === 'land' ? 'Area Name *' : 'Space Name *'}
            value={formData.spaceName || ''}
            onChange={handleChange('spaceName')}
            error={Boolean(errors.spaceName)}
            helperText={errors.spaceName || 'e.g., Room 101, Plot A, Shop 5'}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MeetingRoom />
                </InputAdornment>
              ),
            }}
          />
        )}

        {/* Rent Edit */}
        {selectedEditType === 'rent' && (
          <TextField
            fullWidth
            autoFocus
            type="number"
            label={propertyType === 'land' ? 'Monthly Payment (UGX) *' : 'Monthly Rent (UGX) *'}
            value={formData.monthlyRent || ''}
            onChange={handleChange('monthlyRent')}
            error={Boolean(errors.monthlyRent)}
            helperText={errors.monthlyRent || 'Enter the monthly rent amount'}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AttachMoney />
                  UGX
                </InputAdornment>
              ),
              inputProps: { min: 0, step: 1000 }
            }}
          />
        )}

        {/* Size Edit */}
        {selectedEditType === 'size' && (
          <TextField
            fullWidth
            autoFocus
            label={propertyType === 'land' ? 'Area Size' : 'Size'}
            value={formData.size || ''}
            onChange={handleChange('size')}
            error={Boolean(errors.size)}
            helperText={errors.size || 'e.g., 50x100 ft, 2 acres, 100 sqm, 2 bedroom'}
            placeholder="Enter size or dimensions"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AspectRatio />
                </InputAdornment>
              ),
            }}
          />
        )}

        {/* Status Edit */}
        {selectedEditType === 'status' && (
          <FormControl component="fieldset" fullWidth>
            <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
              Select New Status
            </Typography>
            <RadioGroup
              value={formData.status || 'vacant'}
              onChange={handleChange('status')}
            >
              {statusOptions.map((status) => (
                <Paper
                  key={status.value}
                  elevation={formData.status === status.value ? 3 : 0}
                  sx={{
                    mb: 2,
                    border: 2,
                    borderColor: formData.status === status.value ? `${status.color}.main` : 'divider',
                    borderRadius: 2,
                  }}
                >
                  <FormControlLabel
                    value={status.value}
                    control={<Radio color={status.color} />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
                        <Box sx={{ color: `${status.color}.main` }}>
                          {status.icon}
                        </Box>
                        <Box>
                          <Typography variant="body1" fontWeight="600">
                            {status.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {status.description}
                          </Typography>
                        </Box>
                      </Box>
                    }
                    sx={{ width: '100%', m: 0, px: 2 }}
                  />
                </Paper>
              ))}
            </RadioGroup>
          </FormControl>
        )}

        {/* Description Edit */}
        {selectedEditType === 'description' && (
          <TextField
            fullWidth
            autoFocus
            multiline
            rows={6}
            label="Description"
            value={formData.description || ''}
            onChange={handleChange('description')}
            error={Boolean(errors.description)}
            helperText={errors.description || 'Add any additional details, special features, or notes about this space'}
            placeholder="Enter description..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 2 }}>
                  <Description />
                </InputAdornment>
              ),
            }}
          />
        )}
      </Box>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: step === 'select' ? '500px' : '350px' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Edit color="primary" />
            <div>
              <Typography variant="h6">
                {step === 'select' ? 'Edit Space Details' : 'Update Information'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {propertyType === 'land' ? 'Land Area' : 'Building Space'}
              </Typography>
            </div>
          </Box>
          {step === 'select' && (
            <Chip
              label={space?.status || 'N/A'}
              color={space?.status === 'vacant' ? 'success' : space?.status === 'occupied' ? 'error' : 'warning'}
              size="small"
            />
          )}
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {step === 'select' ? renderSelectStep() : renderEditStep()}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={onClose}
          disabled={loading}
          startIcon={<Close />}
          color="inherit"
        >
          Cancel
        </Button>
        {step === 'edit' && (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            startIcon={<Save />}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SpaceEditDialog;
