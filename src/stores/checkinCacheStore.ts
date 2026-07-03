import { create } from "zustand";
import { GymUser } from "./usersStore";

const BASE_URL = "https://afrgym.com.ng/wp-json/gym-admin/v1";
const STORAGE_KEY = "gym-one-checkin-cache";
const GYM_IDENTIFIER = "afrgym_one";
const GYM_TYPE = "gym_one";

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
  clearCache: () => void;
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

const initialData = loadInitialState();

export const useCheckinCacheStore = create<CheckinCacheState>((set, get) => ({
  ...initialData,
  isSyncing: false,
  error: null,

  syncCache: async () => {
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
        return cachedUser;
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
      return cachedUser;
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

  clearCache: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({
      users: [],
      fingerprints: [],
      lastSyncedAt: null,
      error: null,
    });
  }
}));

// Start background sync interval (every 3 minutes)
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
  }, 3 * 60 * 1000);
}
