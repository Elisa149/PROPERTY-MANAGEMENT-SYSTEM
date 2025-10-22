const admin = require('firebase-admin');

// Middleware to verify Firebase token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware to check if user owns the resource
const checkOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.uid;
      const resourceId = req.params.id;
      
      // Get the resource from Firestore
      const db = admin.firestore();
      const doc = await db.collection(resourceType).doc(resourceId).get();
      
      if (!doc.exists) {
        return res.status(404).json({ error: `${resourceType} not found` });
      }
      
      const resourceData = doc.data();
      if (resourceData.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      req.resource = resourceData;
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({ error: 'Failed to verify ownership' });
    }
  };
};

module.exports = {
  verifyToken,
  checkOwnership,
};
