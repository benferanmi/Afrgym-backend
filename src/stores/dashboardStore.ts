/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from "react";
import { create } from "zustand";

const BASE_URL = "https://afrgym.com.ng/wp-json/gym-admin/v1";

// API Response Types based on your backend
export interface SummaryStats {
  total_users: number;
  total_active_members: number;
  total_expired_members: number;
  total_paused_members: number;
  users_with_qr_codes: number;
  emails_sent_last_30_days: number;
  membership_levels_count: number;
  overall_health_score: number;
}

export interface MembershipBreakdown {
  by_level: Array<{
    level_id: string;
    level_name: string;
    member_count: number;
    percentage: number;
  }>;
  summary: {
    total_members: number;
    active_members: number;
    expired_members: number;
    paused_members: number;
  };
}

export interface GrowthTrend {
  month: string;
  month_name: string;
  new_users: number;
  new_memberships: number;
  total_activities: number;
}

export interface RecentActivity {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  admin_name: string;
  activity: string;
  date: string;
  activity_type: string;
}

export interface PauseStats {
  currently_paused: number;
  pauses_this_month: number;
  unpauses_this_month: number;
  net_pauses_this_month: number;
}

export interface ExpiringStats {
  expiring_in_7_days: number;
  expiring_in_30_days: number;
  urgent_renewals: Array<any>;
  needs_attention: boolean;
}

export interface DailyStats {
  date: string;
  new_user_registrations: number;
  new_membership_assignments: number;
  membership_updates: number;
  qr_codes_generated: number;
  emails_sent: number;
  membership_pauses: number;
  total_activities: number;
}

// Component Loading States
interface ComponentLoadingStates {
  summary: boolean;
  membership: boolean;
  growth: boolean;
  activities: boolean;
  pauses: boolean;
  expiring: boolean;
  daily: boolean;
  overview: boolean; // Added for dashboard overview
}

// Enhanced error state with specific error messages
interface ComponentErrorStates {
  summary: string | null;
  membership: string | null;
  growth: string | null;
  activities: string | null;
  pauses: string | null;
  expiring: string | null;
  daily: string | null;
  overview: string | null;
}

interface DashboardState {
  // Data States
  summaryStats: SummaryStats | null;
  membershipBreakdown: MembershipBreakdown | null;
  growthTrends: GrowthTrend[];
  recentActivities: RecentActivity[];
  pauseStats: PauseStats | null;
  expiringStats: ExpiringStats | null;
  dailyStats: DailyStats | null;

  // Loading States for individual components
  loading: ComponentLoadingStates;

  // Enhanced Error States with specific messages
  errors: ComponentErrorStates;

  // Last fetch timestamps for cache management
  lastFetch: {
    summary: number | null;
    membership: number | null;
    growth: number | null;
    activities: number | null;
    pauses: number | null;
    expiring: number | null;
    daily: number | null;
    overview: number | null;
  };

  // Actions
  fetchSummaryStats: (force?: boolean) => Promise<void>;
  fetchMembershipStats: (force?: boolean) => Promise<void>;
  fetchGrowthTrends: (force?: boolean) => Promise<void>;
  fetchRecentActivities: (limit?: number, force?: boolean) => Promise<void>;
  fetchPauseStats: (force?: boolean) => Promise<void>;
  fetchExpiringStats: (days?: number, force?: boolean) => Promise<void>;
  fetchDailyStats: (date?: string, force?: boolean) => Promise<void>;
  fetchDashboardOverview: (force?: boolean) => Promise<void>;

  // Utility actions
  resetErrors: () => void;
  resetAllData: () => void;
  setComponentLoading: (
    component: keyof ComponentLoadingStates,
    loading: boolean
  ) => void;
  setComponentError: (
    component: keyof ComponentErrorStates,
    error: string | null
  ) => void;
  refreshAll: () => Promise<void>;
  
  // Cache management
  shouldRefetch: (component: keyof ComponentLoadingStates, cacheMinutes?: number) => boolean;
}

// Helper function to check if error is related to invalid token
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

  // Clear auth storage
  localStorage.removeItem("gym-auth-storage");

  // Dispatch custom event to notify other parts of your app
  window.dispatchEvent(
    new CustomEvent("auth:logout", {
      detail: { reason: "token_invalid" },
    })
  );

  // Redirect to login page
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
};

// Enhanced API call function with automatic logout on invalid token
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${BASE_URL}${endpoint}`;

  // Get token from auth store
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

      // Check if it's a token invalid error
      if (isTokenInvalidError(error)) {
        await handleTokenInvalidation();
        throw new Error("Your session has expired. Please login again.");
      }

      throw error;
    }

    return response.json();
  } catch (error) {
    // Check for network errors that might also indicate auth issues
    if (isTokenInvalidError(error)) {
      await handleTokenInvalidation();
      throw new Error("Your session has expired. Please login again.");
    }

    throw error;
  }
};

export const useDashboardStore = create<DashboardState>((set, get) => ({
  // Initial States
  summaryStats: null,
  membershipBreakdown: null,
  growthTrends: [],
  recentActivities: [],
  pauseStats: null,
  expiringStats: null,
  dailyStats: null,

  loading: {
    summary: false,
    membership: false,
    growth: false,
    activities: false,
    pauses: false,
    expiring: false,
    daily: false,
    overview: false,
  },

  errors: {
    summary: null,
    membership: null,
    growth: null,
    activities: null,
    pauses: null,
    expiring: null,
    daily: null,
    overview: null,
  },

  lastFetch: {
    summary: null,
    membership: null,
    growth: null,
    activities: null,
    pauses: null,
    expiring: null,
    daily: null,
    overview: null,
  },

  setComponentLoading: (component, loading) => {
    set((state) => ({
      loading: { ...state.loading, [component]: loading },
    }));
  },

  setComponentError: (component, error) => {
    set((state) => ({
      errors: { ...state.errors, [component]: error },
    }));
  },

  resetErrors: () => 
    set({ 
      errors: {
        summary: null,
        membership: null,
        growth: null,
        activities: null,
        pauses: null,
        expiring: null,
        daily: null,
        overview: null,
      }
    }),

  resetAllData: () =>
    set({
      summaryStats: null,
      membershipBreakdown: null,
      growthTrends: [],
      recentActivities: [],
      pauseStats: null,
      expiringStats: null,
      dailyStats: null,
      lastFetch: {
        summary: null,
        membership: null,
        growth: null,
        activities: null,
        pauses: null,
        expiring: null,
        daily: null,
        overview: null,
      },
    }),

  shouldRefetch: (component, cacheMinutes = 5) => {
    const { lastFetch } = get();
    const lastFetchTime = lastFetch[component];
    
    if (!lastFetchTime) return true;
    
    const now = Date.now();
    const cacheExpiry = cacheMinutes * 60 * 1000; // Convert to milliseconds
    
    return (now - lastFetchTime) > cacheExpiry;
  },

  fetchSummaryStats: async (force = false) => {
    const { setComponentLoading, setComponentError, shouldRefetch } = get();
    
    if (!force && !shouldRefetch('summary')) {
      return; // Use cached data
    }

    setComponentLoading("summary", true);
    setComponentError("summary", null);

    try {
      const result = await apiCall("/stats/summary");

      if (result.success) {
        set({ 
          summaryStats: result.data,
          lastFetch: { ...get().lastFetch, summary: Date.now() }
        });
      } else {
        throw new Error(result.message || "Failed to load summary stats");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch summary stats";
      console.error("Summary stats error:", error);
      setComponentError("summary", errorMessage);

      // Don't throw if token is invalid (user will be redirected)
      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
    } finally {
      setComponentLoading("summary", false);
    }
  },

  fetchMembershipStats: async (force = false) => {
    const { setComponentLoading, setComponentError, shouldRefetch } = get();
    
    if (!force && !shouldRefetch('membership')) {
      return;
    }

    setComponentLoading("membership", true);
    setComponentError("membership", null);

    try {
      const result = await apiCall("/stats/memberships");

      if (result.success) {
        set({ 
          membershipBreakdown: result.data,
          lastFetch: { ...get().lastFetch, membership: Date.now() }
        });
      } else {
        throw new Error(result.message || "Failed to load membership stats");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch membership stats";
      console.error("Membership stats error:", error);
      setComponentError("membership", errorMessage);

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
    } finally {
      setComponentLoading("membership", false);
    }
  },

  fetchGrowthTrends: async (force = false) => {
    const { setComponentLoading, setComponentError, shouldRefetch } = get();
    
    if (!force && !shouldRefetch('growth')) {
      return;
    }

    setComponentLoading("growth", true);
    setComponentError("growth", null);

    try {
      const result = await apiCall("/stats/growth");

      if (result.success) {
        set({ 
          growthTrends: result.data,
          lastFetch: { ...get().lastFetch, growth: Date.now() }
        });
      } else {
        throw new Error(result.message || "Failed to load growth trends");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch growth trends";
      console.error("Growth trends error:", error);
      setComponentError("growth", errorMessage);

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
    } finally {
      setComponentLoading("growth", false);
    }
  },

  fetchRecentActivities: async (limit = 10, force = false) => {
    const { setComponentLoading, setComponentError, shouldRefetch } = get();
    
    if (!force && !shouldRefetch('activities', 2)) { // Shorter cache for activities
      return;
    }

    setComponentLoading("activities", true);
    setComponentError("activities", null);

    try {
      const result = await apiCall(`/stats/activities?limit=${limit}`);

      if (result.success) {
        set({ 
          recentActivities: result.data,
          lastFetch: { ...get().lastFetch, activities: Date.now() }
        });
      } else {
        throw new Error(result.message || "Failed to load activities");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch recent activities";
      console.error("Recent activities error:", error);
      setComponentError("activities", errorMessage);

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
    } finally {
      setComponentLoading("activities", false);
    }
  },

  fetchPauseStats: async (force = false) => {
    const { setComponentLoading, setComponentError, shouldRefetch } = get();
    
    if (!force && !shouldRefetch('pauses')) {
      return;
    }

    setComponentLoading("pauses", true);
    setComponentError("pauses", null);

    try {
      const result = await apiCall("/stats/pauses");

      if (result.success) {
        set({ 
          pauseStats: result.data,
          lastFetch: { ...get().lastFetch, pauses: Date.now() }
        });
      } else {
        throw new Error(result.message || "Failed to load pause stats");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch pause stats";
      console.error("Pause stats error:", error);
      setComponentError("pauses", errorMessage);

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
    } finally {
      setComponentLoading("pauses", false);
    }
  },

  fetchExpiringStats: async (days = 7, force = false) => {
    const { setComponentLoading, setComponentError, shouldRefetch } = get();
    
    if (!force && !shouldRefetch('expiring')) {
      return;
    }

    setComponentLoading("expiring", true);
    setComponentError("expiring", null);

    try {
      const result = await apiCall(`/stats/expiring?days=${days}`);

      if (result.success) {
        set({ 
          expiringStats: result.data,
          lastFetch: { ...get().lastFetch, expiring: Date.now() }
        });
      } else {
        throw new Error(result.message || "Failed to load expiring stats");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch expiring stats";
      console.error("Expiring stats error:", error);
      setComponentError("expiring", errorMessage);

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
    } finally {
      setComponentLoading("expiring", false);
    }
  },

  fetchDailyStats: async (date?: string, force = false) => {
    const { setComponentLoading, setComponentError, shouldRefetch } = get();
    
    if (!force && !shouldRefetch('daily', 10)) { // Longer cache for daily stats
      return;
    }

    setComponentLoading("daily", true);
    setComponentError("daily", null);

    try {
      const url = date
        ? `/stats/daily?date=${date}`
        : "/stats/daily";

      const result = await apiCall(url);

      if (result.success) {
        set({ 
          dailyStats: result.data,
          lastFetch: { ...get().lastFetch, daily: Date.now() }
        });
      } else {
        throw new Error(result.message || "Failed to load daily stats");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch daily stats";
      console.error("Daily stats error:", error);
      setComponentError("daily", errorMessage);

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
    } finally {
      setComponentLoading("daily", false);
    }
  },

  fetchDashboardOverview: async (force = false) => {
    const { setComponentLoading, setComponentError, shouldRefetch } = get();
    
    if (!force && !shouldRefetch('overview')) {
      return;
    }

    setComponentLoading("overview", true);
    setComponentError("overview", null);

    try {
      const result = await apiCall("/stats/dashboard");

      if (result.success) {
        const { data } = result;
        const now = Date.now();

        set({
          summaryStats: data.summary,
          membershipBreakdown: data.membership_breakdown,
          growthTrends: data.growth_trends,
          recentActivities: data.recent_activities,
          pauseStats: data.pause_statistics,
          expiringStats: data.expiring_soon,
          dailyStats: data.daily_today,
          lastFetch: {
            summary: now,
            membership: now,
            growth: now,
            activities: now,
            pauses: now,
            expiring: now,
            daily: now,
            overview: now,
          }
        });
      } else {
        throw new Error(result.message || "Failed to load dashboard overview");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch dashboard overview";
      console.error("Dashboard overview error:", error);
      setComponentError("overview", errorMessage);

      // Set all components as having errors
      set({
        errors: {
          summary: errorMessage,
          membership: errorMessage,
          growth: errorMessage,
          activities: errorMessage,
          pauses: errorMessage,
          expiring: errorMessage,
          daily: errorMessage,
          overview: errorMessage,
        },
      });

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
    } finally {
      setComponentLoading("overview", false);
    }
  },

  refreshAll: async () => {
    const actions = [
      () => get().fetchSummaryStats(true),
      () => get().fetchMembershipStats(true),
      () => get().fetchGrowthTrends(true),
      () => get().fetchRecentActivities(10, true),
      () => get().fetchPauseStats(true),
      () => get().fetchExpiringStats(7, true),
      () => get().fetchDailyStats(undefined, true),
    ];

    // Execute all fetches in parallel
    await Promise.allSettled(actions.map(action => action()));
  },
}));

// Utility functions for formatting and display
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num);
};

export const formatPercentage = (num: number): string => {
  return `${num.toFixed(1)}%`;
};

export const formatDate = (dateString: string | null): string => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString();
};

export const formatDateTime = (dateString: string | null): string => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString();
};

export const getHealthScoreColor = (score: number): string => {
  if (score >= 90) return "green";
  if (score >= 70) return "yellow";
  if (score >= 50) return "orange";
  return "red";
};

export const getHealthScoreText = (score: number): string => {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  return "Needs Attention";
};

export const getTrendDirection = (
  currentValue: number,
  previousValue: number
): "up" | "down" | "stable" => {
  const difference = currentValue - previousValue;
  const threshold = Math.abs(previousValue) * 0.05; // 5% threshold

  if (Math.abs(difference) <= threshold) return "stable";
  return difference > 0 ? "up" : "down";
};

// Hook for dashboard data management
export const useDashboardData = (autoRefresh = true, refreshInterval = 5 * 60 * 1000) => {
  const store = useDashboardStore();

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      store.fetchDashboardOverview();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, store]);

  return store;
};