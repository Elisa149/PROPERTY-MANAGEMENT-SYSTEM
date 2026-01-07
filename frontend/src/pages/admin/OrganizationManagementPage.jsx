import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  Divider,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Business,
  People,
  Settings,
  CheckCircle,
  Cancel,
  Visibility,
  PersonRemove,
  PersonAdd,
  Home,
  AttachMoney,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { organizationsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const OrganizationManagementPage = () => {
  const { userRole, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [editUserRoleDialogOpen, setEditUserRoleDialogOpen] = useState(false);
  const [removeUserDialogOpen, setRemoveUserDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    settings: {
      timezone: 'Africa/Kampala',
      currency: 'UGX',
      dateFormat: 'DD/MM/YYYY',
      allowGoogleAuth: true,
      allowEmailAuth: true,
    },
    contact: {
      email: '',
      phone: '',
      address: '',
    },
  });

  // Check if user is super admin
  if (!hasRole('super_admin')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Access Denied</Typography>
          <Typography>Only Super Administrators can manage organizations.</Typography>
        </Alert>
      </Box>
    );
  }

  // Fetch all organizations
  const {
    data: orgsData,
    isLoading,
    error,
  } = useQuery('organizations', organizationsAPI.getAll, {
    retry: 2,
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to load organizations');
    },
  });

  const organizations = orgsData?.data?.organizations || [];

  // Fetch users for selected organization
  const {
    data: usersData,
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = useQuery(
    ['organizationUsers', selectedOrg?.id],
    () => organizationsAPI.getUsers(selectedOrg?.id),
    {
      enabled: !!selectedOrg?.id && usersDialogOpen,
      retry: 2,
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to load users');
      },
    }
  );

  // Fetch roles for selected organization
  const { data: rolesData } = useQuery(
    ['organizationRoles', selectedOrg?.id],
    () => organizationsAPI.getRoles(selectedOrg?.id),
    {
      enabled: !!selectedOrg?.id && (usersDialogOpen || editUserRoleDialogOpen),
      retry: 2,
    }
  );

  const organizationUsers = usersData?.data?.users || [];
  const availableRoles = rolesData?.data?.roles || [];

  // Create organization mutation
  const createMutation = useMutation(organizationsAPI.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('organizations');
      toast.success('Organization created successfully');
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create organization');
    },
  });

  // Update organization mutation
  const updateMutation = useMutation(
    (data) => organizationsAPI.update(selectedOrg?.id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('organizations');
        toast.success('Organization updated successfully');
        setEditDialogOpen(false);
        setSelectedOrg(null);
        resetForm();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update organization');
      },
    }
  );

  // Delete organization mutation
  const deleteMutation = useMutation(
    () => organizationsAPI.delete(selectedOrg?.id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('organizations');
        toast.success('Organization deleted successfully');
        setDeleteDialogOpen(false);
        setSelectedOrg(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to delete organization');
      },
    }
  );

  // Update user role mutation
  const updateUserRoleMutation = useMutation(
    ({ userId, roleId }) => organizationsAPI.updateUserRole(selectedOrg?.id, userId, roleId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['organizationUsers', selectedOrg?.id]);
        toast.success('User role updated successfully');
        setEditUserRoleDialogOpen(false);
        setSelectedUser(null);
        setSelectedRoleId('');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update user role');
      },
    }
  );

  // Remove user from organization mutation
  const removeUserMutation = useMutation(
    () => organizationsAPI.removeUser(selectedOrg?.id, selectedUser?.id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['organizationUsers', selectedOrg?.id]);
        toast.success('User removed from organization successfully');
        setRemoveUserDialogOpen(false);
        setSelectedUser(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to remove user');
      },
    }
  );

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      status: 'active',
      settings: {
        timezone: 'Africa/Kampala',
        currency: 'UGX',
        dateFormat: 'DD/MM/YYYY',
        allowGoogleAuth: true,
        allowEmailAuth: true,
      },
      contact: {
        email: '',
        phone: '',
        address: '',
      },
    });
  };

  const handleCreate = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const handleEdit = (org) => {
    setSelectedOrg(org);
    setFormData({
      name: org.name || '',
      description: org.description || '',
      status: org.status || 'active',
      settings: {
        timezone: org.settings?.timezone || 'Africa/Kampala',
        currency: org.settings?.currency || 'UGX',
        dateFormat: org.settings?.dateFormat || 'DD/MM/YYYY',
        allowGoogleAuth: org.settings?.allowGoogleAuth ?? true,
        allowEmailAuth: org.settings?.allowEmailAuth ?? true,
      },
      contact: {
        email: org.contact?.email || '',
        phone: org.contact?.phone || '',
        address: org.contact?.address || '',
      },
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (org) => {
    setSelectedOrg(org);
    setDeleteDialogOpen(true);
  };

  const handleView = (org) => {
    setSelectedOrg(org);
    setViewDialogOpen(true);
  };

  const handleViewUsers = (org) => {
    setSelectedOrg(org);
    setUsersDialogOpen(true);
  };

  const handleEditUserRole = (user) => {
    setSelectedUser(user);
    setSelectedRoleId(user.roleId || '');
    setEditUserRoleDialogOpen(true);
  };

  const handleRemoveUser = (user) => {
    setSelectedUser(user);
    setRemoveUserDialogOpen(true);
  };

  const handleSubmitUserRoleUpdate = () => {
    if (!selectedRoleId) {
      toast.error('Please select a role');
      return;
    }
    updateUserRoleMutation.mutate({
      userId: selectedUser?.id,
      roleId: selectedRoleId,
    });
  };

  const handleConfirmRemoveUser = () => {
    removeUserMutation.mutate();
  };

  const handleSubmitCreate = () => {
    createMutation.mutate(formData);
  };

  const handleSubmitEdit = () => {
    updateMutation.mutate(formData);
  };

  const handleConfirmDelete = () => {
    deleteMutation.mutate();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'suspended':
        return 'error';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Error Loading Organizations</Typography>
          <Typography>{error.message || 'Failed to load organizations'}</Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            Organization Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create, edit, and manage all organizations in the system
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreate}
          sx={{ minWidth: 150 }}
        >
          Create Organization
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Organizations
                  </Typography>
                  <Typography variant="h4">{organizations.length}</Typography>
                </Box>
                <Business sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Active Organizations
                  </Typography>
                  <Typography variant="h4">
                    {organizations.filter((o) => o.status === 'active').length}
                  </Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Rent Records
                  </Typography>
                  <Typography variant="h4">
                    {organizations.reduce((sum, o) => sum + (o.rentCount || 0), 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {organizations.reduce((sum, o) => sum + (o.activeRentCount || 0), 0)} active
                  </Typography>
                </Box>
                <Home sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Monthly Rent
                  </Typography>
                  <Typography variant="h4">
                    {organizations.length > 0
                      ? `${organizations[0].settings?.currency || 'UGX'} ${organizations
                          .reduce((sum, o) => sum + (o.totalMonthlyRent || 0), 0)
                          .toLocaleString()}`
                      : 'UGX 0'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Across all organizations
                  </Typography>
                </Box>
                <AttachMoney sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Organizations Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Users</TableCell>
              <TableCell>Rent Activity</TableCell>
              <TableCell>Currency</TableCell>
              <TableCell>Contact Email</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {organizations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No organizations found</Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={handleCreate}
                    sx={{ mt: 2 }}
                  >
                    Create First Organization
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              organizations.map((org) => (
                <TableRow key={org.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {org.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>
                      {org.description || 'No description'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={org.status || 'active'}
                      color={getStatusColor(org.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: 0.5,
                        cursor: 'pointer',
                        '&:hover': {
                          opacity: 0.8,
                        }
                      }}
                      onClick={() => handleViewUsers(org)}
                      title="Click to view users"
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <People sx={{ fontSize: 16, color: 'primary.main' }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          {org.userCount || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          total
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, ml: 3 }}>
                        <Chip
                          label={`${org.activeUserCount || 0} active`}
                          color="success"
                          size="small"
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                        {org.pendingUserCount > 0 && (
                          <Chip
                            label={`${org.pendingUserCount} pending`}
                            color="warning"
                            size="small"
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {org.rentCount > 0 ? (
                        <>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Home sx={{ fontSize: 16, color: 'primary.main' }} />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {org.activeRentCount || 0} active
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              / {org.rentCount} total
                            </Typography>
                          </Box>
                          {org.totalMonthlyRent > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 3 }}>
                              <AttachMoney sx={{ fontSize: 14, color: 'success.main' }} />
                              <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                                {org.settings?.currency || 'UGX'} {org.totalMonthlyRent.toLocaleString()}/mo
                              </Typography>
                            </Box>
                          )}
                          {org.terminatedRentCount > 0 && (
                            <Chip
                              label={`${org.terminatedRentCount} terminated`}
                              color="default"
                              size="small"
                              sx={{ height: 20, fontSize: '0.65rem', ml: 3, width: 'fit-content' }}
                            />
                          )}
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          No rent records
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{org.settings?.currency || 'UGX'}</TableCell>
                  <TableCell>{org.contact?.email || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleViewUsers(org)}
                      title="View Users"
                    >
                      <People />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleView(org)}
                      title="View Details"
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleEdit(org)}
                      title="Edit"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(org)}
                      title="Delete"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Organization</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Organization Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
              </Select>
            </FormControl>
            <Divider sx={{ my: 2 }}>Settings</Divider>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Timezone"
                  value={formData.settings.timezone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: { ...formData.settings, timezone: e.target.value },
                    })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Currency"
                  value={formData.settings.currency}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: { ...formData.settings, currency: e.target.value },
                    })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Date Format"
                  value={formData.settings.dateFormat}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: { ...formData.settings, dateFormat: e.target.value },
                    })
                  }
                />
              </Grid>
            </Grid>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.settings.allowGoogleAuth}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: { ...formData.settings, allowGoogleAuth: e.target.checked },
                    })
                  }
                />
              }
              label="Allow Google Authentication"
              sx={{ mt: 2 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.settings.allowEmailAuth}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: { ...formData.settings, allowEmailAuth: e.target.checked },
                    })
                  }
                />
              }
              label="Allow Email Authentication"
              sx={{ mt: 1 }}
            />
            <Divider sx={{ my: 2 }}>Contact Information</Divider>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.contact.email}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contact: { ...formData.contact, email: e.target.value },
                })
              }
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Phone"
              value={formData.contact.phone}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contact: { ...formData.contact, phone: e.target.value },
                })
              }
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Address"
              value={formData.contact.address}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contact: { ...formData.contact, address: e.target.value },
                })
              }
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmitCreate}
            variant="contained"
            disabled={!formData.name || createMutation.isLoading}
          >
            {createMutation.isLoading ? <CircularProgress size={24} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Organization</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Organization Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
              </Select>
            </FormControl>
            <Divider sx={{ my: 2 }}>Settings</Divider>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Timezone"
                  value={formData.settings.timezone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: { ...formData.settings, timezone: e.target.value },
                    })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Currency"
                  value={formData.settings.currency}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: { ...formData.settings, currency: e.target.value },
                    })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Date Format"
                  value={formData.settings.dateFormat}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: { ...formData.settings, dateFormat: e.target.value },
                    })
                  }
                />
              </Grid>
            </Grid>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.settings.allowGoogleAuth}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: { ...formData.settings, allowGoogleAuth: e.target.checked },
                    })
                  }
                />
              }
              label="Allow Google Authentication"
              sx={{ mt: 2 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.settings.allowEmailAuth}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      settings: { ...formData.settings, allowEmailAuth: e.target.checked },
                    })
                  }
                />
              }
              label="Allow Email Authentication"
              sx={{ mt: 1 }}
            />
            <Divider sx={{ my: 2 }}>Contact Information</Divider>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.contact.email}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contact: { ...formData.contact, email: e.target.value },
                })
              }
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Phone"
              value={formData.contact.phone}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contact: { ...formData.contact, phone: e.target.value },
                })
              }
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Address"
              value={formData.contact.address}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contact: { ...formData.contact, address: e.target.value },
                })
              }
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmitEdit}
            variant="contained"
            disabled={!formData.name || updateMutation.isLoading}
          >
            {updateMutation.isLoading ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Organization</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. All associated data will be permanently deleted.
          </Alert>
          <Typography>
            Are you sure you want to delete <strong>{selectedOrg?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            disabled={deleteMutation.isLoading}
          >
            {deleteMutation.isLoading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Organization Details</DialogTitle>
        <DialogContent>
          {selectedOrg && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedOrg.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {selectedOrg.description || 'No description'}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Typography>
                    <Chip
                      label={selectedOrg.status || 'active'}
                      color={getStatusColor(selectedOrg.status)}
                      size="small"
                    />
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Currency
                  </Typography>
                  <Typography>{selectedOrg.settings?.currency || 'UGX'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Timezone
                  </Typography>
                  <Typography>{selectedOrg.settings?.timezone || 'UTC'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Date Format
                  </Typography>
                  <Typography>{selectedOrg.settings?.dateFormat || 'DD/MM/YYYY'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Contact Email
                  </Typography>
                  <Typography>{selectedOrg.contact?.email || '-'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Contact Phone
                  </Typography>
                  <Typography>{selectedOrg.contact?.phone || '-'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Address
                  </Typography>
                  <Typography>{selectedOrg.contact?.address || '-'}</Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Users Management Dialog */}
      <Dialog open={usersDialogOpen} onClose={() => setUsersDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Users in {selectedOrg?.name}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Manage users and their roles in this organization
          </Typography>
        </DialogTitle>
        <DialogContent>
          {usersLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : organizationUsers.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <People sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography color="text.secondary">No users found in this organization</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {organizationUsers.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2">{user.displayName || user.email}</Typography>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.role?.displayName || 'No Role'}
                          color={user.role ? 'primary' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.status || 'pending'}
                          color={
                            user.status === 'active'
                              ? 'success'
                              : user.status === 'pending' || user.status === 'pending_approval'
                              ? 'warning'
                              : 'default'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEditUserRole(user)}
                          title="Edit Role"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveUser(user)}
                          title="Remove from Organization"
                        >
                          <PersonRemove />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUsersDialogOpen(false)}>Close</Button>
          <Button
            variant="outlined"
            onClick={() => refetchUsers()}
            disabled={usersLoading}
            startIcon={<People />}
          >
            Refresh
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Role Dialog */}
      <Dialog open={editUserRoleDialogOpen} onClose={() => setEditUserRoleDialogOpen(false)}>
        <DialogTitle>Edit User Role</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, minWidth: 400 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              User: <strong>{selectedUser?.displayName || selectedUser?.email}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Email: {selectedUser?.email}
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={selectedRoleId}
                label="Role"
                onChange={(e) => setSelectedRoleId(e.target.value)}
              >
                {availableRoles
                  .filter((role) => role.name !== 'super_admin')
                  .map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.displayName} ({role.name})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUserRoleDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmitUserRoleUpdate}
            variant="contained"
            disabled={!selectedRoleId || updateUserRoleMutation.isLoading}
          >
            {updateUserRoleMutation.isLoading ? <CircularProgress size={24} /> : 'Update Role'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove User Dialog */}
      <Dialog open={removeUserDialogOpen} onClose={() => setRemoveUserDialogOpen(false)}>
        <DialogTitle>Remove User from Organization</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will remove the user from the organization. They will need to be re-invited to join again.
          </Alert>
          <Typography>
            Are you sure you want to remove <strong>{selectedUser?.displayName || selectedUser?.email}</strong> from{' '}
            <strong>{selectedOrg?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveUserDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmRemoveUser}
            variant="contained"
            color="error"
            disabled={removeUserMutation.isLoading}
          >
            {removeUserMutation.isLoading ? <CircularProgress size={24} /> : 'Remove User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrganizationManagementPage;

