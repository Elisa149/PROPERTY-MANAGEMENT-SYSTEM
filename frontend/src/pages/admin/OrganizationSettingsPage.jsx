import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material';
import {
  Settings,
  Business,
  People,
  Security,
  Notifications,
  Edit,
  Save,
  Cancel,
  Add,
  Delete,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { organizationsAPI, usersAPI, propertiesAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const OrganizationSettingsPage = () => {
  const queryClient = useQueryClient();
  const { userRole, organizationId } = useAuth();
  const [orgSettings, setOrgSettings] = useState({
    name: '',
    description: '',
    settings: {
      timezone: 'UTC',
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
    status: 'active',
  });
  const [editing, setEditing] = useState(false);
  const [inviteDialog, setInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('');

  // Fetch organization data
  const { 
    data: orgData, 
    isLoading: orgLoading,
    error: orgError 
  } = useQuery(
    ['organization', organizationId],
    () => organizationsAPI.getById(organizationId),
    { enabled: !!organizationId }
  );

  // Fetch users for stats
  const { data: usersData } = useQuery(
    'organizationUsers',
    usersAPI.getAll,
    { enabled: !!organizationId }
  );

  // Fetch properties for stats
  const { data: propertiesData } = useQuery(
    'properties',
    propertiesAPI.getAll,
    { enabled: !!organizationId }
  );

  // Fetch available roles
  const { data: rolesData } = useQuery(
    ['organizationRoles', organizationId],
    () => organizationsAPI.getRoles(organizationId),
    { enabled: !!organizationId }
  );

  // Update organization mutation
  const updateOrgMutation = useMutation(
    (data) => organizationsAPI.update(organizationId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['organization', organizationId]);
        toast.success('Organization settings updated successfully');
        setEditing(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update settings');
      },
    }
  );

  // Load organization data when fetched
  useEffect(() => {
    if (orgData?.data?.organization) {
      setOrgSettings(orgData.data.organization);
    }
  }, [orgData]);

  const organization = orgData?.data?.organization || {};
  const users = usersData?.data?.users || [];
  const properties = propertiesData?.data?.properties || [];
  const availableRoles = rolesData?.roles || [];

  const orgStats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    pendingUsers: users.filter(u => u.status === 'pending' || u.status === 'pending_approval').length,
    totalProperties: properties.length,
    totalRevenue: 'UGX 0', // Would calculate from payments
  };

  const handleSaveSettings = () => {
    updateOrgMutation.mutate(orgSettings);
  };

  const handleInviteUser = async () => {
    if (!inviteEmail || !inviteRole) {
      toast.error('Please fill in all fields');
      return;
    }

    toast.info('User invitation feature coming soon. For now, use User Management to approve access requests.');
    setInviteDialog(false);
    setInviteEmail('');
    setInviteRole('');
  };

  if (!userRole || !['org_admin', 'super_admin'].includes(userRole.name)) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Access Denied</Typography>
          <Typography>Only organization administrators can access settings.</Typography>
        </Alert>
      </Box>
    );
  }

  if (orgLoading) {
    return <LoadingSpinner message="Loading organization settings..." />;
  }

  if (orgError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load organization settings. Please try again.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Organization Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage organization configuration, users, and security settings
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Organization Overview */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Business color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Organization Overview</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                    <Typography variant="h4" color="primary">
                      {orgStats.totalUsers}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Users
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                    <Typography variant="h4" color="success.main">
                      {orgStats.totalProperties}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Properties Managed
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Basic Settings */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Settings color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Basic Settings</Typography>
                </Box>
                {!editing ? (
                  <Button startIcon={<Edit />} onClick={() => setEditing(true)}>
                    Edit Settings
                  </Button>
                ) : (
                  <Box>
                    <Button 
                      startIcon={<Cancel />} 
                      onClick={() => setEditing(false)}
                      sx={{ mr: 1 }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      startIcon={<Save />} 
                      variant="contained"
                      onClick={handleSaveSettings}
                      disabled={updateOrgMutation.isLoading}
                    >
                      {updateOrgMutation.isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </Box>
                )}
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Organization Name"
                    value={orgSettings.name || ''}
                    onChange={(e) => setOrgSettings({...orgSettings, name: e.target.value})}
                    disabled={!editing}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Description"
                    value={orgSettings.description || ''}
                    onChange={(e) => setOrgSettings({...orgSettings, description: e.target.value})}
                    disabled={!editing}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth disabled={!editing}>
                    <InputLabel>Timezone</InputLabel>
                    <Select
                      value={orgSettings.settings?.timezone || 'UTC'}
                      label="Timezone"
                      onChange={(e) => setOrgSettings({
                        ...orgSettings, 
                        settings: { ...orgSettings.settings, timezone: e.target.value }
                      })}
                    >
                      <MenuItem value="UTC">UTC</MenuItem>
                      <MenuItem value="Africa/Kampala">East Africa Time</MenuItem>
                      <MenuItem value="America/New_York">Eastern Time</MenuItem>
                      <MenuItem value="Europe/London">GMT</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth disabled={!editing}>
                    <InputLabel>Currency</InputLabel>
                    <Select
                      value={orgSettings.settings?.currency || 'UGX'}
                      label="Currency"
                      onChange={(e) => setOrgSettings({
                        ...orgSettings,
                        settings: { ...orgSettings.settings, currency: e.target.value }
                      })}
                    >
                      <MenuItem value="UGX">UGX (Ugandan Shilling)</MenuItem>
                      <MenuItem value="USD">USD (US Dollar)</MenuItem>
                      <MenuItem value="EUR">EUR (Euro)</MenuItem>
                      <MenuItem value="GBP">GBP (British Pound)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Contact Email"
                    value={orgSettings.contact?.email || ''}
                    onChange={(e) => setOrgSettings({
                      ...orgSettings,
                      contact: { ...orgSettings.contact, email: e.target.value }
                    })}
                    disabled={!editing}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Contact Phone"
                    value={orgSettings.contact?.phone || ''}
                    onChange={(e) => setOrgSettings({
                      ...orgSettings,
                      contact: { ...orgSettings.contact, phone: e.target.value }
                    })}
                    disabled={!editing}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Security Settings */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Security color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Security</Typography>
              </Box>
              
              <List dense>
                <ListItem>
                  <ListItemText primary="Google Authentication" />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={orgSettings.settings?.allowGoogleAuth || false}
                      onChange={(e) => setOrgSettings({
                        ...orgSettings,
                        settings: { ...orgSettings.settings, allowGoogleAuth: e.target.checked }
                      })}
                      disabled={!editing}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem>
                  <ListItemText primary="Email Authentication" />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={orgSettings.settings?.allowEmailAuth || false}
                      onChange={(e) => setOrgSettings({
                        ...orgSettings,
                        settings: { ...orgSettings.settings, allowEmailAuth: e.target.checked }
                      })}
                      disabled={!editing}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem>
                  <ListItemText 
                    primary="Manual Approval Required" 
                    secondary="Admin must approve new users"
                  />
                  <ListItemSecondaryAction>
                    <Chip 
                      label="Enabled" 
                      color="info" 
                      size="small" 
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem>
                  <ListItemText 
                    primary="Organization Status" 
                  />
                  <ListItemSecondaryAction>
                    <Chip 
                      label={orgSettings.status || 'active'} 
                      color={orgSettings.status === 'active' ? 'success' : 'default'}
                      size="small" 
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* User Management Quick Actions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <People color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">User Management</Typography>
                </Box>
                <Button 
                  startIcon={<Add />} 
                  variant="contained"
                  onClick={() => setInviteDialog(true)}
                >
                  Invite User
                </Button>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h3" color="primary">
                      {orgStats.activeUsers}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Users
                    </Typography>
                    <Chip label="Online" color="success" size="small" sx={{ mt: 1 }} />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h3" color="warning.main">
                      {orgStats.pendingUsers}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending Approval
                    </Typography>
                    <Chip label="Needs Review" color="warning" size="small" sx={{ mt: 1 }} />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h3" color="text.secondary">
                      {availableRoles.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Available Roles
                    </Typography>
                    <Chip label="Configured" color="info" size="small" sx={{ mt: 1 }} />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Invite User Dialog */}
      <Dialog open={inviteDialog} onClose={() => setInviteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite New User</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Email Address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth>
              <InputLabel>Assign Role</InputLabel>
              <Select
                value={inviteRole}
                label="Assign Role"
                onChange={(e) => setInviteRole(e.target.value)}
              >
                {availableRoles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name} - {role.description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialog(false)}>Cancel</Button>
          <Button onClick={handleInviteUser} variant="contained">
            Send Invitation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrganizationSettingsPage;

