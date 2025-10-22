import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  Alert,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Home,
  Apartment,
  Terrain,
  LocationOn,
  ArrowForward,
} from '@mui/icons-material';

import { propertiesAPI } from '../services/api';

const PropertySelectorDialog = ({ open, onClose, title = 'Select Property for Tenant Assignment' }) => {
  const navigate = useNavigate();
  const [selectedProperty, setSelectedProperty] = useState(null);

  // Fetch properties
  const { data: propertiesData, isLoading, error } = useQuery(
    'properties',
    propertiesAPI.getAll,
    {
      enabled: open, // Only fetch when dialog is open
    }
  );

  const properties = propertiesData?.data?.properties || [];

  const handlePropertySelect = (property) => {
    setSelectedProperty(property);
  };

  const handleConfirm = () => {
    if (selectedProperty) {
      navigate(`/app/properties/${selectedProperty.id}/spaces`);
      onClose();
      setSelectedProperty(null);
    }
  };

  const handleClose = () => {
    setSelectedProperty(null);
    onClose();
  };

  const getPropertyIcon = (property) => {
    if (property.type === 'building') {
      return <Apartment color="primary" />;
    }
    return <Terrain color="success" />;
  };

  const getPropertyStats = (property) => {
    if (property.type === 'building') {
      const totalSpaces = property.buildingDetails?.floors?.reduce(
        (sum, floor) => sum + (floor.spaces?.length || 0),
        0
      ) || 0;
      return `${totalSpaces} spaces`;
    } else if (property.type === 'land') {
      const totalSquatters = property.landDetails?.totalSquatters || 0;
      return `${totalSquatters} squatters`;
    }
    return '';
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Home color="primary" />
          <Typography variant="h6">{title}</Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load properties. Please try again.
          </Alert>
        )}

        {!isLoading && !error && properties.length === 0 && (
          <Alert severity="info">
            <Typography variant="body2" gutterBottom>
              No properties found. Please create a property first before assigning tenants.
            </Typography>
            <Button
              variant="contained"
              size="small"
              sx={{ mt: 2 }}
              onClick={() => {
                navigate('/app/properties/new');
                handleClose();
              }}
            >
              Create Property
            </Button>
          </Alert>
        )}

        {!isLoading && !error && properties.length > 0 && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select a property to assign tenants to its spaces:
            </Typography>

            <List sx={{ p: 0 }}>
              {properties.map((property) => (
                <ListItem
                  key={property.id}
                  disablePadding
                  sx={{ mb: 1 }}
                >
                  <ListItemButton
                    selected={selectedProperty?.id === property.id}
                    onClick={() => handlePropertySelect(property)}
                    sx={{
                      border: '1px solid',
                      borderColor: selectedProperty?.id === property.id ? 'primary.main' : 'grey.300',
                      borderRadius: 1,
                      '&.Mui-selected': {
                        backgroundColor: 'primary.50',
                        '&:hover': {
                          backgroundColor: 'primary.100',
                        },
                      },
                    }}
                  >
                    <ListItemIcon>
                      {getPropertyIcon(property)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">
                            {property.name}
                          </Typography>
                          <Chip 
                            label={property.type} 
                            size="small" 
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <LocationOn sx={{ fontSize: 14 }} />
                            <Typography variant="caption">
                              {property.location?.village}, {property.location?.district}
                            </Typography>
                          </Box>
                          <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                            {getPropertyStats(property)}
                          </Typography>
                        </Box>
                      }
                    />
                    {selectedProperty?.id === property.id && (
                      <ArrowForward color="primary" />
                    )}
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!selectedProperty}
          startIcon={<Home />}
        >
          Continue to Space Assignment
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PropertySelectorDialog;

