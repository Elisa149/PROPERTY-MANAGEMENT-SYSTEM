import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import {
  Settings,
  Save,
  Security,
  Notifications,
  Storage,
  Backup,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const SystemSettingsPage = () => {
  const { hasRole } = useAuth();
  const [settings, setSettings] = useState({
    systemName: 'Property Management System',
    systemVersion: '1.0.0',
    maintenanceMode: false,
    allowNewRegistrations: true,
    requireEmailVerification: true,
    sessionTimeout: 60, // minutes
    maxLoginAttempts: 5,
    enableAuditLogs: true,
    enableBackups: true,
    backupFrequency: 'daily',
    emailNotifications: true,
    smsNotifications: false,
    defaultCurrency: 'UGX',
    defaultTimezone: 'Africa/Kampala',
  });

  if (!hasRole('super_admin')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6">Access Denied</Typography>
          <Typography>Only Super Administrators can access system settings.</Typography>
        </Alert>
      </Box>
    );
  }

  const handleSave = () => {
    // TODO: Implement API call to save system settings
    toast.success('System settings saved successfully');
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          System Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure system-wide settings and preferences
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* General Settings */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <Settings color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                General Settings
              </Typography>
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="systemName"
                  label="System Name"
                  value={settings.systemName}
                  onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="systemVersion"
                  label="System Version"
                  value={settings.systemVersion}
                  onChange={(e) => setSettings({ ...settings, systemVersion: e.target.value })}
                  disabled
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="defaultCurrency"
                  label="Default Currency"
                  value={settings.defaultCurrency}
                  onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="defaultTimezone"
                  label="Default Timezone"
                  value={settings.defaultTimezone}
                  onChange={(e) => setSettings({ ...settings, defaultTimezone: e.target.value })}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Security Settings */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <Security color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Security Settings
              </Typography>
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.requireEmailVerification}
                      onChange={(e) =>
                        setSettings({ ...settings, requireEmailVerification: e.target.checked })
                      }
                    />
                  }
                  label="Require Email Verification"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableAuditLogs}
                      onChange={(e) =>
                        setSettings({ ...settings, enableAuditLogs: e.target.checked })
                      }
                    />
                  }
                  label="Enable Audit Logs"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Session Timeout (minutes)"
                  value={settings.sessionTimeout}
                  onChange={(e) =>
                    setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) || 60 })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max Login Attempts"
                  value={settings.maxLoginAttempts}
                  onChange={(e) =>
                    setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) || 5 })
                  }
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Access Control */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <Security color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Access Control
              </Typography>
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.allowNewRegistrations}
                      onChange={(e) =>
                        setSettings({ ...settings, allowNewRegistrations: e.target.checked })
                      }
                    />
                  }
                  label="Allow New User Registrations"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.maintenanceMode}
                      onChange={(e) =>
                        setSettings({ ...settings, maintenanceMode: e.target.checked })
                      }
                    />
                  }
                  label="Maintenance Mode"
                />
                {settings.maintenanceMode && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Maintenance mode will restrict access to all users except Super Administrators.
                  </Alert>
                )}
              </Grid>
            </Grid>
          </Paper>

          {/* Notifications */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <Notifications color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Notification Settings
              </Typography>
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.emailNotifications}
                      onChange={(e) =>
                        setSettings({ ...settings, emailNotifications: e.target.checked })
                      }
                    />
                  }
                  label="Enable Email Notifications"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.smsNotifications}
                      onChange={(e) =>
                        setSettings({ ...settings, smsNotifications: e.target.checked })
                      }
                    />
                  }
                  label="Enable SMS Notifications"
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Backup Settings */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <Backup color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Backup Settings
              </Typography>
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableBackups}
                      onChange={(e) =>
                        setSettings({ ...settings, enableBackups: e.target.checked })
                      }
                    />
                  }
                  label="Enable Automatic Backups"
                />
              </Grid>
              {settings.enableBackups && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    select
                    label="Backup Frequency"
                    value={settings.backupFrequency}
                    onChange={(e) =>
                      setSettings({ ...settings, backupFrequency: e.target.value })
                    }
                    SelectProps={{
                      native: true,
                    }}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </TextField>
                </Grid>
              )}
            </Grid>
          </Paper>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="outlined" onClick={() => window.location.reload()}>
              Cancel
            </Button>
            <Button variant="contained" startIcon={<Save />} onClick={handleSave}>
              Save Settings
            </Button>
          </Box>
        </Grid>

        {/* System Info Sidebar */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              System Information
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  System Status
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip label="Operational" color="success" size="small" />
                </Box>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Database
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Firestore
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Authentication
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Firebase Auth
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Alert severity="info">
                <Typography variant="caption">
                  System settings are applied globally and affect all organizations.
                </Typography>
              </Alert>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SystemSettingsPage;

