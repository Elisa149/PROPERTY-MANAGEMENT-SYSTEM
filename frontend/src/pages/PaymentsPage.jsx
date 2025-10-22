import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

const PaymentsPage = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Payment Tracking
      </Typography>
      <Alert severity="info">
        Payment tracking functionality (Implementation in progress)
      </Alert>
    </Box>
  );
};

export default PaymentsPage;
