import { create } from "zustand";
import { GymUser, useUsersStore } from "./usersStore";

const BASE_URL = "https://afrgym.com.ng/wp-json/gym-admin/v1";
const STORAGE_KEY = "gym-one-checkin-cache";
const GYM_IDENTIFIER = "afrgym_one";
const GYM_TYPE = "gym-one";

export interface FingerprintEnrollment {
  id: number;
  user_id: number;
  zk_pin: string;
  device_serial: string;
  gym_identifier: string;
  enrolled_at: string;
  last_scan: string | null;
  scan_count: number;
  is_active: boolean;
  display_name: string;
  user_email: string;
  user_login: string;
}

export interface EnrolledResponse {
  success: boolean;
  gym_identifier: string;
  enrollments: FingerprintEnrollment[];
}

export interface CheckinCacheData {
  users: GymUser[];
  fingerprints: FingerprintEnrollment[];
  lastSyncedAt: number | null;
}

interface CheckinCacheState {
  users: GymUser[];
  fingerprints: FingerprintEnrollment[];
  lastSyncedAt: number | null;
  isSyncing: boolean;
  error: string | null;

  // Actions
  syncCache: () => Promise<void>;
  lookupByPin: (pin: string) => Promise<GymUser | null>;
  lookupByQrId: (qrId: string) => Promise<GymUser | null>;
  lookupById: (userId: number) => Promise<GymUser | null>;
  clearCache: () => void;
  enrollFingerprint: (userId: number, zkPin: string, deviceSerial: string) => Promise<any>;
  deleteFingerprint: (userId: number, deviceSerial?: string) => Promise<any>;
  getDeviceStatus: () => Promise<{
    success: boolean;
    gym_identifier: string;
    device_serial: string;
    is_connected: boolean;
    last_seen: string | null;
    last_scan: any;
  }>;
}

// Helper function to check if error is related to invalid token
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isTokenInvalidError = (error: any): boolean => {
  if (error?.code === "jwt_auth_invalid_token") return true;
  if (error?.data?.status === 403) return true;
  if (error?.status === 403) return true;
  if (error?.message?.toLowerCase().includes("token is invalid")) return true;
  if (error?.message?.toLowerCase().includes("unauthorized")) return true;
  if (error?.message?.toLowerCase().includes("forbidden")) return true;
  return false;
};

// Helper function to trigger logout and redirect
const handleTokenInvalidation = async () => {
  console.log("Invalid token detected, logging out user");
  localStorage.removeItem("gym-auth-storage");
  window.dispatchEvent(
    new CustomEvent("auth:logout", {
      detail: { reason: "token_invalid" },
    })
  );
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
};

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const authState = localStorage.getItem("gym-auth-storage");
  let token = null;

  if (authState) {
    try {
      const parsedAuth = JSON.parse(authState);
      token = parsedAuth.state?.token;
    } catch (error) {
      console.warn("Failed to parse auth token:", error);
    }
  }

  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = {
        ...errorData,
        status: response.status,
        statusText: response.statusText,
      };
      if (isTokenInvalidError(error)) {
        await handleTokenInvalidation();
        throw new Error("Your session has expired. Please login again.");
      }
      throw error;
    }
    return response.json();
  } catch (error) {
    if (isTokenInvalidError(error)) {
      await handleTokenInvalidation();
      throw new Error("Your session has expired. Please login again.");
    }
    throw error;
  }
};

const loadInitialState = (): CheckinCacheData => {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      return {
        users: parsed.users || [],
        fingerprints: parsed.fingerprints || [],
        lastSyncedAt: parsed.lastSyncedAt || null,
      };
    } catch (e) {
      console.warn("Failed to parse cached checkin data:", e);
    }
  }
  return {
    users: [],
    fingerprints: [],
    lastSyncedAt: null,
  };
};

const liveUserValidation = async (cachedUser: GymUser, set: any, get: any): Promise<GymUser | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second timeout

  try {
    const liveUser = await apiCall(`/users/${cachedUser.id}`, { signal: controller.signal });
    clearTimeout(timeoutId);

    // Patch the fresh record back into the cache
    const { users } = get();
    const updatedUsers = users.map((u: GymUser) => (u.id === liveUser.id ? liveUser : u));
    set({ users: updatedUsers });

    // Update localStorage
    const cachedDataStr = localStorage.getItem(STORAGE_KEY);
    if (cachedDataStr) {
      try {
        const cacheData = JSON.parse(cachedDataStr);
        cacheData.users = updatedUsers;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData));
      } catch (e) {
        console.warn("Failed to parse local storage for patching", e);
      }
    }

    // Synchronize to useUsersStore
    useUsersStore.setState((state) => ({
      users: state.users.map((u) => (u.id === liveUser.id ? liveUser : u)),
      selectedUser: state.selectedUser?.id === liveUser.id ? liveUser : state.selectedUser,
    }));

    return liveUser;
  } catch (error: any) {
    clearTimeout(timeoutId);

    // Confirmed 404
    if (error?.status === 404) {
      console.warn(`User ID ${cachedUser.id} not found on server (404). Treating as denied.`);
      return null; // Do not fallback to cached data, user is deleted/not found
    }

    // Network error or timeout (fail-open)
    console.warn(`Live validation failed for user ${cachedUser.id}, falling back to cache:`, error);
    return cachedUser;
  }
};

const initialData = loadInitialState();

export const useCheckinCacheStore = create<CheckinCacheState>((set, get) => ({
  ...initialData,
  isSyncing: false,
  error: null,

  syncCache: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true, error: null });
    try {
      // 1. Fetch all users page by page
      let allUsers: GymUser[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const response = await apiCall(`/users/${GYM_TYPE}?page=${page}&per_page=100`);
        if (response && response.users) {
          allUsers = [...allUsers, ...response.users];
          totalPages = response.total_pages || 1;
          page++;
        } else {
          break;
        }
      } while (page <= totalPages);

      // 2. Fetch all fingerprint enrollments
      const enrollResponse: EnrolledResponse = await apiCall(
        `/fingerprint/enrolled?gym_identifier=${GYM_IDENTIFIER}`
      );
      const fingerprints = enrollResponse?.enrollments || [];

      // 3. Save to state and localStorage
      const lastSyncedAt = Date.now();
      const cacheData: CheckinCacheData = {
        users: allUsers,
        fingerprints,
        lastSyncedAt,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData));

      set({
        users: allUsers,
        fingerprints,
        lastSyncedAt,
        isSyncing: false,
        error: null,
      });

      // Synchronize to useUsersStore
      useUsersStore.setState({
        users: allUsers,
        total: allUsers.length,
        totalPages: Math.max(1, Math.ceil(allUsers.length / 20)),
      });
    } catch (err: any) {
      console.error("Cache sync failed:", err);
      set({
        isSyncing: false,
        error: err.message || "Failed to sync cache from server",
      });
    }
  },

  lookupByPin: async (pin: string) => {
    const { fingerprints, users } = get();
    // 1. Search in cached fingerprints
    const enrollment = fingerprints.find(f => f.zk_pin === pin && f.is_active);
    
    if (enrollment) {
      // Find matching user in cached users list
      const cachedUser = users.find(u => u.id === enrollment.user_id);
      if (cachedUser) {
        return await liveUserValidation(cachedUser, set, get);
      }
      // Stale cache: enrollment exists but user is not in cached users list,
      // fallback to live single lookup!
    }

    // 2. Fallback to live single lookup
    try {
      let deviceSerial = enrollment?.device_serial;
      if (!deviceSerial) {
        const status = await apiCall(`/fingerprint/status?gym_identifier=${GYM_IDENTIFIER}`);
        deviceSerial = status?.device_serial;
      }
      
      if (!deviceSerial) {
        throw new Error("No device serial number available for fingerprint lookup");
      }

      const lookupResponse = await apiCall(`/fingerprint/lookup?pin=${pin}&device_serial=${deviceSerial}`);
      if (lookupResponse?.success && lookupResponse?.data) {
        const user = await apiCall(`/users/${lookupResponse.data.user_id}`);
        return user;
      }
    } catch (e) {
      console.warn("Live PIN lookup failed:", e);
    }
    return null;
  },

  lookupByQrId: async (qrId: string) => {
    const { users } = get();
    // 1. Search in cached users list (matches QR code ID, username, email, or phone)
    const cleanQrId = qrId.trim().toLowerCase();
    const cachedUser = users.find(u => 
      u.qr_code?.unique_id?.toLowerCase() === cleanQrId ||
      u.username?.toLowerCase() === cleanQrId ||
      u.email?.toLowerCase() === cleanQrId ||
      u.phone?.replace(/[^0-9]/g, '') === cleanQrId.replace(/[^0-9]/g, '')
    );

    if (cachedUser) {
      return await liveUserValidation(cachedUser, set, get);
    }

    // 2. Fallback to live lookup
    try {
      const lookupResponse = await apiCall(`/qr/lookup?unique_id=${qrId}`);
      if (lookupResponse?.success && lookupResponse?.user_found && lookupResponse?.user) {
        const user = await apiCall(`/users/${lookupResponse.user.id}`);
        return user;
      }
    } catch (e) {
      console.warn("Live QR lookup failed:", e);
    }
    return null;
  },

  lookupById: async (userId: number) => {
    const { users } = get();
    // 1. Local cache first — fetch live status before returning
    const cachedUser = users.find((u) => u.id === userId);
    if (cachedUser) {
      return await liveUserValidation(cachedUser, set, get);
    }

    // 2. Fallback: live single-user fetch (covers members not yet in the
    //    gym-one cache, e.g. a Gym Two member).
    try {
      const user = await apiCall(`/users/${userId}`);
      return user || null;
    } catch (e) {
      console.warn("Live user-ID lookup failed:", e);
      return null;
    }
  },

  clearCache: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({
      users: [],
      fingerprints: [],
      lastSyncedAt: null,
      error: null,
    });
  },

  enrollFingerprint: async (userId: number, zkPin: string, deviceSerial: string) => {
    const response = await apiCall("/fingerprint/enroll", {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        zk_pin: zkPin,
        device_serial: deviceSerial,
        gym_identifier: GYM_IDENTIFIER,
      }),
    });

    // Fetch only the updated fingerprint list
    const enrollResponse: EnrolledResponse = await apiCall(
      `/fingerprint/enrolled?gym_identifier=${GYM_IDENTIFIER}`
    );
    const fingerprints = enrollResponse?.enrollments || [];

    // Save to localStorage to keep cache persistence consistent
    const currentCache = localStorage.getItem(STORAGE_KEY);
    let cacheData: CheckinCacheData = { users: get().users, fingerprints, lastSyncedAt: Date.now() };
    if (currentCache) {
      try {
        const parsed = JSON.parse(currentCache);
        cacheData.users = parsed.users || [];
      } catch (e) {
        console.warn("Failed to parse current checkin cache:", e);
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData));

    set({ fingerprints });
    return response;
  },

  deleteFingerprint: async (userId: number, deviceSerial?: string) => {
    const queryParams = new URLSearchParams();
    if (deviceSerial) {
      queryParams.append("device_serial", deviceSerial);
    }
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

    const response = await apiCall(`/fingerprint/enroll/${userId}${queryString}`, {
      method: "DELETE",
    });

    // Fetch only the updated fingerprint list
    const enrollResponse: EnrolledResponse = await apiCall(
      `/fingerprint/enrolled?gym_identifier=${GYM_IDENTIFIER}`
    );
    const fingerprints = enrollResponse?.enrollments || [];

    // Save to localStorage
    const currentCache = localStorage.getItem(STORAGE_KEY);
    let cacheData: CheckinCacheData = { users: get().users, fingerprints, lastSyncedAt: Date.now() };
    if (currentCache) {
      try {
        const parsed = JSON.parse(currentCache);
        cacheData.users = parsed.users || [];
      } catch (e) {
        console.warn("Failed to parse current checkin cache:", e);
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData));

    set({ fingerprints });
    return response;
  },

  getDeviceStatus: async () => {
    return await apiCall(`/fingerprint/status?gym_identifier=${GYM_IDENTIFIER}`);
  }
}));

// Start background sync interval (every 5 minutes)
if (typeof window !== "undefined") {
  // Sync immediately on initial load to ensure fresh cache
  setTimeout(() => {
    useCheckinCacheStore.getState().syncCache().catch((err) => {
      console.warn("Initial cache sync failed:", err);
    });
  }, 1000);

  setInterval(() => {
    useCheckinCacheStore.getState().syncCache().catch((err) => {
      console.warn("Background cache sync failed:", err);
    });
  }, 5 * 60 * 1000);
}
