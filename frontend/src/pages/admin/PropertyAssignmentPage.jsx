import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  TextField,
  Autocomplete,
} from '@mui/material';
import {
  Assignment,
  Home,
  Person,
  Edit,
  Delete,
  Add,
  SupervisorAccount,
  Build,
  Visibility,
  Apartment,
  Terrain,
  LocationOn,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { propertiesAPI, usersAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const PropertyAssignmentPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  const [assignmentDialog, setAssignmentDialog] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [assignmentType, setAssignmentType] = useState('manager');

  // Fetch properties
  const { 
    data: propertiesData, 
    isLoading: propertiesLoading,
    error: propertiesError 
  } = useQuery('properties', propertiesAPI.getAll);

  // Fetch users
  const { 
    data: usersData, 
    isLoading: usersLoading,
    error: usersError 
  } = useQuery('organizationUsers', usersAPI.getAll);

  // Update property assignment mutation
  const updateAssignmentMutation = useMutation(
    ({ propertyId, data }) => propertiesAPI.update(propertyId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('properties');
        toast.success('Property assignment updated successfully');
        setAssignmentDialog(false);
        resetForm();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update assignment');
      },
    }
  );

  if (propertiesLoading || usersLoading) {
    return <LoadingSpinner message="Loading property assignments..." />;
  }

  if (propertiesError || usersError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load data. Please try again.</Alert>
      </Box>
    );
  }

  const properties = propertiesData?.data?.properties || [];
  const allUsers = usersData?.data?.users || [];
  
  // Filter to only property managers (active users)
  const propertyManagers = allUsers.filter(u => 
    u.role?.name === 'property_manager' && u.status === 'active'
  );

  // Debug logging
  console.log('🏢 Properties:', properties.length);
  console.log('👥 All users:', allUsers.length);
  console.log('👔 Property managers:', propertyManagers.length);

  const resetForm = () => {
    setSelectedProperty('');
    setSelectedUser('');
    setAssignmentType('manager');
  };

  const handleCreateAssignment = async () => {
    if (!selectedProperty || !selectedUser) {
      toast.error('Please select both property and user');
      return;
    }

    try {
      const property = properties.find(p => p.id === selectedProperty);
      const user = allUsers.find(u => u.id === selectedUser);
      
      if (!property) {
        toast.error('Property not found');
        return;
      }

      let updateData = { ...property };
      
      if (assignmentType === 'manager') {
        // Add user to assignedManagers array
        const currentManagers = property.assignedManagers || [];
        if (!currentManagers.includes(selectedUser)) {
          updateData.assignedManagers = [...currentManagers, selectedUser];
        } else {
          toast.info('User is already assigned as manager');
          return;
        }
      } else if (assignmentType === 'caretaker') {
        // Set caretakerId
        updateData.caretakerId = selectedUser;
      }
      
      updateAssignmentMutation.mutate({
        propertyId: selectedProperty,
        data: updateData
      });
      
    } catch (error) {
      console.error('Assignment error:', error);
      toast.error('Failed to create assignment');
    }
  };

  const handleRemoveManager = async (propertyId, userId) => {
    try {
      const property = properties.find(p => p.id === propertyId);
      if (!property) return;

      const updatedManagers = (property.assignedManagers || []).filter(id => id !== userId);
      
      updateAssignmentMutation.mutate({
        propertyId,
        data: { ...property, assignedManagers: updatedManagers }
      });
    } catch (error) {
      toast.error('Failed to remove manager');
    }
  };

  const handleRemoveCaretaker = async (propertyId) => {
    try {
      const property = properties.find(p => p.id === propertyId);
      if (!property) return;

      updateAssignmentMutation.mutate({
        propertyId,
        data: { ...property, caretakerId: '' }
      });
    } catch (error) {
      toast.error('Failed to remove caretaker');
    }
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  const getUserById = (userId) => {
    return allUsers.find(u => u.id === userId || u.uid === userId);
  };

  const getSpaceCount = (property) => {
    if (property.type === 'building') {
      return property.buildingDetails?.floors?.reduce(
        (sum, floor) => sum + (floor.spaces?.length || 0),
        0
      ) || 0;
    } else if (property.type === 'land') {
      return property.landDetails?.totalSquatters || 0;
    }
    return 0;
  };

  if (!userRole || !['org_admin', 'super_admin'].includes(userRole.name)) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Access Denied</Typography>
          <Typography>Only organization administrators can manage property assignments.</Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Property Assignments
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Assign properties to managers and caretakers for efficient management
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setAssignmentDialog(true)}
        >
          New Assignment
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Home color="primary" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Total Properties
                </Typography>
              </Box>
              <Typography variant="h3" color="primary">
                {properties.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Managed properties
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <SupervisorAccount color="success" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Assigned
                </Typography>
              </Box>
              <Typography variant="h3" color="success.main">
                {properties.filter(p => (p.assignedManagers?.length > 0) || p.caretakerId).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Properties with staff
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Person color="info" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Active Managers
                </Typography>
              </Box>
              <Typography variant="h3" color="info.main">
                {propertyManagers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Available for assignment
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Assignment color="warning" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Unassigned
                </Typography>
              </Box>
              <Typography variant="h3" color="warning.main">
                {properties.filter(p => !p.assignedManagers?.length && !p.caretakerId).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Need assignment
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Current Assignments Table */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Current Property Assignments
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Property</TableCell>
                      <TableCell>Property Manager</TableCell>
                      <TableCell>Caretaker</TableCell>
                      <TableCell>Assigned Date</TableCell>
                      <TableCell>Performance</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {properties.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <Typography variant="body1" color="text.secondary">
                            No properties found. Create properties first.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      properties.map((property) => {
                        const managers = (property.assignedManagers || []).map(id => getUserById(id)).filter(Boolean);
                        const caretaker = property.caretakerId ? getUserById(property.caretakerId) : null;
                        
                        return (
                          <TableRow key={property.id}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {property.type === 'building' ? 
                                  <Apartment color="primary" /> : 
                                  <Terrain color="success" />
                                }
                                <Box>
                                  <Typography variant="body2" fontWeight="bold">
                                    {property.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {property.location?.village}, {property.location?.district}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              {managers.length > 0 ? (
                                <Box>
                                  {managers.map((manager, idx) => (
                                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                      <Avatar sx={{ width: 28, height: 28, mr: 1, bgcolor: 'primary.main' }}>
                                        {getInitials(manager.displayName)}
                                      </Avatar>
                                      <Typography variant="body2">{manager.displayName}</Typography>
                                      <IconButton 
                                        size="small" 
                                        onClick={() => handleRemoveManager(property.id, manager.id)}
                                        sx={{ ml: 1 }}
                                      >
                                        <Delete fontSize="small" />
                                      </IconButton>
                                    </Box>
                                  ))}
                                </Box>
                              ) : (
                                <Chip label="Not Assigned" variant="outlined" size="small" />
                              )}
                            </TableCell>
                            <TableCell>
                              {caretaker ? (
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Avatar sx={{ width: 28, height: 28, mr: 1, bgcolor: 'success.main' }}>
                                    {getInitials(caretaker.displayName)}
                                  </Avatar>
                                  <Typography variant="body2">{caretaker.displayName}</Typography>
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handleRemoveCaretaker(property.id)}
                                    sx={{ ml: 1 }}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </Box>
                              ) : (
                                <Chip label="Not Assigned" variant="outlined" size="small" />
                              )}
                            </TableCell>
                            <TableCell>
                              {property.updatedAt ? format(new Date(property.updatedAt), 'MMM dd, yyyy') : '-'}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={`${getSpaceCount(property)} spaces`}
                                color="primary"
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton 
                                size="small" 
                                color="primary"
                                onClick={() => {
                                  setSelectedProperty(property.id);
                                  setAssignmentDialog(true);
                                }}
                              >
                                <Edit />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                color="info"
                                onClick={() => navigate(`/app/properties/${property.id}`)}
                              >
                                <Visibility />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Available Staff */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Available Property Managers
              </Typography>
              <List>
                {propertyManagers.length === 0 ? (
                  <ListItem>
                    <ListItemText
                      primary="No property managers available"
                      secondary="Assign Property Manager role to users first"
                    />
                  </ListItem>
                ) : (
                  propertyManagers.map((user) => (
                    <ListItem key={user.id}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {getInitials(user.displayName)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={user.displayName}
                        secondary={`${user.role?.displayName} • ${user.email}`}
                      />
                      <ListItemSecondaryAction>
                        <Chip
                          label={user.role?.displayName}
                          color="primary"
                          size="small"
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Unassigned Properties */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Unassigned Properties
              </Typography>
              <List>
                {properties.filter(p => !p.assignedManagers?.length && !p.caretakerId).length === 0 ? (
                  <ListItem>
                    <ListItemText
                      primary="All properties have been assigned"
                      secondary="Great job managing your team!"
                    />
                  </ListItem>
                ) : (
                  properties
                    .filter(property => !property.assignedManagers?.length && !property.caretakerId)
                    .map((property) => (
                      <ListItem key={property.id}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'warning.main' }}>
                            {property.type === 'building' ? <Apartment /> : <Terrain />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={property.name}
                          secondary={`${property.type} • ${getSpaceCount(property)} spaces • ${property.location?.village}`}
                        />
                        <ListItemSecondaryAction>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Assignment />}
                            onClick={() => {
                              setSelectedProperty(property.id);
                              setAssignmentDialog(true);
                            }}
                          >
                            Assign
                          </Button>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Assignment Dialog */}
      <Dialog 
        open={assignmentDialog} 
        onClose={() => {
          setAssignmentDialog(false);
          resetForm();
        }} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Assign Staff to Property</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Property</InputLabel>
              <Select
                value={selectedProperty}
                label="Select Property"
                onChange={(e) => setSelectedProperty(e.target.value)}
              >
                {properties.map((property) => (
                  <MenuItem key={property.id} value={property.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {property.type === 'building' ? 
                        <Apartment fontSize="small" /> : 
                        <Terrain fontSize="small" />
                      }
                      {property.name} ({property.type} - {getSpaceCount(property)} spaces)
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Assignment Type</InputLabel>
              <Select
                value={assignmentType}
                label="Assignment Type"
                onChange={(e) => setAssignmentType(e.target.value)}
              >
                <MenuItem value="manager">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SupervisorAccount fontSize="small" />
                    Property Manager (Can manage multiple properties)
                  </Box>
                </MenuItem>
                <MenuItem value="caretaker">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Build fontSize="small" />
                    Caretaker (On-site staff for this property)
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Select User</InputLabel>
              <Select
                value={selectedUser}
                label="Select User"
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                {propertyManagers.length === 0 ? (
                  <MenuItem disabled>No property managers available</MenuItem>
                ) : (
                  propertyManagers.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                          {getInitials(user.displayName)}
                        </Avatar>
                        {user.displayName} • {user.email}
                      </Box>
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            
            {propertyManagers.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                No users with Property Manager role found. Go to User Management and assign the Property Manager role to users first.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAssignmentDialog(false);
            resetForm();
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateAssignment} 
            variant="contained"
            disabled={!selectedProperty || !selectedUser || propertyManagers.length === 0}
          >
            Assign {assignmentType === 'manager' ? 'Manager' : 'Caretaker'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PropertyAssignmentPage;

