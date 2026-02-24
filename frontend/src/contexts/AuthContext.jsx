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
import { authAPI, clearProfileCache } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]                       = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [userProfile, setUserProfile]         = useState(null);
  const [userRole, setUserRole]               = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [organizationId, setOrganizationId]   = useState(null);
  const [needsRoleAssignment, setNeedsRoleAssignment] = useState(false);

  // ── Auth actions ────────────────────────────────────────────────────────────

  const signup = async (email, password, displayName) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) await updateProfile(result.user, { displayName });
    toast.success('Account created successfully!');
    return result;
  };

  const signin = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      toast.success('Signed in successfully!');
      return result;
    } catch (error) {
      if (error.code === 'auth/configuration-not-found' || error.message.includes('demo')) {
        toast.error('Please configure Firebase to enable authentication');
      } else {
        toast.error(error.message || 'Failed to sign in');
      }
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      toast.success('Signed in with Google successfully!');
      return result;
    } catch (error) {
      toast.error(error.message || 'Failed to sign in with Google');
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
    clearProfileCache();
    setUserProfile(null);
    setUserRole(null);
    setUserPermissions([]);
    setOrganizationId(null);
    setNeedsRoleAssignment(false);
    toast.success('Signed out successfully!');
  };

  /** No longer meaningful (no Express backend) — kept for API compatibility */
  const getToken = async () => {
    if (user) return user.getIdToken();
    return null;
  };

  const refreshToken = async () => {
    if (user) return user.getIdToken(true);
    return null;
  };

  // ── Fetch Firestore profile (role, org, permissions) ────────────────────────

  const fetchUserProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      const profile = response.data?.profile || response.profile;
      if (!profile) return null;

      setUserProfile(profile);
      setUserRole(profile.role);
      setUserPermissions(profile.permissions || []);
      setOrganizationId(profile.organizationId);
      setNeedsRoleAssignment(profile.needsRoleAssignment);
      return profile;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      return null;
    }
  };

  const requestAccess = async (organizationId, message) => {
    try {
      await authAPI.requestAccess({ organizationId, message });
      toast.success('Access request submitted successfully');
      await fetchUserProfile();
      return true;
    } catch (error) {
      toast.error('Failed to submit access request. Please try again.');
      return false;
    }
  };

  // ── Permission helpers ───────────────────────────────────────────────────────

  const hasPermission = React.useCallback(
    (permission) => userPermissions.includes(permission),
    [userPermissions]
  );

  const hasAnyPermission = React.useCallback(
    (permissions) => (userPermissions || []).some((p) => permissions.includes(p)),
    [userPermissions]
  );

  const hasRole = React.useCallback(
    (roleName) => userRole && userRole.name === roleName,
    [userRole]
  );

  const isAdmin = React.useCallback(
    () => userRole && (userRole.name === 'org_admin' || userRole.name === 'super_admin'),
    [userRole]
  );

  const isSuperAdmin = React.useCallback(
    () => userRole && userRole.name === 'super_admin',
    [userRole]
  );

  // ── Auth state listener ──────────────────────────────────────────────────────

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Fetch Firestore profile immediately — no backend cold-start to wait for
        await fetchUserProfile();
      } else {
        clearProfileCache();
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

  const value = {
    user,
    userToken: null,          // kept for API compatibility
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
