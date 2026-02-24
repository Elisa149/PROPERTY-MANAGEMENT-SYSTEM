/**
 * Firebase-direct service layer.
 *
 * Replaces the Express/Node backend — every call goes straight to Firestore.
 * Return shapes are kept identical to the old Express API so no page-level
 * changes are required (pages still do `data?.data?.properties` etc.).
 *
 * Security note: row-level access control is enforced by Firestore Security
 * Rules on the Firebase console.  The permission checks in the UI are
 * UX-only guards (they do not replace server-side rules).
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

// ── Utility helpers ───────────────────────────────────────────────────────────

/** Recursively convert Firestore Timestamps to JS Dates in a plain object */
function convertTimestamps(data) {
  if (!data || typeof data !== 'object') return data;
  if (data instanceof Timestamp) return data.toDate();
  if (data instanceof Date) return data;
  if (Array.isArray(data)) return data.map(convertTimestamps);
  const result = {};
  for (const [k, v] of Object.entries(data)) {
    result[k] = convertTimestamps(v);
  }
  return result;
}

function snapToObj(snap) {
  return { id: snap.id, ...convertTimestamps(snap.data()) };
}

// ── User-profile cache (avoids re-fetching on every API call) ─────────────────

let _profileCache = null;
let _profileCacheUid = null;

export function clearProfileCache() {
  _profileCache = null;
  _profileCacheUid = null;
}

async function fetchUserProfile() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  if (_profileCache && _profileCacheUid === user.uid) return _profileCache;
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists()) throw new Error('User profile not found');
  _profileCache = snap.data();
  _profileCacheUid = user.uid;
  return _profileCache;
}

async function getOrgId() {
  const profile = await fetchUserProfile();
  return profile.organizationId || null;
}

/** No-op kept for backwards compatibility — token management is no longer needed */
export const setAuthToken = () => {};

// ── AUTH API ──────────────────────────────────────────────────────────────────

export const authAPI = {
  /** Read (or create on first login) the signed-in user's Firestore profile */
  getProfile: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    const userRef = doc(db, 'users', user.uid);
    let userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // First sign-in — bootstrap a profile document
      const newUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email,
        organizationId: null,
        roleId: null,
        permissions: [],
        status: 'pending',
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      };
      await setDoc(userRef, newUser);
      clearProfileCache();
      return {
        data: {
          profile: {
            uid: user.uid,
            email: user.email,
            role: null,
            permissions: [],
            organizationId: null,
            needsRoleAssignment: true,
          },
        },
      };
    }

    // Update last-login timestamp (fire-and-forget)
    updateDoc(userRef, { lastLoginAt: serverTimestamp() }).catch(() => {});

    const userProfile = userSnap.data();

    // Load role & permissions from the roles collection
    let role = null;
    let permissions = [...(userProfile.permissions || [])];

    if (userProfile.roleId) {
      const roleSnap = await getDoc(doc(db, 'roles', userProfile.roleId)).catch(() => null);
      if (roleSnap?.exists()) {
        role = { id: roleSnap.id, ...roleSnap.data() };
        permissions = [...new Set([...permissions, ...(role.permissions || [])])];
      }
    }

    _profileCache = { ...userProfile, role, permissions };
    _profileCacheUid = user.uid;

    return {
      data: {
        profile: {
          uid: user.uid,
          email: user.email,
          ...userProfile,
          role,
          permissions,
          organizationId: userProfile.organizationId,
          needsRoleAssignment: !userProfile.organizationId || !userProfile.roleId,
        },
      },
    };
  },

  updateProfile: async (data) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    await updateDoc(doc(db, 'users', user.uid), { ...data, updatedAt: serverTimestamp() });
    clearProfileCache();
    return { data: { success: true } };
  },

  verifyToken: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return { data: { valid: true, user: { uid: user.uid, email: user.email } } };
  },

  requestAccess: async ({ organizationId, message }) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    let targetOrgId = organizationId;
    if (!targetOrgId) {
      const orgSnap = await getDocs(
        query(collection(db, 'organizations'), where('isDefault', '==', true), limit(1))
      );
      if (orgSnap.empty) throw new Error('No default organization found');
      targetOrgId = orgSnap.docs[0].id;
    }

    await addDoc(collection(db, 'accessRequests'), {
      userId: user.uid,
      userEmail: user.email,
      userName: user.displayName || user.email,
      organizationId: targetOrgId,
      message: message || '',
      status: 'pending',
      requestedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, 'users', user.uid), {
      status: 'pending_approval',
      pendingOrganizationId: targetOrgId,
      accessRequestedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    clearProfileCache();
    return { data: { success: true, status: 'pending_approval' } };
  },

  getOrganizations: async () => {
    const snap = await getDocs(
      query(collection(db, 'organizations'), where('status', '==', 'active'))
    );
    return { data: { organizations: snap.docs.map(snapToObj) } };
  },

  getOrgRoles: async (orgId) => {
    const snap = await getDocs(
      query(collection(db, 'roles'), where('organizationId', '==', orgId))
    );
    return { data: { roles: snap.docs.map(snapToObj) } };
  },

  getAccessRequests: async () => {
    const snap = await getDocs(
      query(collection(db, 'accessRequests'), where('status', '==', 'pending'))
    );
    return { data: { requests: snap.docs.map(snapToObj) } };
  },

  respondToRequest: async (requestId, { action, roleId, message }) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    const reqSnap = await getDoc(doc(db, 'accessRequests', requestId));
    if (!reqSnap.exists()) throw new Error('Access request not found');
    const reqData = reqSnap.data();

    const batch = writeBatch(db);

    if (action === 'approve') {
      batch.update(doc(db, 'users', reqData.userId), {
        organizationId: reqData.organizationId,
        roleId,
        status: 'active',
        approvedBy: user.uid,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.update(doc(db, 'users', reqData.userId), {
        status: 'rejected',
        rejectedBy: user.uid,
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    batch.update(doc(db, 'accessRequests', requestId), {
      status: action === 'approve' ? 'approved' : 'rejected',
      respondedBy: user.uid,
      respondedAt: serverTimestamp(),
      responseMessage: message || '',
    });

    await batch.commit();
    return { data: { success: true, action } };
  },
};

// ── PROPERTIES API ────────────────────────────────────────────────────────────

export const propertiesAPI = {
  getAll: async () => {
    const orgId = await getOrgId().catch(() => null);
    const q = orgId
      ? query(collection(db, 'properties'), where('organizationId', '==', orgId))
      : query(collection(db, 'properties'));
    const snap = await getDocs(q);
    const properties = snap.docs.map(snapToObj);
    properties.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return { data: { properties } };
  },

  getById: async (id) => {
    const snap = await getDoc(doc(db, 'properties', id));
    if (!snap.exists()) throw new Error('Property not found');
    return { data: { property: snapToObj(snap) } };
  },

  create: async (data) => {
    const user = auth.currentUser;
    const orgId = await getOrgId();
    const propertyDoc = {
      ...data,
      organizationId: orgId,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, 'properties'), propertyDoc);
    return { data: { success: true, property: { id: ref.id, ...propertyDoc } } };
  },

  update: async (id, data) => {
    const user = auth.currentUser;
    const orgId = await getOrgId();
    const updateData = { ...data, organizationId: orgId, updatedAt: serverTimestamp(), updatedBy: user.uid };
    await updateDoc(doc(db, 'properties', id), updateData);

    // Sync active rent records when space rents change (mirrors backend behaviour)
    try {
      const rentSnap = await getDocs(
        query(collection(db, 'rent'), where('propertyId', '==', id), where('status', '==', 'active'))
      );
      if (!rentSnap.empty) {
        const batch = writeBatch(db);
        let changed = 0;
        rentSnap.forEach((rentDoc) => {
          const rd = rentDoc.data();
          if (!rd.spaceId) return;
          let newRent = null;
          if (data.type === 'building') {
            for (const floor of data.buildingDetails?.floors || []) {
              const sp = (floor.spaces || []).find((s) => s.spaceId === rd.spaceId);
              if (sp && sp.monthlyRent !== undefined) { newRent = sp.monthlyRent; break; }
            }
          } else if (data.type === 'land') {
            const sq = (data.landDetails?.squatters || []).find((s) => s.squatterId === rd.spaceId);
            if (sq) newRent = sq.monthlyPayment;
          }
          if (newRent !== null && newRent !== rd.monthlyRent) {
            batch.update(rentDoc.ref, { monthlyRent: newRent, baseRent: newRent, updatedAt: serverTimestamp() });
            changed++;
          }
        });
        if (changed) await batch.commit();
      }
    } catch (_) { /* non-blocking */ }

    return { data: { success: true, property: { id, ...updateData } } };
  },

  delete: async (id) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'properties', id));
    const [rentSnap, pymtSnap] = await Promise.all([
      getDocs(query(collection(db, 'rent'), where('propertyId', '==', id))),
      getDocs(query(collection(db, 'payments'), where('propertyId', '==', id))),
    ]);
    rentSnap.forEach((d) => batch.delete(d.ref));
    pymtSnap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    return { data: { success: true } };
  },

  getStats: async (id) => {
    const [propSnap, pymtSnap] = await Promise.all([
      getDoc(doc(db, 'properties', id)),
      getDocs(query(collection(db, 'payments'), where('propertyId', '==', id))),
    ]);
    let totalCollected = 0;
    let totalPayments = 0;
    pymtSnap.forEach((d) => { totalCollected += d.data().amount || 0; totalPayments++; });
    return { data: { stats: { totalCollected, totalPayments } } };
  },
};

// ── RENT API ──────────────────────────────────────────────────────────────────

export const rentAPI = {
  getAll: async () => {
    const orgId = await getOrgId().catch(() => null);
    const q = orgId
      ? query(collection(db, 'rent'), where('organizationId', '==', orgId))
      : query(collection(db, 'rent'));
    const snap = await getDocs(q);
    const rentRecords = snap.docs.map(snapToObj);
    rentRecords.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return { data: { rentRecords } };
  },

  getAllRentRecords: async () => {
    const snap = await getDocs(collection(db, 'rent'));
    return { data: { rentRecords: snap.docs.map(snapToObj) } };
  },

  getById: async (id) => {
    const snap = await getDoc(doc(db, 'rent', id));
    if (!snap.exists()) throw new Error('Rent record not found');
    return { data: { rentRecord: snapToObj(snap) } };
  },

  getByProperty: async (propertyId) => {
    const snap = await getDocs(
      query(collection(db, 'rent'), where('propertyId', '==', propertyId))
    );
    return { data: { rentRecords: snap.docs.map(snapToObj) } };
  },

  create: async (data) => {
    const user = auth.currentUser;
    const orgId = await getOrgId();
    const rentDoc = { ...data, organizationId: orgId, createdBy: user.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    const ref = await addDoc(collection(db, 'rent'), rentDoc);
    return { data: { success: true, rentRecord: { id: ref.id, ...rentDoc } } };
  },

  update: async (id, data) => {
    await updateDoc(doc(db, 'rent', id), { ...data, updatedAt: serverTimestamp() });
    return { data: { success: true } };
  },

  delete: async (id) => {
    await deleteDoc(doc(db, 'rent', id));
    return { data: { success: true } };
  },
};

// ── PAYMENTS API ──────────────────────────────────────────────────────────────

export const paymentsAPI = {
  getAll: async (params = {}) => {
    const orgId = await getOrgId().catch(() => null);
    const q = orgId
      ? query(collection(db, 'payments'), where('organizationId', '==', orgId))
      : query(collection(db, 'payments'));
    const snap = await getDocs(q);
    const payments = snap.docs.map(snapToObj);
    payments.sort((a, b) => new Date(b.paymentDate || 0) - new Date(a.paymentDate || 0));
    return { data: { payments } };
  },

  getById: async (id) => {
    const snap = await getDoc(doc(db, 'payments', id));
    if (!snap.exists()) throw new Error('Payment not found');
    return { data: { payment: snapToObj(snap) } };
  },

  create: async (data) => {
    const user = auth.currentUser;
    const orgId = await getOrgId();
    const paymentDoc = { ...data, organizationId: orgId, createdBy: user.uid, createdAt: serverTimestamp() };
    const ref = await addDoc(collection(db, 'payments'), paymentDoc);
    return { data: { success: true, payment: { id: ref.id, ...paymentDoc } } };
  },

  update: async (id, data) => {
    await updateDoc(doc(db, 'payments', id), { ...data, updatedAt: serverTimestamp() });
    return { data: { success: true } };
  },

  delete: async (id) => {
    await deleteDoc(doc(db, 'payments', id));
    return { data: { success: true } };
  },

  getDashboardSummary: async () => {
    const orgId = await getOrgId().catch(() => null);
    const mkQuery = (col, ...extra) =>
      orgId
        ? query(collection(db, col), where('organizationId', '==', orgId), ...extra)
        : query(collection(db, col), ...extra);

    const [pymtSnap, propSnap, rentSnap] = await Promise.all([
      getDocs(mkQuery('payments')),
      getDocs(mkQuery('properties')),
      getDocs(mkQuery('rent'), where('status', '==', 'active')),
    ]);

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    let thisCollected = 0, thisCount = 0, lastCollected = 0, lastCount = 0;
    const allPayments = [];

    pymtSnap.forEach((d) => {
      const p = d.data();
      const date = p.paymentDate instanceof Timestamp ? p.paymentDate.toDate() : new Date(p.paymentDate);
      allPayments.push({ id: d.id, ...convertTimestamps(p), paymentDate: date });
      if (date >= thisMonthStart) { thisCollected += p.amount || 0; thisCount++; }
      else if (date >= lastMonthStart && date <= lastMonthEnd) { lastCollected += p.amount || 0; lastCount++; }
    });

    allPayments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

    let expectedRent = 0;
    rentSnap.forEach((d) => { expectedRent += d.data().monthlyRent || 0; });

    let totalSpaces = 0;
    propSnap.forEach((d) => {
      const p = d.data();
      if (p.type === 'building') {
        (p.buildingDetails?.floors || []).forEach((f) => { totalSpaces += (f.spaces?.length || 0); });
      } else if (p.type === 'land') {
        totalSpaces += (p.landDetails?.squatters?.length || 0);
      }
    });

    const rate = (amt) => expectedRent > 0 ? Math.round((amt / expectedRent) * 100) : 0;

    return {
      data: {
        totalProperties: propSnap.size,
        totalSpaces,
        thisMonth: { collected: thisCollected, expected: expectedRent, payments: thisCount, collectionRate: rate(thisCollected) },
        lastMonth: { collected: lastCollected, expected: expectedRent, payments: lastCount, collectionRate: rate(lastCollected) },
        recentPayments: allPayments.slice(0, 5),
      },
    };
  },

  getStats: async () => {
    const orgId = await getOrgId().catch(() => null);
    const q = orgId
      ? query(collection(db, 'payments'), where('organizationId', '==', orgId))
      : query(collection(db, 'payments'));
    const snap = await getDocs(q);
    let total = 0, count = 0;
    snap.forEach((d) => { total += d.data().amount || 0; count++; });
    return { data: { stats: { total, count } } };
  },
};

// ── INVOICES API ──────────────────────────────────────────────────────────────

/** Generate a sequential invoice number for the given org */
async function generateInvoiceNumber(orgId) {
  const snap = await getDocs(
    query(collection(db, 'invoices'), where('organizationId', '==', orgId))
  );
  const seq = String(snap.size + 1).padStart(4, '0');
  return `INV-${new Date().getFullYear()}-${seq}`;
}

export const invoicesAPI = {
  getAll: async (params = {}) => {
    const orgId = await getOrgId().catch(() => null);
    const q = orgId
      ? query(collection(db, 'invoices'), where('organizationId', '==', orgId))
      : query(collection(db, 'invoices'));
    const snap = await getDocs(q);
    const invoices = snap.docs.map(snapToObj);
    invoices.sort((a, b) => new Date(b.issueDate || b.createdAt || 0) - new Date(a.issueDate || a.createdAt || 0));
    return { data: { invoices } };
  },

  getById: async (id) => {
    const snap = await getDoc(doc(db, 'invoices', id));
    if (!snap.exists()) throw new Error('Invoice not found');
    return { data: { invoice: snapToObj(snap) } };
  },

  create: async (data) => {
    const user = auth.currentUser;
    const orgId = await getOrgId();

    // Pull tenant / property names from the rent record if not supplied
    let tenantName = data.tenantName || '';
    let propertyName = data.propertyName || '';
    if (data.rentId && (!tenantName || !propertyName)) {
      const rentSnap = await getDoc(doc(db, 'rent', data.rentId)).catch(() => null);
      if (rentSnap?.exists()) {
        const rd = rentSnap.data();
        tenantName = tenantName || rd.tenantName || '';
        propertyName = propertyName || rd.propertyName || '';
      }
    }

    const invoiceNumber = await generateInvoiceNumber(orgId);
    const invoiceDoc = {
      ...data,
      invoiceNumber,
      tenantName,
      propertyName,
      organizationId: orgId,
      issueDate: new Date().toISOString(),
      status: data.status || 'pending',
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, 'invoices'), invoiceDoc);
    return { data: { success: true, invoice: { id: ref.id, ...invoiceDoc } } };
  },

  update: async (id, data) => {
    await updateDoc(doc(db, 'invoices', id), { ...data, updatedAt: serverTimestamp() });
    return { data: { success: true } };
  },

  delete: async (id) => {
    await deleteDoc(doc(db, 'invoices', id));
    return { data: { success: true } };
  },
};

// ── TENANTS API ───────────────────────────────────────────────────────────────
// In the RBAC version tenant data is embedded inside rent records.
// These functions delegate to the rent collection so page code doesn't change.

export const tenantsAPI = {
  getAll: async () => {
    const orgId = await getOrgId().catch(() => null);
    const q = orgId
      ? query(collection(db, 'rent'), where('organizationId', '==', orgId))
      : query(collection(db, 'rent'));
    const snap = await getDocs(q);
    return { data: { tenants: snap.docs.map(snapToObj) } };
  },

  getById: async (id) => {
    const snap = await getDoc(doc(db, 'rent', id));
    if (!snap.exists()) throw new Error('Tenant record not found');
    return { data: { tenant: snapToObj(snap) } };
  },

  create: async (data) => rentAPI.create(data),

  update: async (id, data) => rentAPI.update(id, data),

  delete: async (id) => {
    await deleteDoc(doc(db, 'rent', id));
    return { data: { success: true } };
  },

  getByProperty: async (propertyId) => rentAPI.getByProperty(propertyId),
};

// ── USERS API ─────────────────────────────────────────────────────────────────

export const usersAPI = {
  getAll: async () => {
    const orgId = await getOrgId().catch(() => null);
    const q = orgId
      ? query(collection(db, 'users'), where('organizationId', '==', orgId))
      : query(collection(db, 'users'));
    const snap = await getDocs(q);
    return { data: { users: snap.docs.map(snapToObj) } };
  },

  getAllUsers: async () => {
    const snap = await getDocs(collection(db, 'users'));
    return { data: { users: snap.docs.map(snapToObj) } };
  },

  getById: async (id) => {
    const snap = await getDoc(doc(db, 'users', id));
    if (!snap.exists()) throw new Error('User not found');
    return { data: { user: snapToObj(snap) } };
  },

  updateProfile: async (id, data) => {
    await updateDoc(doc(db, 'users', id), { ...data, updatedAt: serverTimestamp() });
    if (auth.currentUser?.uid === id) clearProfileCache();
    return { data: { success: true } };
  },

  updateRole: async (id, data) => {
    await updateDoc(doc(db, 'users', id), { ...data, updatedAt: serverTimestamp() });
    return { data: { success: true } };
  },

  getAdminDashboardStats: async () => {
    const [usersSnap, orgsSnap, propsSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'organizations')),
      getDocs(collection(db, 'properties')),
    ]);
    return {
      data: {
        stats: {
          totalUsers: usersSnap.size,
          totalOrganizations: orgsSnap.size,
          totalProperties: propsSnap.size,
        },
      },
    };
  },
};

// ── ORGANIZATIONS API ─────────────────────────────────────────────────────────

export const organizationsAPI = {
  getAll: async () => {
    const snap = await getDocs(collection(db, 'organizations'));
    return { data: { organizations: snap.docs.map(snapToObj) } };
  },

  getById: async (id) => {
    const snap = await getDoc(doc(db, 'organizations', id));
    if (!snap.exists()) throw new Error('Organization not found');
    return { data: { organization: snapToObj(snap) } };
  },

  create: async (data) => {
    const user = auth.currentUser;
    const orgDoc = { ...data, status: data.status || 'active', createdBy: user.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    const ref = await addDoc(collection(db, 'organizations'), orgDoc);
    return { data: { success: true, organization: { id: ref.id, ...orgDoc } } };
  },

  update: async (id, data) => {
    await updateDoc(doc(db, 'organizations', id), { ...data, updatedAt: serverTimestamp() });
    return { data: { success: true } };
  },

  delete: async (id) => {
    await deleteDoc(doc(db, 'organizations', id));
    return { data: { success: true } };
  },

  getRoles: async (id) => {
    const snap = await getDocs(query(collection(db, 'roles'), where('organizationId', '==', id)));
    return { data: { roles: snap.docs.map(snapToObj) } };
  },

  createRole: async (orgId, data) => {
    const ref = await addDoc(collection(db, 'roles'), { ...data, organizationId: orgId, createdAt: serverTimestamp() });
    return { data: { success: true, role: { id: ref.id, ...data, organizationId: orgId } } };
  },

  updateRole: async (orgId, roleId, data) => {
    await updateDoc(doc(db, 'roles', roleId), { ...data, updatedAt: serverTimestamp() });
    return { data: { success: true } };
  },

  deleteRole: async (orgId, roleId) => {
    await deleteDoc(doc(db, 'roles', roleId));
    return { data: { success: true } };
  },

  getUsers: async (id) => {
    const snap = await getDocs(query(collection(db, 'users'), where('organizationId', '==', id)));
    return { data: { users: snap.docs.map(snapToObj) } };
  },

  updateUserRole: async (orgId, userId, roleId) => {
    await updateDoc(doc(db, 'users', userId), { roleId, updatedAt: serverTimestamp() });
    return { data: { success: true } };
  },

  updateUserStatus: async (orgId, userId, status) => {
    await updateDoc(doc(db, 'users', userId), { status, updatedAt: serverTimestamp() });
    return { data: { success: true } };
  },

  removeUser: async (orgId, userId) => {
    await updateDoc(doc(db, 'users', userId), {
      organizationId: null, roleId: null, status: 'pending', updatedAt: serverTimestamp(),
    });
    return { data: { success: true } };
  },

  inviteUser: async (orgId, data) => {
    const ref = await addDoc(collection(db, 'invitations'), {
      ...data, organizationId: orgId, status: 'pending', createdAt: serverTimestamp(),
    });
    return { data: { success: true, invitation: { id: ref.id } } };
  },

  getInvitations: async (orgId, status) => {
    let q = query(collection(db, 'invitations'), where('organizationId', '==', orgId));
    if (status) q = query(collection(db, 'invitations'), where('organizationId', '==', orgId), where('status', '==', status));
    const snap = await getDocs(q);
    return { data: { invitations: snap.docs.map(snapToObj) } };
  },

  cancelInvitation: async (orgId, invitationId) => {
    await updateDoc(doc(db, 'invitations', invitationId), { status: 'cancelled', updatedAt: serverTimestamp() });
    return { data: { success: true } };
  },
};

// ── SYSTEM API ────────────────────────────────────────────────────────────────

export const systemAPI = {
  getSettings: async () => {
    const snap = await getDoc(doc(db, 'system', 'settings'));
    return { data: { settings: snap.exists() ? convertTimestamps(snap.data()) : {} } };
  },

  updateSettings: async (data) => {
    await setDoc(doc(db, 'system', 'settings'), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    return { data: { success: true } };
  },

  getHealth: async () => ({ data: { status: 'OK', timestamp: new Date().toISOString() } }),

  toggleMaintenance: async (enabled, message) => {
    await setDoc(doc(db, 'system', 'settings'), {
      maintenanceMode: enabled, maintenanceMessage: message, updatedAt: serverTimestamp(),
    }, { merge: true });
    return { data: { success: true } };
  },

  getStatistics: async () => {
    const [propsSnap, usersSnap, pymtSnap] = await Promise.all([
      getDocs(collection(db, 'properties')),
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'payments')),
    ]);
    let totalRevenue = 0;
    pymtSnap.forEach((d) => { totalRevenue += d.data().amount || 0; });
    return {
      data: {
        statistics: {
          totalProperties: propsSnap.size,
          totalUsers: usersSnap.size,
          totalPayments: pymtSnap.size,
          totalRevenue,
        },
      },
    };
  },
};

export default {
  authAPI, propertiesAPI, rentAPI, paymentsAPI, invoicesAPI,
  tenantsAPI, usersAPI, organizationsAPI, systemAPI,
};
