import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { setAuthToken, authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [organizationId, setOrganizationId] = useState(null);
  const [needsRoleAssignment, setNeedsRoleAssignment] = useState(false);

  // Sign up with email and password
  const signup = async (email, password, displayName) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }
      
      toast.success('Account created successfully!');
      return result;
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Failed to create account');
      throw error;
    }
  };

  // Sign in with email and password
  const signin = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      toast.success('Signed in successfully!');
      return result;
    } catch (error) {
      console.error('Signin error:', error);
      if (error.code === 'auth/configuration-not-found' || error.message.includes('demo')) {
        toast.error('Please configure Firebase to enable authentication');
      } else {
        toast.error(error.message || 'Failed to sign in');
      }
      throw error;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      toast.success('Signed in with Google successfully!');
      return result;
    } catch (error) {
      console.error('Google signin error:', error);
      toast.error(error.message || 'Failed to sign in with Google');
      throw error;
    }
  };

  // Sign out
  const logout = async () => {
    try {
      await signOut(auth);
      setUserToken(null);
      setUserProfile(null);
      setUserRole(null);
      setUserPermissions([]);
      setOrganizationId(null);
      setNeedsRoleAssignment(false);
      toast.success('Signed out successfully!');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to sign out');
      throw error;
    }
  };

  // Get user token for API requests
  const getToken = async (forceRefresh = false) => {
    if (user) {
      try {
        const token = await user.getIdToken(forceRefresh);
        setUserToken(token);
        setAuthToken(token); // Update API token immediately
        return token;
      } catch (error) {
        console.error('Token error:', error);
        return null;
      }
    }
    return null;
  };

  // Fetch user profile with RBAC data
  const fetchUserProfile = async () => {
    try {
      console.log('🔄 AuthContext: Fetching user profile...');
      const response = await authAPI.getProfile();
      console.log('📋 AuthContext: Raw API Response:', response);
      console.log('📋 AuthContext: Response data:', response.data);
      
      // Handle axios response structure
      const profile = response.data?.profile || response.profile;
      console.log('👤 AuthContext: Profile data:', profile);
      
      if (!profile) {
        console.error('❌ AuthContext: No profile data in response');
        return null;
      }
      
      console.log('🎭 AuthContext: Role data:', profile.role);
      console.log('🔒 AuthContext: Permissions:', profile.permissions);
      
      setUserProfile(profile);
      setUserRole(profile.role);
      setUserPermissions(profile.permissions || []);
      setOrganizationId(profile.organizationId);
      setNeedsRoleAssignment(profile.needsRoleAssignment);
      
      console.log('✅ AuthContext: State updated');
      return profile;
    } catch (error) {
      console.error('❌ AuthContext: Failed to fetch user profile:', error);
      console.error('🔍 AuthContext: Error details:', error.response?.data);
      return null;
    }
  };

  // Request access to organization
  const requestAccess = async (organizationId, message) => {
    try {
      const response = await authAPI.requestAccess({ organizationId, message });
      
      if (response.success) {
        toast.success('Access request submitted successfully');
        // Refresh profile after request submission
        await fetchUserProfile();
        return true;
      }
    } catch (error) {
      console.error('Failed to request access:', error);
      toast.error('Failed to submit access request. Please try again.');
      return false;
    }
  };

  // Check if user has specific permission
  const hasPermission = React.useCallback((permission) => {
    return userPermissions.includes(permission);
  }, [userPermissions]);

  // Check if user has any of the specified permissions
  const hasAnyPermission = React.useCallback((permissions) => {
    if (!userPermissions || userPermissions.length === 0) {
      return false;
    }
    return permissions.some(permission => userPermissions.includes(permission));
  }, [userPermissions]);

  // Check if user has specific role
  const hasRole = React.useCallback((roleName) => {
    return userRole && userRole.name === roleName;
  }, [userRole]);

  // Check if user is admin (org admin or super admin)
  const isAdmin = React.useCallback(() => {
    return userRole && (userRole.name === 'org_admin' || userRole.name === 'super_admin');
  }, [userRole]);

  // Check if user is super admin
  const isSuperAdmin = React.useCallback(() => {
    return userRole && userRole.name === 'super_admin';
  }, [userRole]);

  // Refresh token when it expires
  const refreshToken = async () => {
    if (user) {
      try {
        console.log('🔄 Refreshing expired token...');
        const token = await user.getIdToken(true); // Force refresh
        setUserToken(token);
        setAuthToken(token);
        toast.success('Session refreshed successfully');
        return token;
      } catch (error) {
        console.error('Token refresh failed:', error);
        toast.error('Session expired. Please sign in again.');
        await logout();
        return null;
      }
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Get the user token when user signs in
        try {
          const token = await user.getIdToken();
          setUserToken(token);
          setAuthToken(token); // Set token for API calls
          
          // Fetch user profile with RBAC data
          setTimeout(async () => {
            await fetchUserProfile();
            // Note: No auto-assignment - users need to request access manually
          }, 1000); // Small delay to ensure backend is ready
          
        } catch (error) {
          console.error('Failed to get token:', error);
        }
      } else {
        setUserToken(null);
        setAuthToken(null); // Clear token for API calls
        setUserProfile(null);
        setUserRole(null);
        setUserPermissions([]);
        setOrganizationId(null);
        setNeedsRoleAssignment(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Auto-refresh token every 50 minutes (tokens expire after 1 hour)
  useEffect(() => {
    let interval;
    
    if (user) {
      interval = setInterval(async () => {
        try {
          console.log('🔄 Auto-refreshing token...');
          const token = await user.getIdToken(true); // force refresh
          setUserToken(token);
          setAuthToken(token); // Update token for API calls
          console.log('✅ Token refreshed successfully');
        } catch (error) {
          console.error('❌ Auto token refresh error:', error);
          toast.error('Session expired. Please sign in again.');
        }
      }, 50 * 60 * 1000); // 50 minutes - more conservative
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [user]);

  const value = {
    user,
    userToken,
    userProfile,
    userRole,
    userPermissions,
    organizationId,
    needsRoleAssignment,
    signup,
    signin,
    signInWithGoogle,
    logout,
    getToken,
    refreshToken,
    fetchUserProfile,
    requestAccess,
    hasPermission,
    hasAnyPermission,
    hasRole,
    isAdmin,
    isSuperAdmin,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
