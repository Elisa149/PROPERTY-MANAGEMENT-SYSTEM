const express = require('express');
const admin = require('firebase-admin');
const { verifyTokenWithRBAC, isSuperAdmin } = require('../middleware/rbac');

const router = express.Router();
const db = admin.firestore();


// System settings collection name
const SYSTEM_SETTINGS_COLLECTION = 'systemSettings';
const SYSTEM_SETTINGS_DOC_ID = 'main';

// Get system settings (Super Admin only)
router.get('/settings', verifyTokenWithRBAC, isSuperAdmin, async (req, res) => {
  try {
    const settingsDoc = await db.collection(SYSTEM_SETTINGS_COLLECTION).doc(SYSTEM_SETTINGS_DOC_ID).get();
    
    if (!settingsDoc.exists) {
      // Return default settings if none exist
      const defaultSettings = {
        systemName: 'Property Management System',
        systemVersion: '1.0.0',
        maintenanceMode: false,
        allowNewRegistrations: true,
        requireEmailVerification: true,
        sessionTimeout: 60,
        maxLoginAttempts: 5,
        enableAuditLogs: true,
        enableBackups: true,
        backupFrequency: 'daily',
        emailNotifications: true,
        smsNotifications: false,
        defaultCurrency: 'UGX',
        defaultTimezone: 'Africa/Kampala',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      // Create default settings
      await db.collection(SYSTEM_SETTINGS_COLLECTION).doc(SYSTEM_SETTINGS_DOC_ID).set(defaultSettings);
      
      return res.json({ settings: defaultSettings });
    }
    
    res.json({ settings: settingsDoc.data() });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

// Update system settings (Super Admin only)
router.put('/settings', verifyTokenWithRBAC, isSuperAdmin, async (req, res) => {
  try {
    const settings = req.body;
    
    // Validate required fields
    if (typeof settings.maintenanceMode !== 'boolean') {
      return res.status(400).json({ error: 'maintenanceMode must be a boolean' });
    }
    
    // Prepare update data
    const updateData = {
      ...settings,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: req.user.uid,
    };
    
    // Update or create settings
    await db.collection(SYSTEM_SETTINGS_COLLECTION).doc(SYSTEM_SETTINGS_DOC_ID).set(updateData, { merge: true });
    
    res.json({ 
      message: 'System settings updated successfully',
      settings: updateData 
    });
  } catch (error) {
    console.error('Error updating system settings:', error);
    res.status(500).json({ error: 'Failed to update system settings' });
  }
});

// Get system health (Super Admin only)
router.get('/health', verifyTokenWithRBAC, isSuperAdmin, async (req, res) => {
  try {
    // Get system statistics
    const organizationsSnapshot = await db.collection('organizations').get();
    const usersSnapshot = await db.collection('users').get();
    const propertiesSnapshot = await db.collection('properties').get();
    
    const health = {
      status: 'operational',
      timestamp: new Date().toISOString(),
      statistics: {
        totalOrganizations: organizationsSnapshot.size,
        totalUsers: usersSnapshot.size,
        totalProperties: propertiesSnapshot.size,
        activeUsers: usersSnapshot.docs.filter(doc => doc.data().status === 'active').length,
      },
      database: {
        status: 'connected',
        type: 'Firestore',
      },
      authentication: {
        status: 'operational',
        provider: 'Firebase Auth',
      },
    };
    
    res.json(health);
  } catch (error) {
    console.error('Error checking system health:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'Failed to check system health',
      message: error.message 
    });
  }
});

// Toggle maintenance mode (Super Admin only)
router.post('/maintenance', verifyTokenWithRBAC, isSuperAdmin, async (req, res) => {
  try {
    const { enabled, message } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }
    
    const updateData = {
      maintenanceMode: enabled,
      maintenanceMessage: message || 'System is under maintenance. Please try again later.',
      maintenanceEnabledAt: enabled ? admin.firestore.FieldValue.serverTimestamp() : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: req.user.uid,
    };
    
    await db.collection(SYSTEM_SETTINGS_COLLECTION).doc(SYSTEM_SETTINGS_DOC_ID).set(updateData, { merge: true });
    
    res.json({ 
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully`,
      maintenanceMode: enabled 
    });
  } catch (error) {
    console.error('Error toggling maintenance mode:', error);
    res.status(500).json({ error: 'Failed to toggle maintenance mode' });
  }
});

// Get system statistics (Super Admin only)
router.get('/statistics', verifyTokenWithRBAC, isSuperAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Get all organizations
    const organizationsSnapshot = await db.collection('organizations').get();
    const organizations = organizationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Get all properties
    const propertiesSnapshot = await db.collection('properties').get();
    const properties = propertiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Get all payments (if date range provided)
    let paymentsSnapshot;
    if (startDate && endDate) {
      paymentsSnapshot = await db.collection('payments')
        .where('paymentDate', '>=', new Date(startDate))
        .where('paymentDate', '<=', new Date(endDate))
        .get();
    } else {
      paymentsSnapshot = await db.collection('payments').get();
    }
    
    const payments = paymentsSnapshot.docs.map(doc => doc.data());
    
    // Calculate statistics
    const stats = {
      organizations: {
        total: organizations.length,
        active: organizations.filter(o => o.status === 'active').length,
        inactive: organizations.filter(o => o.status === 'inactive').length,
        suspended: organizations.filter(o => o.status === 'suspended').length,
      },
      users: {
        total: users.length,
        active: users.filter(u => u.status === 'active').length,
        pending: users.filter(u => u.status === 'pending' || u.status === 'pending_approval').length,
        inactive: users.filter(u => u.status === 'inactive').length,
        suspended: users.filter(u => u.status === 'suspended').length,
      },
      properties: {
        total: properties.length,
        byType: {
          building: properties.filter(p => p.type === 'building').length,
          land: properties.filter(p => p.type === 'land').length,
        },
      },
      payments: {
        total: payments.length,
        totalAmount: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
        totalLateFees: payments.reduce((sum, p) => sum + (p.lateFee || 0), 0),
      },
      dateRange: startDate && endDate ? { startDate, endDate } : null,
      generatedAt: new Date().toISOString(),
    };
    
    res.json({ statistics: stats });
  } catch (error) {
    console.error('Error fetching system statistics:', error);
    res.status(500).json({ error: 'Failed to fetch system statistics' });
  }
});

module.exports = router;
