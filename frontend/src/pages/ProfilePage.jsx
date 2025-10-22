import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

const ProfilePage = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Profile Settings
      </Typography>
      <Alert severity="info">
        Profile settings functionality (Implementation in progress)
      </Alert>
    </Box>
  );
};

export default ProfilePage;
