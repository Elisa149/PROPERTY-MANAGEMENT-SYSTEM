import React, { useState, useEffect } from 'react';
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
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Tabs,
  Tab,
  Avatar,
  Grid,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Person,
  Email,
  Schedule,
  Refresh,
  AdminPanelSettings,
  People,
  Phone,
  CalendarToday,
  Edit,
  Block,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { authAPI, usersAPI } from '../services/api';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';

const UserManagementPage = () => {
  const { userRole, organizationId } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [responseDialog, setResponseDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [availableRoles, setAvailableRoles] = useState([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [editRoleDialog, setEditRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRoleId, setNewRoleId] = useState('');
  const queryClient = useQueryClient();

  // Fetch all users
  const { 
    data: usersData, 
    isLoading: usersLoading,
    error: usersError,
    refetch: refetchUsers
  } = useQuery(
    'organizationUsers',
    usersAPI.getAll,
    {
      enabled: !!organizationId,
    }
  );

  // Fetch access requests
  const { data: requestsData, isLoading: requestsLoading, error: requestsError, refetch } = useQuery(
    'accessRequests',
    authAPI.getAccessRequests,
    {
      enabled: !!organizationId,
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Fetch available roles for the organization
  useEffect(() => {
    const fetchRoles = async () => {
      if (organizationId) {
        try {
          const response = await authAPI.getOrgRoles(organizationId);
          setAvailableRoles(response.roles || []);
        } catch (error) {
          console.error('Failed to fetch roles:', error);
        }
      }
    };
    fetchRoles();
  }, [organizationId]);

  // Respond to access request mutation
  const respondMutation = useMutation(
    ({ requestId, action, roleId, message }) =>
      authAPI.respondToRequest(requestId, { action, roleId, message }),
    {
      onSuccess: (data) => {
        toast.success(data.message);
        queryClient.invalidateQueries('accessRequests');
        handleCloseDialog();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to respond to request');
      },
    }
  );

  // Update user role mutation
  const updateRoleMutation = useMutation(
    ({ userId, roleId }) => usersAPI.updateRole(userId, { roleId }),
    {
      onSuccess: () => {
        toast.success('User role updated successfully');
        queryClient.invalidateQueries('organizationUsers');
        setEditRoleDialog(false);
        setSelectedUser(null);
        setNewRoleId('');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update user role');
      },
    }
  );

  const requests = requestsData?.requests || [];
  const users = usersData?.data?.users || [];
  
  // Debug logging
  console.log('👥 Users loaded:', users.length);
  console.log('📋 Access requests loaded:', requests.length);

  const handleApprove = (request) => {
    setSelectedRequest(request);
    setSelectedRole('');
    setResponseMessage('');
    setResponseDialog(true);
  };

  const handleReject = (request) => {
    setSelectedRequest(request);
    setSelectedRole('');
    setResponseMessage('');
    setResponseDialog(true);
  };

  const handleCloseDialog = () => {
    setResponseDialog(false);
    setSelectedRequest(null);
    setSelectedRole('');
    setResponseMessage('');
  };

  const handleSubmitResponse = (action) => {
    if (action === 'approve' && !selectedRole) {
      toast.error('Please select a role for approval');
      return;
    }

    respondMutation.mutate({
      requestId: selectedRequest.id,
      action,
      roleId: action === 'approve' ? selectedRole : undefined,
      message: responseMessage,
    });
  };

  const handleEditRole = (user) => {
    setSelectedUser(user);
    setNewRoleId(user.roleId || '');
    setEditRoleDialog(true);
  };

  const handleUpdateRole = () => {
    if (!newRoleId) {
      toast.error('Please select a role');
      return;
    }

    updateRoleMutation.mutate({
      userId: selectedUser.id,
      roleId: newRoleId,
    });
  };

  // Check if user has permission to manage users
  if (!userRole || !['org_admin', 'super_admin'].includes(userRole.name)) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Access Denied</Typography>
          <Typography>Only organization administrators can manage user requests.</Typography>
        </Alert>
      </Box>
    );
  }

  if (usersLoading || requestsLoading) {
    return <LoadingSpinner message="Loading user management data..." />;
  }

  if (usersError || requestsError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load user data. Please try again.</Alert>
      </Box>
    );
  }
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'pending_approval': return 'info';
      case 'rejected': return 'error';
      case 'inactive': return 'default';
      default: return 'default';
    }
  };
  
  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            User Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Review and respond to access requests from new users
          </Typography>
        </Box>
        <Tooltip title="Refresh requests">
          <IconButton onClick={() => refetch()} color="primary">
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <People color="primary" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{users.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Users
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Schedule color="warning" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{requests.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Requests
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <AdminPanelSettings color="success" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{users.filter(u => u.status === 'active').length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Users
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(e, newValue) => setCurrentTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <People />
                All Users
                <Chip size="small" label={users.length} />
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Schedule />
                Pending Requests
                <Chip size="small" label={requests.length} color="warning" />
              </Box>
            }
          />
        </Tabs>
      </Paper>

      {/* Tab 1: All Users Table */}
      {currentTab === 0 && (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell><strong>User</strong></TableCell>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell><strong>Phone</strong></TableCell>
                  <TableCell><strong>Role</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Last Login</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        No users found in organization
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {getInitials(user.displayName)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {user.displayName || 'Unnamed User'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              UID: {user.uid?.substring(0, 8)}...
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Email fontSize="small" color="action" />
                          <Typography variant="body2">{user.email}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {user.phone ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Phone fontSize="small" color="action" />
                            <Typography variant="body2">{user.phone}</Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.role ? (
                          <Chip
                            label={user.role.displayName || user.role.name}
                            color="primary"
                            size="small"
                            variant="outlined"
                          />
                        ) : (
                          <Chip label="No Role" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.status}
                          color={getStatusColor(user.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CalendarToday fontSize="small" color="action" />
                          <Typography variant="body2">
                            {user.lastLoginAt ? format(new Date(user.lastLoginAt), 'MMM dd, yyyy') : 'Never'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Edit Role">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleEditRole(user)}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Deactivate User (Coming Soon)">
                            <IconButton size="small" color="error" disabled>
                              <Block />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Tab 2: Access Requests Table */}
      {currentTab === 1 && (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Requested</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No pending access requests
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      New user requests will appear here
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow key={request.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person color="action" />
                        <Typography variant="body2">
                          {request.userName || 'Unknown User'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Email color="action" fontSize="small" />
                        <Typography variant="body2">{request.userEmail}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200 }}>
                        {request.message || 'No message provided'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {request.requestedAt ? format(new Date(request.requestedAt), 'MMM dd, yyyy HH:mm') : 'Unknown'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={request.status}
                        color="warning"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          startIcon={<CheckCircle />}
                          color="success"
                          onClick={() => handleApprove(request)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          startIcon={<Cancel />}
                          color="error"
                          onClick={() => handleReject(request)}
                        >
                          Reject
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        </Paper>
      )}

      {/* Response Dialog */}
      <Dialog open={responseDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedRequest && (
            <>Respond to Access Request from {selectedRequest.userName}</>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                User: {selectedRequest.userEmail}
              </Typography>
              
              {selectedRequest.message && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>User Message:</strong> {selectedRequest.message}
                  </Typography>
                </Alert>
              )}

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Role</InputLabel>
                <Select
                  value={selectedRole}
                  label="Select Role"
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  {availableRoles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.displayName || role.name} - {role.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Response Message (Optional)"
                placeholder="Add a message for the user..."
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={() => handleSubmitResponse('reject')}
            color="error"
            disabled={respondMutation.isLoading}
          >
            Reject
          </Button>
          <Button
            onClick={() => handleSubmitResponse('approve')}
            color="success"
            variant="contained"
            disabled={respondMutation.isLoading || !selectedRole}
          >
            {respondMutation.isLoading ? 'Processing...' : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Role Dialog */}
      <Dialog 
        open={editRoleDialog} 
        onClose={() => {
          setEditRoleDialog(false);
          setSelectedUser(null);
          setNewRoleId('');
        }} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          Edit User Role
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, mt: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              User Details
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                {selectedUser ? getInitials(selectedUser.displayName) : ''}
              </Avatar>
              <Box>
                <Typography variant="body1" fontWeight={600}>
                  {selectedUser?.displayName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedUser?.email}
                </Typography>
              </Box>
            </Box>
            
            {selectedUser?.role && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Current Role: <Chip label={selectedUser.role.displayName || selectedUser.role.name} size="small" color="info" />
                </Typography>
              </Box>
            )}
          </Box>

          <FormControl fullWidth>
            <InputLabel>Select New Role</InputLabel>
            <Select
              value={newRoleId}
              label="Select New Role"
              onChange={(e) => setNewRoleId(e.target.value)}
              renderValue={(selected) => {
                const role = availableRoles.find(r => r.id === selected);
                return role ? (role.displayName || role.name) : selected;
              }}
            >
              {availableRoles.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  <Box>
                    <Typography variant="body1">{role.displayName || role.name}</Typography>
                    {role.description && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {role.description}
                      </Typography>
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Alert severity="info" sx={{ mt: 2 }}>
            Changing a user's role will immediately update their permissions.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setEditRoleDialog(false);
              setSelectedUser(null);
              setNewRoleId('');
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateRole}
            variant="contained"
            disabled={updateRoleMutation.isLoading || !newRoleId}
          >
            {updateRoleMutation.isLoading ? 'Updating...' : 'Update Role'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagementPage;

