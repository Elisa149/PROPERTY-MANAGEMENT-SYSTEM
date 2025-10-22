import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const RoleAssignment = ({ open, onClose, onSuccess }) => {
  const { needsRoleAssignment, assignDefaultRole, userRole, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleAssignRole = async () => {
    setLoading(true);
    try {
      const success = await assignDefaultRole();
      if (success && onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Role assignment failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!open || !needsRoleAssignment) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Welcome to PropertyPro!</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" gutterBottom>
            We need to assign you a role to get started.
          </Typography>
          
          {userProfile && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Your Information:
              </Typography>
              <Typography variant="body2">
                <strong>Email:</strong> {userProfile.email}
              </Typography>
              <Typography variant="body2">
                <strong>Name:</strong> {userProfile.displayName || 'Not set'}
              </Typography>
            </Box>
          )}

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Auto-Assignment Rules:</strong>
            </Typography>
            <Typography variant="body2" component="div">
              • Property owners → Organization Administrator
              <br />
              • New users → Financial Viewer (read-only access)
            </Typography>
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleAssignRole} 
          variant="contained" 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {loading ? 'Assigning...' : 'Assign Role'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RoleAssignment;

