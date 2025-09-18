import { create } from "zustand";

const BASE_URL = "https://afrgym.com.ng/wp-json/gym-admin/v1";

export interface MembershipLevel {
  id: number;
  name: string;
  description: string;
  initial_payment: number;
  billing_amount: number;
  trial_amount: number;
  cycle_number: number;
  cycle_period: string;
  billing_limit: number;
  trial_limit: number;
  created_at: string;
  updated_at: string;
  status: "active" | "inactive";
}
interface byLevel {
  member_count: number;
  level_id: number;
  level_name: string;
}
export interface MembershipStatistics {
  total_levels: number;
  by_level: byLevel[];
  active_levels: number;
  active_members: number;
  total_members: number;
  expired_members: number;
  inactive_levels: number;
  active_memberships: number;
}

export interface MembershipPricingUpdate {
  initial_payment?: number;
  billing_amount?: number;
  trial_amount?: number;
  cycle_number?: number;
  cycle_period?: string;
  billing_limit?: number;
  trial_limit?: number;
}

export interface ExpiringMember {
  user_id: number;
  user_name: string;
  user_email: string;
  membership_level: string;
  expiry_date: string;
  days_remaining: number;
}

interface MembershipsResponse {
  membership_levels: MembershipLevel[];
  statistics: MembershipStatistics;
}

interface ExpiringMembersResponse {
  expiring_members: ExpiringMember[];
  count: number;
  days_ahead: number;
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

interface MembershipState {
  membershipLevels: MembershipLevel[];
  statistics: MembershipStatistics | null;
  expiringMembers: ExpiringMember[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchMemberships: () => Promise<void>;
  updateMembershipPricing: (
    levelId: number,
    pricing: MembershipPricingUpdate
  ) => Promise<void>;
  getExpiringMemberships: (days?: number) => Promise<void>;
  getMembershipStatistics: () => Promise<void>;
  clearError: () => void;
}

export const useMembershipStore = create<MembershipState>((set, get) => ({
  membershipLevels: [],
  statistics: null,
  expiringMembers: [],
  loading: false,
  error: null,

  fetchMemberships: async () => {
    set({ loading: true, error: null });

    try {
      const response: MembershipsResponse = await apiCall("/memberships");

      set({
        membershipLevels: response.membership_levels,
        statistics: response.statistics,
        loading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch memberships";
      set({
        loading: false,
        error: errorMessage,
        membershipLevels: [],
        statistics: null,
      });

      // Don't throw error if it's a token issue (user will be redirected)
      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
    }
  },

  updateMembershipPricing: async (
    levelId: number,
    pricing: MembershipPricingUpdate
  ) => {
    set({ loading: true, error: null });

    try {
      const response = await apiCall(`/memberships/${levelId}/pricing`, {
        method: "PUT",
        body: JSON.stringify(pricing),
      });

      // Update the membership level in the store
      const { membershipLevels } = get();
      const updatedLevels = membershipLevels.map((level) =>
        level.id === levelId
          ? {
              ...level,
              ...pricing,
              updated_at: new Date().toISOString(),
            }
          : level
      );

      set({
        membershipLevels: updatedLevels,
        loading: false,
        error: null,
      });

      // Refresh statistics
      await get().getMembershipStatistics();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update membership pricing";
      set({ loading: false, error: errorMessage });

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
      throw new Error(errorMessage);
    }
  },

  getExpiringMemberships: async (days = 7) => {
    set({ loading: true, error: null });

    try {
      const response: ExpiringMembersResponse = await apiCall(
        `/memberships/expiring?days=${days}`
      );

      set({
        expiringMembers: response.expiring_members,
        loading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch expiring memberships";
      set({
        loading: false,
        error: errorMessage,
        expiringMembers: [],
      });

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
    }
  },

  getMembershipStatistics: async () => {
    set({ loading: true, error: null });

    try {
      const response = await apiCall("/memberships/stats");

      set({
        statistics: response,
        loading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch membership statistics";
      set({
        loading: false,
        error: errorMessage,
      });

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
    }
  },

  clearError: () => set({ error: null }),
}));

// Utility functions for membership management
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(amount);
};

export const formatCyclePeriod = (
  cycleNumber: number,
  cyclePeriod: string
): string => {
  if (!cyclePeriod || cyclePeriod === "") return "One-time payment";

  const periodMap: { [key: string]: string } = {
    Day: cycleNumber === 1 ? "Daily" : `Every ${cycleNumber} days`,
    Week: cycleNumber === 1 ? "Weekly" : `Every ${cycleNumber} weeks`,
    Month: cycleNumber === 1 ? "Monthly" : `Every ${cycleNumber} months`,
    Year: cycleNumber === 1 ? "Yearly" : `Every ${cycleNumber} years`,
  };

  return (
    periodMap[cyclePeriod] ||
    `Every ${cycleNumber} ${cyclePeriod.toLowerCase()}s`
  );
};

export const getMembershipStatusColor = (level: MembershipLevel): string => {
  return level.status === "active" ? "green" : "gray";
};

export const calculateMembershipValue = (level: MembershipLevel): number => {
  // Calculate total value based on billing cycle
  if (!level.cycle_period || level.cycle_period === "") {
    return level.initial_payment;
  }

  const billingAmount = level.billing_amount || 0;
  const billingLimit = level.billing_limit || 12; // Default to 12 months if not specified

  return level.initial_payment + billingAmount * billingLimit;
};

export const getMembershipTypeByPrice = (
  level: MembershipLevel
): "basic" | "premium" | "vip" => {
  const monthlyAmount = level.billing_amount || level.initial_payment;

  if (monthlyAmount < 30000) return "basic";
  if (monthlyAmount < 60000) return "premium";
  return "vip";
};
