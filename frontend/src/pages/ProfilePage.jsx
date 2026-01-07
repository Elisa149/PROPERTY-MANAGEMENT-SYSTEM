import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  Divider,
  Alert,
  Avatar,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Person,
  Email,
  Phone,
  Business,
  Edit,
  Save,
  Cancel,
  Security,
  AccountCircle,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ProfilePage = () => {
  const { user, userProfile, userRole, organizationId, fetchUserProfile } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch current profile data
  const { data: profileData, isLoading } = useQuery(
    'userProfile',
    authAPI.getProfile,
    {
      refetchOnWindowFocus: false,
    }
  );

  const profile = profileData?.data?.profile || userProfile || {};

  // Form state
  const [formData, setFormData] = useState({
    displayName: profile?.displayName || user?.displayName || '',
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    phone: profile?.phone || profile?.phoneNumber || '',
    address: profile?.address || '',
  });

  // Update form data when profile loads
  React.useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile?.displayName || user?.displayName || '',
        firstName: profile?.firstName || '',
        lastName: profile?.lastName || '',
        phone: profile?.phone || profile?.phoneNumber || '',
        address: profile?.address || '',
      });
    }
  }, [profile, user]);

  // Update profile mutation - use auth API which works for all users
  const updateProfileMutation = useMutation(
    (data) => {
      // Auth API accepts: displayName, phoneNumber, address
      return authAPI.updateProfile({
        displayName: data.displayName,
        phoneNumber: data.phone,
        address: data.address,
      });
    },
    {
      onSuccess: async () => {
        toast.success('Profile updated successfully!');
        setIsEditing(false);
        // Refresh profile data
        await fetchUserProfile();
        queryClient.invalidateQueries('userProfile');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update profile');
      },
    }
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    setLoading(true);
    updateProfileMutation.mutate(formData);
    setLoading(false);
  };

  const handleCancel = () => {
    // Reset form data to original profile values
    setFormData({
      displayName: profile?.displayName || user?.displayName || '',
      firstName: profile?.firstName || '',
      lastName: profile?.lastName || '',
      phone: profile?.phone || profile?.phoneNumber || '',
      address: profile?.address || '',
    });
    setIsEditing(false);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
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

  if (isLoading) {
    return <LoadingSpinner message="Loading profile..." />;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountCircle color="primary" />
          My Profile
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your account information and preferences
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Profile Information Card */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Profile Information</Typography>
                {!isEditing && (
                  <Button
                    variant="outlined"
                    startIcon={<Edit />}
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profile
                  </Button>
                )}
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                {/* Avatar and Display Name */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar
                      sx={{
                        width: 80,
                        height: 80,
                        bgcolor: 'primary.main',
                        fontSize: '2rem',
                      }}
                    >
                      {getInitials(formData.displayName || user?.email)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">
                        {formData.displayName || user?.email || 'User'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user?.email}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Display Name */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    id="displayName"
                    label="Display Name"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    InputProps={{
                      startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                </Grid>

                {/* Email (Read-only) */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    id="email"
                    label="Email"
                    value={user?.email || ''}
                    disabled
                    InputProps={{
                      startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                </Grid>

                {/* First Name */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    id="firstName"
                    label="First Name"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </Grid>

                {/* Last Name */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    id="lastName"
                    label="Last Name"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </Grid>

                {/* Phone */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    id="phone"
                    label="Phone Number"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    InputProps={{
                      startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                </Grid>

                {/* Address */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    id="address"
                    label="Address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    multiline
                    rows={3}
                  />
                </Grid>

                {/* Action Buttons */}
                {isEditing && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                      <Button
                        variant="outlined"
                        startIcon={<Cancel />}
                        onClick={handleCancel}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                        onClick={handleSave}
                        disabled={loading}
                      >
                        Save Changes
                      </Button>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Account Information Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Security color="primary" />
                Account Information
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Role */}
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Role
                  </Typography>
                  <Chip
                    label={userRole?.displayName || userRole?.name || 'No Role Assigned'}
                    color={userRole?.name === 'super_admin' ? 'error' : 'primary'}
                    size="small"
                  />
                </Box>

                 {/* Organization */}
                 {organizationId && (
                   <Box>
                     <Typography variant="body2" color="text.secondary" gutterBottom>
                       Organization
                     </Typography>
                     <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                         <Business sx={{ color: 'text.secondary', fontSize: 20 }} />
                         <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                           {profile?.organizationName || 'Organization'}
                         </Typography>
                       </Box>
                       <Typography 
                         variant="caption" 
                         color="text.secondary" 
                         sx={{ 
                           ml: 4, 
                           fontFamily: 'monospace',
                           fontSize: '0.75rem',
                           opacity: 0.7
                         }}
                       >
                         ID: {organizationId}
                       </Typography>
                     </Box>
                   </Box>
                 )}

                {/* Status */}
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Account Status
                  </Typography>
                  <Chip
                    label={profile?.status || 'active'}
                    color={getStatusColor(profile?.status)}
                    size="small"
                  />
                </Box>

                {/* Member Since */}
                {profile?.createdAt && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Member Since
                    </Typography>
                    <Typography variant="body1">
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                )}

                {/* Last Login */}
                {profile?.lastLoginAt && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Last Login
                    </Typography>
                    <Typography variant="body1">
                      {new Date(profile.lastLoginAt).toLocaleString()}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Pending Approval Alert */}
              {profile?.status === 'pending_approval' && (
                <Alert severity="warning" sx={{ mt: 3 }}>
                  <Typography variant="body2">
                    Your account is pending approval. Please wait for an administrator to approve your access request.
                  </Typography>
                </Alert>
              )}

              {/* Rejected Status Alert */}
              {profile?.status === 'rejected' && (
                <Alert severity="error" sx={{ mt: 3 }}>
                  <Typography variant="body2">
                    Your access request has been rejected. Please contact an administrator for assistance.
                  </Typography>
                </Alert>
              )}

              {/* No Organization Alert */}
              {!organizationId && profile?.status !== 'pending_approval' && (
                <Alert severity="info" sx={{ mt: 3 }}>
                  <Typography variant="body2">
                    You are not yet assigned to an organization. Please request access to continue.
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProfilePage;
