import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Avatar,
  Alert,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  People,
  Business,
  Edit,
  Search,
  FilterList,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { usersAPI, organizationsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const GlobalUserManagementPage = () => {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOrganization, setFilterOrganization] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');

  if (!hasRole('super_admin')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Access Denied</Typography>
          <Typography>Only Super Administrators can manage users across all organizations.</Typography>
        </Alert>
      </Box>
    );
  }

  // Fetch all users across all organizations
  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError,
  } = useQuery('allUsers', usersAPI.getAllUsers, {
    retry: 2,
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to load users');
    },
  });

  // Fetch all organizations for filter
  const { data: orgsData } = useQuery('organizations', organizationsAPI.getAll, {
    retry: 2,
    enabled: hasRole('super_admin'),
  });

  const allUsers = usersData?.data?.users || [];
  const organizations = orgsData?.data?.organizations || [];

  // Filter users
  const filteredUsers = allUsers.filter((user) => {
    const matchesSearch =
      !searchTerm ||
      user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOrg = !filterOrganization || user.organizationId === filterOrganization;
    const matchesStatus = !filterStatus || user.status === filterStatus;

    return matchesSearch && matchesOrg && matchesStatus;
  });

  // Get roles for selected organization
  const { data: rolesData } = useQuery(
    ['organizationRoles', selectedOrgId],
    () => organizationsAPI.getRoles(selectedOrgId),
    {
      enabled: !!selectedOrgId && editDialogOpen,
      retry: 2,
    }
  );

  const availableRoles = rolesData?.data?.roles || [];

  // Update user role mutation
  const updateUserRoleMutation = useMutation(
    ({ userId, orgId, roleId }) => organizationsAPI.updateUserRole(orgId, userId, roleId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('allUsers');
        toast.success('User role updated successfully');
        setEditDialogOpen(false);
        setSelectedUser(null);
        setSelectedOrgId('');
        setSelectedRoleId('');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update user role');
      },
    }
  );

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setSelectedOrgId(user.organizationId || '');
    setSelectedRoleId(user.roleId || '');
    setEditDialogOpen(true);
  };

  const handleUpdateUser = () => {
    if (!selectedOrgId) {
      toast.error('Please select an organization');
      return;
    }
    if (!selectedRoleId) {
      toast.error('Please select a role');
      return;
    }

    updateUserRoleMutation.mutate({
      userId: selectedUser?.id,
      orgId: selectedOrgId,
      roleId: selectedRoleId,
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
      case 'pending_approval':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getInitials = (name) => {
    return name?.split(' ').map((n) => n[0]).join('').toUpperCase() || '?';
  };

  // Statistics
  const stats = {
    total: allUsers.length,
    active: allUsers.filter((u) => u.status === 'active').length,
    pending: allUsers.filter((u) => u.status === 'pending' || u.status === 'pending_approval').length,
    byOrganization: organizations.reduce((acc, org) => {
      acc[org.id] = allUsers.filter((u) => u.organizationId === org.id).length;
      return acc;
    }, {}),
  };

  if (usersLoading) {
    return <LoadingSpinner />;
  }

  if (usersError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Error Loading Users</Typography>
          <Typography>{usersError.message || 'Failed to load users'}</Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Global User Management
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage users across all organizations in the system
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Users
                  </Typography>
                  <Typography variant="h4">{stats.total}</Typography>
                </Box>
                <People sx={{ fontSize: 40, color: 'primary.main' }} />
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
                    Active Users
                  </Typography>
                  <Typography variant="h4">{stats.active}</Typography>
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
                    Pending Users
                  </Typography>
                  <Typography variant="h4">{stats.pending}</Typography>
                </Box>
                <Cancel sx={{ fontSize: 40, color: 'warning.main' }} />
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
                    Organizations
                  </Typography>
                  <Typography variant="h4">{organizations.length}</Typography>
                </Box>
                <Business sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel htmlFor="filter-org-user">Filter by Organization</InputLabel>
              <Select
                id="filter-org-user"
                value={filterOrganization}
                label="Filter by Organization"
                onChange={(e) => setFilterOrganization(e.target.value)}
              >
                <MenuItem value="">All Organizations</MenuItem>
                {organizations.map((org) => (
                  <MenuItem key={org.id} value={org.id}>
                    {org.name} ({stats.byOrganization[org.id] || 0} users)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel htmlFor="filter-status-user">Filter by Status</InputLabel>
              <Select
                id="filter-status-user"
                value={filterStatus}
                label="Filter by Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="pending_approval">Pending Approval</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Users Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Organization</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {searchTerm || filterOrganization || filterStatus
                      ? 'No users match the filters'
                      : 'No users found'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {getInitials(user.displayName)}
                      </Avatar>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {user.displayName || user.email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.organization ? (
                      <Chip
                        label={user.organization.name}
                        color="primary"
                        size="small"
                        variant="outlined"
                        icon={<Business />}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        No organization
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.role ? (
                      <Chip
                        label={user.role.displayName || user.role.name}
                        color="primary"
                        size="small"
                      />
                    ) : (
                      <Chip label="No Role" size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.status || 'pending'}
                      color={getStatusColor(user.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleEditUser(user)}
                      title="Edit User"
                    >
                      <Edit />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {selectedUser && (
              <>
                <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {getInitials(selectedUser.displayName)}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {selectedUser.displayName || selectedUser.email}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedUser.email}
                    </Typography>
                  </Box>
                </Box>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel htmlFor="assign-org">Organization</InputLabel>
                  <Select
                    id="assign-org"
                    value={selectedOrgId}
                    label="Organization"
                    onChange={(e) => {
                      setSelectedOrgId(e.target.value);
                      setSelectedRoleId(''); // Reset role when org changes
                    }}
                  >
                    <MenuItem value="">No Organization</MenuItem>
                    {organizations.map((org) => (
                      <MenuItem key={org.id} value={org.id}>
                        {org.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {selectedOrgId && (
                  <FormControl fullWidth>
                    <InputLabel htmlFor="assign-role">Role</InputLabel>
                    <Select
                      id="assign-role"
                      value={selectedRoleId}
                      label="Role"
                      onChange={(e) => setSelectedRoleId(e.target.value)}
                      disabled={!selectedOrgId}
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
                )}

                {!selectedOrgId && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Select an organization to assign a role
                  </Alert>
                )}
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleUpdateUser}
            variant="contained"
            disabled={!selectedOrgId || !selectedRoleId || updateUserRoleMutation.isLoading}
          >
            {updateUserRoleMutation.isLoading ? 'Updating...' : 'Update User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GlobalUserManagementPage;

