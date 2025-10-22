import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  IconButton,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  AttachMoney,
  Person,
  Phone,
  LocationOn,
} from '@mui/icons-material';
import toast from 'react-hot-toast';

// Generate simple unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

const squatterStatuses = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'disputed', label: 'Disputed' },
];

const landUseTypes = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'agricultural', label: 'Agricultural' },
  { value: 'mixed', label: 'Mixed Use' },
  { value: 'other', label: 'Other' },
];

const SquatterManagement = ({ landDetails, onLandDetailsChange, errors = {} }) => {
  const [editingSquatter, setEditingSquatter] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [squatterForm, setSquatterForm] = useState({
    squatterName: '',
    squatterPhone: '',
    assignedArea: '',
    areaSize: '',
    monthlyPayment: 0,
    agreementDate: '',
    status: 'active',
    description: '',
  });

  // Open squatter dialog for adding/editing
  const openSquatterDialog = (squatterIndex = null) => {
    if (squatterIndex !== null) {
      // Editing existing squatter
      const squatter = landDetails.squatters[squatterIndex];
      setSquatterForm({
        squatterName: squatter.squatterName,
        squatterPhone: squatter.squatterPhone || '',
        assignedArea: squatter.assignedArea,
        areaSize: squatter.areaSize || '',
        monthlyPayment: squatter.monthlyPayment,
        agreementDate: squatter.agreementDate?.substring(0, 10) || '', // Format date for input
        status: squatter.status,
        description: squatter.description || '',
      });
      setEditingSquatter({ squatterIndex });
    } else {
      // Adding new squatter
      const squatterCount = landDetails.squatters?.length || 0;
      setSquatterForm({
        squatterName: '',
        squatterPhone: '',
        assignedArea: `Area ${squatterCount + 1}`,
        areaSize: '',
        monthlyPayment: 0,
        agreementDate: new Date().toISOString().substring(0, 10),
        status: 'active',
        description: '',
      });
      setEditingSquatter({ squatterIndex: null });
    }
    setDialogOpen(true);
  };

  // Save squatter
  const saveSquatter = () => {
    const { squatterIndex } = editingSquatter;
    const squatterData = {
      squatterId: squatterIndex !== null ? landDetails.squatters[squatterIndex].squatterId : generateId(),
      ...squatterForm,
    };

    let updatedSquatters;
    if (squatterIndex !== null) {
      // Update existing squatter
      updatedSquatters = landDetails.squatters.map((squatter, index) => 
        index === squatterIndex ? squatterData : squatter
      );
    } else {
      // Add new squatter
      updatedSquatters = [...(landDetails.squatters || []), squatterData];
    }

    const updatedLandDetails = {
      ...landDetails,
      squatters: updatedSquatters,
      totalSquatters: updatedSquatters.length,
    };

    onLandDetailsChange(updatedLandDetails);
    setDialogOpen(false);
    setEditingSquatter(null);
    setSquatterForm({
      squatterName: '',
      squatterPhone: '',
      assignedArea: '',
      areaSize: '',
      monthlyPayment: 0,
      agreementDate: '',
      status: 'active',
      description: '',
    });
  };

  // Delete squatter
  const deleteSquatter = (squatterIndex) => {
    const updatedSquatters = landDetails.squatters.filter((_, index) => index !== squatterIndex);
    const updatedLandDetails = {
      ...landDetails,
      squatters: updatedSquatters,
      totalSquatters: updatedSquatters.length,
    };
    onLandDetailsChange(updatedLandDetails);
    toast.success('Squatter removed successfully');
  };

  // Calculate totals
  const calculateTotalPayments = () => {
    return landDetails.squatters?.reduce((total, squatter) => total + (squatter.monthlyPayment || 0), 0) || 0;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'warning';
      case 'disputed':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      {/* Land Use Type */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Land Use Type</InputLabel>
            <Select
              value={landDetails.landUse || ''}
              onChange={(e) => onLandDetailsChange({ ...landDetails, landUse: e.target.value })}
              label="Land Use Type"
            >
              {landUseTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Total Land Area (Optional)"
            value={landDetails.totalArea || ''}
            onChange={(e) => onLandDetailsChange({ ...landDetails, totalArea: e.target.value })}
            placeholder="e.g., 5 acres, 200x300 feet"
          />
        </Grid>
      </Grid>

      {/* Squatters Management */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" color="primary">
            👥 Land Squatters Management
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<Add />}
            onClick={() => openSquatterDialog()}
          >
            Add Squatter
          </Button>
        </Box>

        {landDetails.squatters && landDetails.squatters.length > 0 ? (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Squatter Name</strong></TableCell>
                  <TableCell><strong>Phone</strong></TableCell>
                  <TableCell><strong>Assigned Area</strong></TableCell>
                  <TableCell><strong>Area Size</strong></TableCell>
                  <TableCell><strong>Monthly Payment</strong></TableCell>
                  <TableCell><strong>Agreement Date</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {landDetails.squatters.map((squatter, index) => (
                  <TableRow key={squatter.squatterId}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person fontSize="small" color="primary" />
                        {squatter.squatterName}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {squatter.squatterPhone ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Phone fontSize="small" color="action" />
                          {squatter.squatterPhone}
                        </Box>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOn fontSize="small" color="primary" />
                        {squatter.assignedArea}
                      </Box>
                    </TableCell>
                    <TableCell>{squatter.areaSize || 'N/A'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold" color="success.main">
                        UGX {squatter.monthlyPayment.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {squatter.agreementDate ? new Date(squatter.agreementDate).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={squatter.status} 
                        size="small" 
                        color={getStatusColor(squatter.status)} 
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => openSquatterDialog(index)}
                        color="primary"
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => deleteSquatter(index)}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: 'grey.50' }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              No Squatters Registered
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Add squatters to track land usage and payments
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => openSquatterDialog()}
            >
              Add First Squatter
            </Button>
          </Paper>
        )}
      </Box>

      {/* Land Summary */}
      <Paper sx={{ p: 3, backgroundColor: 'success.light' }}>
        <Typography variant="h6" gutterBottom>
          🌱 Land Summary
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography variant="body2">Total Squatters</Typography>
            <Typography variant="h5" fontWeight="bold">
              {landDetails.squatters?.length || 0}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2">Land Use</Typography>
            <Typography variant="h6" fontWeight="bold">
              {landDetails.landUse?.charAt(0).toUpperCase() + landDetails.landUse?.slice(1) || 'Not Set'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2">Total Monthly Payments</Typography>
            <Typography variant="h5" fontWeight="bold">
              UGX {calculateTotalPayments().toLocaleString()}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Squatter Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingSquatter?.squatterIndex !== null ? 'Edit Squatter' : 'Add New Squatter'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Squatter Name"
                value={squatterForm.squatterName}
                onChange={(e) => setSquatterForm({ ...squatterForm, squatterName: e.target.value })}
                placeholder="e.g., John Doe"
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
                label="Phone Number (Optional)"
                value={squatterForm.squatterPhone}
                onChange={(e) => setSquatterForm({ ...squatterForm, squatterPhone: e.target.value })}
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
                label="Assigned Area/Section"
                value={squatterForm.assignedArea}
                onChange={(e) => setSquatterForm({ ...squatterForm, assignedArea: e.target.value })}
                placeholder="e.g., Section A, East Corner, Plot 1-5"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationOn />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Area Size (Optional)"
                value={squatterForm.areaSize}
                onChange={(e) => setSquatterForm({ ...squatterForm, areaSize: e.target.value })}
                placeholder="e.g., 50x100 feet, 0.5 acres"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Monthly Payment"
                value={squatterForm.monthlyPayment}
                onChange={(e) => setSquatterForm({ ...squatterForm, monthlyPayment: Number(e.target.value) })}
                inputProps={{ min: 0 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoney />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="date"
                label="Agreement Date"
                value={squatterForm.agreementDate}
                onChange={(e) => setSquatterForm({ ...squatterForm, agreementDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={squatterForm.status}
                  onChange={(e) => setSquatterForm({ ...squatterForm, status: e.target.value })}
                  label="Status"
                >
                  {squatterStatuses.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Additional Notes"
                value={squatterForm.description}
                onChange={(e) => setSquatterForm({ ...squatterForm, description: e.target.value })}
                placeholder="Additional details about this squatter arrangement..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={saveSquatter} 
            variant="contained"
            disabled={!squatterForm.squatterName || !squatterForm.assignedArea}
          >
            {editingSquatter?.squatterIndex !== null ? 'Update Squatter' : 'Add Squatter'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SquatterManagement;



