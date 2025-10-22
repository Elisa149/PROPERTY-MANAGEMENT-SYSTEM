import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
} from '@mui/material';
import {
  HourglassEmpty,
  Email,
  AdminPanelSettings,
  ExitToApp,
  Send,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const PendingApproval = ({ open, onClose }) => {
  const { userProfile, requestAccess, logout } = useAuth();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  const handleRequestAccess = async () => {
    setSubmitting(true);
    try {
      const success = await requestAccess(null, message); // null = default organization
      if (success) {
        setHasRequested(true);
      }
    } catch (error) {
      console.error('Request access failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  if (!open) return null;

  // Show different content based on user status
  const isAlreadyPending = userProfile?.status === 'pending_approval';
  const isRejected = userProfile?.status === 'rejected';

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      disableEscapeKeyDown
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <HourglassEmpty sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
        <Typography variant="h4" component="div" gutterBottom>
          Account Setup Required
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Welcome to PropertyPro!
        </Typography>
      </DialogTitle>

      <DialogContent>
        {/* User Information */}
        <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 3 }}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            Your Account:
          </Typography>
          <Typography variant="body2">
            <strong>Email:</strong> {userProfile?.email}
          </Typography>
          <Typography variant="body2">
            <strong>Name:</strong> {userProfile?.displayName || 'Not set'}
          </Typography>
        </Paper>

        {isRejected ? (
          // Rejected status
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="body1" gutterBottom>
              <strong>Access Request Rejected</strong>
            </Typography>
            <Typography variant="body2">
              Your previous access request was rejected. Please contact the administrator for more information
              or submit a new request with additional details.
            </Typography>
          </Alert>
        ) : isAlreadyPending || hasRequested ? (
          // Already requested or just requested
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body1" gutterBottom>
              <strong>Access Request Submitted</strong>
            </Typography>
            <Typography variant="body2">
              Your request for access has been submitted to the organization administrator. 
              You'll receive an email notification once your request is reviewed.
            </Typography>
          </Alert>
        ) : (
          // New user - needs to request access
          <Box sx={{ mb: 3 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body1" gutterBottom>
                <strong>Manual Role Assignment Required</strong>
              </Typography>
              <Typography variant="body2">
                For security purposes, an organization administrator must assign you a role 
                before you can access the system.
              </Typography>
            </Alert>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Message to Administrator (Optional)"
              placeholder="Please provide any relevant information about your role or responsibilities..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              sx={{ mb: 2 }}
            />
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Process Explanation */}
        <Typography variant="h6" gutterBottom>
          What happens next?
        </Typography>
        
        <List dense>
          <ListItem>
            <ListItemIcon>
              <Send color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="1. Submit Access Request"
              secondary="Your request is sent to the organization administrator"
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <AdminPanelSettings color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="2. Administrator Review"
              secondary="Admin reviews your request and assigns an appropriate role"
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <Email color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="3. Email Notification"  
              secondary="You'll receive an email when your role is assigned"
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <ExitToApp color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="4. Login Again"
              secondary="Logout and login again to access the system with your new role"
            />
          </ListItem>
        </List>

        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Important:</strong> Please logout and wait for email confirmation before 
            attempting to login again. This ensures your role is properly assigned.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
        <Button 
          onClick={handleLogout} 
          startIcon={<ExitToApp />}
          color="inherit"
        >
          Logout & Wait for Email
        </Button>
        
        {!isAlreadyPending && !hasRequested && !isRejected && (
          <Button 
            onClick={handleRequestAccess}
            variant="contained" 
            disabled={submitting}
            startIcon={<Send />}
          >
            {submitting ? 'Submitting...' : 'Request Access'}
          </Button>
        )}
        
        {(isAlreadyPending || hasRequested) && (
          <Button 
            onClick={handleLogout}
            variant="contained"
            startIcon={<ExitToApp />}
          >
            Logout & Check Email
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PendingApproval;

