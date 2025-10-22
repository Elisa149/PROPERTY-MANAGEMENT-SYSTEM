import React, { useState, useEffect } from 'react';
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  AttachMoney,
  Home,
  ExpandMore,
  Visibility,
} from '@mui/icons-material';
import toast from 'react-hot-toast';

// Generate simple unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

const spaceTypes = [
  { value: 'room', label: 'Room' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'shop', label: 'Shop' },
  { value: 'office', label: 'Office' },
  { value: 'storage', label: 'Storage' },
  { value: 'other', label: 'Other' },
];

const spaceStatuses = [
  { value: 'vacant', label: 'Vacant' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'maintenance', label: 'Maintenance' },
];

const SpaceManagement = ({ floors, onFloorsChange, errors = {} }) => {
  const [editingSpace, setEditingSpace] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [spaceForm, setSpaceForm] = useState({
    spaceName: '',
    spaceType: '',
    monthlyRent: 0,
    size: '',
    status: 'vacant',
    description: '',
  });

  // Add a new floor
  const addFloor = () => {
    const newFloor = {
      floorNumber: floors.length,
      floorName: `Floor ${floors.length}`,
      spaces: [],
      description: ''
    };
    onFloorsChange([...floors, newFloor]);
  };

  // Remove a floor
  const removeFloor = (floorIndex) => {
    if (floors.length > 1) {
      const updatedFloors = floors.filter((_, index) => index !== floorIndex);
      // Renumber floors
      const renumberedFloors = updatedFloors.map((floor, index) => ({
        ...floor,
        floorNumber: index,
        floorName: floor.floorName || `Floor ${index}`,
      }));
      onFloorsChange(renumberedFloors);
    }
  };

  // Update floor information
  const updateFloor = (floorIndex, field, value) => {
    const updatedFloors = floors.map((floor, index) => 
      index === floorIndex ? { ...floor, [field]: value } : floor
    );
    onFloorsChange(updatedFloors);
  };

  // Open space dialog for adding/editing
  const openSpaceDialog = (floorIndex, spaceIndex = null) => {
    if (spaceIndex !== null) {
      // Editing existing space
      const space = floors[floorIndex].spaces[spaceIndex];
      setSpaceForm({
        spaceName: space.spaceName,
        spaceType: space.spaceType,
        monthlyRent: space.monthlyRent,
        size: space.size || '',
        status: space.status,
        description: space.description || '',
      });
      setEditingSpace({ floorIndex, spaceIndex });
    } else {
      // Adding new space
      const floorNumber = floors[floorIndex].floorNumber;
      const spaceCount = floors[floorIndex].spaces.length + 1;
      setSpaceForm({
        spaceName: `${floors[floorIndex].floorName || `Floor ${floorNumber}`} - Space ${spaceCount}`,
        spaceType: '',
        monthlyRent: 0,
        size: '',
        status: 'vacant',
        description: '',
      });
      setEditingSpace({ floorIndex, spaceIndex: null });
    }
    setDialogOpen(true);
  };

  // Save space
  const saveSpace = () => {
    const { floorIndex, spaceIndex } = editingSpace;
    const spaceData = {
      spaceId: spaceIndex !== null ? floors[floorIndex].spaces[spaceIndex].spaceId : generateId(),
      ...spaceForm,
      amenities: [],
    };

    const updatedFloors = floors.map((floor, fIndex) => {
      if (fIndex === floorIndex) {
        let updatedSpaces;
        if (spaceIndex !== null) {
          // Update existing space
          updatedSpaces = floor.spaces.map((space, sIndex) => 
            sIndex === spaceIndex ? spaceData : space
          );
        } else {
          // Add new space
          updatedSpaces = [...floor.spaces, spaceData];
        }
        return { ...floor, spaces: updatedSpaces };
      }
      return floor;
    });

    onFloorsChange(updatedFloors);
    setDialogOpen(false);
    setEditingSpace(null);
    setSpaceForm({
      spaceName: '',
      spaceType: '',
      monthlyRent: 0,
      size: '',
      status: 'vacant',
      description: '',
    });
  };

  // Delete space
  const deleteSpace = (floorIndex, spaceIndex) => {
    const updatedFloors = floors.map((floor, fIndex) => {
      if (fIndex === floorIndex) {
        const updatedSpaces = floor.spaces.filter((_, sIndex) => sIndex !== spaceIndex);
        return { ...floor, spaces: updatedSpaces };
      }
      return floor;
    });
    onFloorsChange(updatedFloors);
  };

  // Calculate totals
  const calculateFloorIncome = (floor) => {
    return floor.spaces?.reduce((total, space) => total + (space.monthlyRent || 0), 0) || 0;
  };

  const calculateTotalIncome = () => {
    return floors.reduce((total, floor) => total + calculateFloorIncome(floor), 0);
  };

  const calculateTotalSpaces = () => {
    return floors.reduce((total, floor) => total + (floor.spaces?.length || 0), 0);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          🏢 Building Floors & Spaces
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Add />}
          onClick={addFloor}
        >
          Add Floor
        </Button>
      </Box>

      {floors.map((floor, floorIndex) => (
        <Accordion key={floorIndex} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pr: 2 }}>
              <Box>
                <Typography variant="h6">
                  {floor.floorName || `Floor ${floor.floorNumber}`}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {floor.spaces?.length || 0} spaces • UGX {calculateFloorIncome(floor).toLocaleString()}/month
                </Typography>
              </Box>
              {floors.length > 1 && (
                <IconButton
                  color="error"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFloor(floorIndex);
                  }}
                >
                  <Delete />
                </IconButton>
              )}
            </Box>
          </AccordionSummary>
          
          <AccordionDetails>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Floor Name"
                  value={floor.floorName || ''}
                  onChange={(e) => updateFloor(floorIndex, 'floorName', e.target.value)}
                  placeholder={`Floor ${floor.floorNumber}`}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Floor Description"
                  value={floor.description || ''}
                  onChange={(e) => updateFloor(floorIndex, 'description', e.target.value)}
                  placeholder="e.g., Ground floor commercial spaces"
                />
              </Grid>
            </Grid>

            {/* Spaces Table */}
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Rentable Spaces
              </Typography>
              <Button
                size="small"
                variant="contained"
                startIcon={<Add />}
                onClick={() => openSpaceDialog(floorIndex)}
              >
                Add Space
              </Button>
            </Box>

            {floor.spaces && floor.spaces.length > 0 ? (
              <TableContainer component={Paper} sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Space Name</strong></TableCell>
                      <TableCell><strong>Type</strong></TableCell>
                      <TableCell><strong>Size</strong></TableCell>
                      <TableCell><strong>Monthly Rent</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {floor.spaces.map((space, spaceIndex) => (
                      <TableRow key={space.spaceId}>
                        <TableCell>{space.spaceName}</TableCell>
                        <TableCell>
                          <Chip 
                            label={space.spaceType} 
                            size="small" 
                            color="primary" 
                            variant="outlined" 
                          />
                        </TableCell>
                        <TableCell>{space.size || 'N/A'}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold" color="success.main">
                            UGX {space.monthlyRent.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={space.status} 
                            size="small" 
                            color={space.status === 'occupied' ? 'success' : space.status === 'vacant' ? 'warning' : 'error'} 
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => openSpaceDialog(floorIndex, spaceIndex)}
                            color="primary"
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => deleteSpace(floorIndex, spaceIndex)}
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
              <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: 'grey.50' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  No spaces added to this floor yet
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Add />}
                  onClick={() => openSpaceDialog(floorIndex)}
                >
                  Add First Space
                </Button>
              </Paper>
            )}

            {/* Floor Summary */}
            <Paper sx={{ p: 2, backgroundColor: 'success.light' }}>
              <Typography variant="body2" fontWeight="bold">
                Floor Summary: {floor.spaces?.length || 0} spaces • Total Monthly Income: UGX {calculateFloorIncome(floor).toLocaleString()}
              </Typography>
            </Paper>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Building Total Summary */}
      <Paper sx={{ p: 3, backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
        <Typography variant="h6" gutterBottom>
          🏢 Building Summary
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography variant="body2">Total Floors</Typography>
            <Typography variant="h5" fontWeight="bold">{floors.length}</Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2">Total Spaces</Typography>
            <Typography variant="h5" fontWeight="bold">{calculateTotalSpaces()}</Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2">Total Monthly Income</Typography>
            <Typography variant="h5" fontWeight="bold">
              UGX {calculateTotalIncome().toLocaleString()}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Space Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingSpace?.spaceIndex !== null ? 'Edit Space' : 'Add New Space'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Space Name"
                value={spaceForm.spaceName}
                onChange={(e) => setSpaceForm({ ...spaceForm, spaceName: e.target.value })}
                placeholder="e.g., Room A1, Shop 1, Unit 201"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Space Type</InputLabel>
                <Select
                  value={spaceForm.spaceType}
                  onChange={(e) => setSpaceForm({ ...spaceForm, spaceType: e.target.value })}
                  label="Space Type"
                >
                  {spaceTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={spaceForm.status}
                  onChange={(e) => setSpaceForm({ ...spaceForm, status: e.target.value })}
                  label="Status"
                >
                  {spaceStatuses.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Monthly Rent"
                value={spaceForm.monthlyRent}
                onChange={(e) => setSpaceForm({ ...spaceForm, monthlyRent: Number(e.target.value) })}
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

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Size/Specifications"
                value={spaceForm.size}
                onChange={(e) => setSpaceForm({ ...spaceForm, size: e.target.value })}
                placeholder="e.g., 2 bedroom, 50 sqm"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Space Description"
                value={spaceForm.description}
                onChange={(e) => setSpaceForm({ ...spaceForm, description: e.target.value })}
                placeholder="Additional details about this space..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={saveSpace} 
            variant="contained"
            disabled={!spaceForm.spaceName || !spaceForm.spaceType}
          >
            {editingSpace?.spaceIndex !== null ? 'Update Space' : 'Add Space'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SpaceManagement;
