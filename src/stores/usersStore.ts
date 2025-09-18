import { create } from "zustand";
import { useEffect } from "react";

const BASE_URL = "https://afrgym.com.ng/wp-json/gym-admin/v1";

export interface GymUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  registered: string;
  membership: {
    status?: string;
    level_id?: string;
    level_name: string;
    description?: string;
    expiry_date: string | null;
    start_date: string | null;
    is_active: boolean;
  };
  avatar_url: string;
  qr_code: {
    has_qr_code: boolean;
    unique_id: string | null;
    qr_code_url: string | null;
    generated_by: string | null;
  };
  notes?: unknown[];
}

export interface CreateUserPayload {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  level_id?: number;
  start_date?: string;
  end_date?: string;
}

export interface UpdateUserPayload {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  level_id?: number;
  start_date?: string;
  end_date?: string;
}

// QR Code related interfaces
export interface QRCodeData {
  success: boolean;
  user_id: number;
  unique_id: string;
  qr_code_url: string;
  has_qr_code: boolean;
  generated_by: string;
}

export interface GenerateQRCodeResponse {
  success: boolean;
  message: string;
  user_id: number;
  unique_id: string;
  qr_code_url: string;
  email_sent: boolean;
  action: "created" | "updated";
  generated_by: string;
}

export interface QRCodeUser {
  id: number;
  name: string;
  email: string;
  first_name: string;
  last_name: string;
  membership: {
    plan: string;
    status: string;
    expiry_date: string | null;
  };
  unique_id: string;
  phone: string;
}

export interface QRCodeLookupResponse {
  success: boolean;
  user_found: boolean;
  user: QRCodeUser;
}

export interface QRCodeStatistics {
  success: boolean;
  statistics: {
    total_users: number;
    users_with_qr: number;
    users_without_qr: number;
    coverage_percentage: number;
    recent_generated: number;
    ben_plugin_active: boolean;
  };
}

interface UsersResponse {
  users: GymUser[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface CreateUserResponse {
  success: boolean;
  user: GymUser;
  message: string;
  qr_code?: unknown;
  membership?: unknown;
  debug?: unknown;
}

interface UpdateUserResponse {
  success: boolean;
  user: GymUser;
  message: string;
  updated_fields?: string[];
  membership_updated?: boolean;
}

interface DeleteUserResponse {
  success: boolean;
  message: string;
}

interface UsersState {
  users: GymUser[];
  loading: boolean;
  selectedUser: GymUser | null;
  searchTerm: string;
  filterStatus: string;
  currentPage: number;
  totalPages: number;
  total: number;
  error: string | null;

  // QR Code related state
  qrCodeStatistics: QRCodeStatistics["statistics"] | null;
  qrCodeLoading: boolean;

  // Actions
  fetchUsers: (page?: number, search?: string) => Promise<void>;
  fetchSingleUser: (id: number) => Promise<GymUser>;
  addUser: (user: CreateUserPayload) => Promise<GymUser>;
  updateUser: (id: number, user: UpdateUserPayload) => Promise<GymUser>;
  deleteUser: (id: number) => Promise<void>;
  selectUser: (user: GymUser | null) => void;
  setSearchTerm: (term: string) => void;
  setFilterStatus: (status: string) => void;
  setCurrentPage: (page: number) => void;
  getFilteredUsers: () => GymUser[];
  clearError: () => void;

  // QR Code Actions
  getUserQRCode: (id: number) => Promise<QRCodeData>;
  generateUserQRCode: (id: number) => Promise<GenerateQRCodeResponse>;
  lookupUserByQRCode: (uniqueId: string) => Promise<QRCodeLookupResponse>;
  searchUsersByQRCode: (qrCode: string, page?: number) => Promise<void>;
  getQRCodeStatistics: () => Promise<QRCodeStatistics["statistics"]>;
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

  // You can also dispatch a custom event to notify other parts of your app
  window.dispatchEvent(
    new CustomEvent("auth:logout", {
      detail: { reason: "token_invalid" },
    })
  );

  // Redirect to login page
  // Adjust the path based on your routing setup
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

export const useUsersStore = create<UsersState>((set, get) => ({
  users: [],
  loading: false,
  selectedUser: null,
  searchTerm: "",
  filterStatus: "all",
  currentPage: 1,
  totalPages: 1,
  total: 0,
  error: null,
  qrCodeStatistics: null,
  qrCodeLoading: false,

  fetchUsers: async (page = 1, search = "") => {
    set({ loading: true, error: null });

    try {
      const queryParams = new URLSearchParams();
      queryParams.append("page", page.toString());
      queryParams.append("per_page", "20");

      if (search) {
        queryParams.append("search", search);
      }

      const response: UsersResponse = await apiCall(`/users?${queryParams}`);

      set({
        users: response.users,
        total: response.total,
        currentPage: response.page,
        totalPages: response.total_pages,
        loading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch users";
      set({
        loading: false,
        error: errorMessage,
        users: [],
        total: 0,
        totalPages: 1,
      });

      // Don't throw error if it's a token issue (user will be redirected)
      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
    }
  },

  fetchSingleUser: async (id: number) => {
    set({ loading: true, error: null });

    try {
      const user: GymUser = await apiCall(`/users/${id}`);
      set({ loading: false, error: null });
      return user;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch user";
      set({ loading: false, error: errorMessage });

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
      throw new Error(errorMessage);
    }
  },

  addUser: async (userData: CreateUserPayload) => {
    set({ loading: true, error: null });

    try {
      const response: CreateUserResponse = await apiCall("/users", {
        method: "POST",
        body: JSON.stringify(userData),
      });

      if (response.success) {
        const { users } = get();
        set({
          users: [response.user, ...users],
          loading: false,
          error: null,
        });
        return response.user;
      } else {
        throw new Error("Failed to create user");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create user";
      set({ loading: false, error: errorMessage });

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
      throw new Error(errorMessage);
    }
  },

  updateUser: async (id: number, userData: UpdateUserPayload) => {
    set({ loading: true, error: null });

    try {
      const response: UpdateUserResponse = await apiCall(`/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(userData),
      });

      if (response.success) {
        const { users, selectedUser } = get();
        const updatedUsers = users.map((user) =>
          user.id === id ? response.user : user
        );

        set({
          users: updatedUsers,
          selectedUser: selectedUser?.id === id ? response.user : selectedUser,
          loading: false,
          error: null,
        });

        return response.user;
      } else {
        throw new Error("Failed to update user");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update user";
      set({ loading: false, error: errorMessage });

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
      throw new Error(errorMessage);
    }
  },

  deleteUser: async (id: number) => {
    set({ loading: true, error: null });

    try {
      const response: DeleteUserResponse = await apiCall(`/users/${id}`, {
        method: "DELETE",
      });

      if (response.success) {
        const { users, selectedUser } = get();
        const filteredUsers = users.filter((user) => user.id !== id);

        set({
          users: filteredUsers,
          selectedUser: selectedUser?.id === id ? null : selectedUser,
          loading: false,
          error: null,
        });
      } else {
        throw new Error("Failed to delete user");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete user";
      set({ loading: false, error: errorMessage });

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
    }
  },

  selectUser: (user) => set({ selectedUser: user }),

  setSearchTerm: (term) => {
    set({ searchTerm: term });
    // Automatically fetch users when search term changes
    const { fetchUsers } = get();
    fetchUsers(1, term); // Reset to page 1 when searching
  },

  setFilterStatus: (status) => set({ filterStatus: status }),

  setCurrentPage: (page) => {
    set({ currentPage: page });
    // Fetch users for the new page
    const { fetchUsers, searchTerm } = get();
    fetchUsers(page, searchTerm);
  },

  getFilteredUsers: () => {
    const { users, searchTerm, filterStatus } = get();

    return users.filter((user) => {
      const matchesSearch =
        !searchTerm ||
        user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.qr_code.unique_id
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesFilter =
        filterStatus === "all" ||
        (filterStatus === "active" && user.membership.is_active) ||
        (filterStatus === "inactive" && !user.membership.is_active) ||
        (filterStatus === "no_membership" &&
          user.membership.status === "no_membership");

      return matchesSearch && matchesFilter;
    });
  },

  clearError: () => set({ error: null }),

  // QR Code Actions
  getUserQRCode: async (id: number) => {
    set({ qrCodeLoading: true, error: null });

    try {
      const qrCodeData: QRCodeData = await apiCall(`/qr/user/${id}`);
      set({ qrCodeLoading: false, error: null });
      return qrCodeData;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch QR code";
      set({ qrCodeLoading: false, error: errorMessage });

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
      throw new Error(errorMessage);
    }
  },

  generateUserQRCode: async (id: number) => {
    set({ qrCodeLoading: true, error: null });

    try {
      const response: GenerateQRCodeResponse = await apiCall(
        `/qr/generate/${id}`,
        {
          method: "POST",
        }
      );

      if (response.success) {
        // Update the user in the users array with new QR code data
        const { users, selectedUser } = get();
        const updatedUsers = users.map((user) => {
          if (user.id === id) {
            return {
              ...user,
              qr_code: {
                has_qr_code: true,
                unique_id: response.unique_id,
                qr_code_url: response.qr_code_url,
                generated_by: response.generated_by,
              },
            };
          }
          return user;
        });

        // Update selected user if it's the same user
        const updatedSelectedUser =
          selectedUser?.id === id
            ? {
                ...selectedUser,
                qr_code: {
                  has_qr_code: true,
                  unique_id: response.unique_id,
                  qr_code_url: response.qr_code_url,
                  generated_by: response.generated_by,
                },
              }
            : selectedUser;

        set({
          users: updatedUsers,
          selectedUser: updatedSelectedUser,
          qrCodeLoading: false,
          error: null,
        });

        return response;
      } else {
        throw new Error("Failed to generate QR code");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate QR code";
      set({ qrCodeLoading: false, error: errorMessage });

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
      throw new Error(errorMessage);
    }
  },

  lookupUserByQRCode: async (uniqueId: string) => {
    set({ qrCodeLoading: true, error: null });

    try {
      const response: QRCodeLookupResponse = await apiCall(
        `/qr/lookup?unique_id=${encodeURIComponent(uniqueId)}`
      );
      set({ qrCodeLoading: false, error: null });
      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to lookup user";
      set({ qrCodeLoading: false, error: errorMessage });

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
      throw new Error(errorMessage);
    }
  },

  searchUsersByQRCode: async (qrCode: string, page = 1) => {
    set({ loading: true, error: null });

    try {
      const queryParams = new URLSearchParams();
      queryParams.append("qr_code", qrCode);
      queryParams.append("page", page.toString());
      queryParams.append("per_page", "20");

      const response: UsersResponse = await apiCall(`/users?${queryParams}`);

      set({
        users: response.users,
        total: response.total,
        currentPage: response.page,
        totalPages: response.total_pages,
        loading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to search users by QR code";
      set({
        loading: false,
        error: errorMessage,
        users: [],
        total: 0,
        totalPages: 1,
      });

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
    }
  },

  getQRCodeStatistics: async () => {
    set({ qrCodeLoading: true, error: null });

    try {
      const response: QRCodeStatistics = await apiCall("/qr/statistics");

      if (response.success) {
        set({
          qrCodeStatistics: response.statistics,
          qrCodeLoading: false,
          error: null,
        });
        return response.statistics;
      } else {
        throw new Error("Failed to fetch QR code statistics");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch QR code statistics";
      set({ qrCodeLoading: false, error: errorMessage });

      if (!isTokenInvalidError(error)) {
        throw new Error(errorMessage);
      }
      throw new Error(errorMessage);
    }
  },
}));

// Utility functions for easier usage
export const getMembershipStatusDisplay = (user: GymUser): string => {
  if (
    !user.membership.is_active ||
    user.membership.status === "no_membership"
  ) {
    return "No Membership";
  }
  return user.membership.level_name;
};

export const getMembershipStatusColor = (user: GymUser): string => {
  if (
    !user.membership.is_active ||
    user.membership.status === "no_membership"
  ) {
    return "gray";
  }

  if (user.membership.expiry_date) {
    const expiryDate = new Date(user.membership.expiry_date);
    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry <= 7) return "red";
    if (daysUntilExpiry <= 30) return "orange";
  }

  return "green";
};

export const formatDate = (dateString: string | null): string => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString();
};

// QR Code utility functions
export const hasQRCode = (user: GymUser): boolean => {
  return user.qr_code.has_qr_code && !!user.qr_code.unique_id;
};

export const getQRCodeDisplay = (user: GymUser): string => {
  return hasQRCode(user) ? user.qr_code.unique_id! : "No QR Code";
};

export const formatQRCodeStatistics = (
  stats: QRCodeStatistics["statistics"]
) => {
  return {
    totalUsers: stats.total_users,
    withQRCode: stats.users_with_qr,
    withoutQRCode: stats.users_without_qr,
    coveragePercentage: `${stats.coverage_percentage.toFixed(1)}%`,
    recentGenerated: stats.recent_generated,
    pluginActive: stats.ben_plugin_active,
  };
};

// Hook to listen for auth logout events
export const useAuthLogoutListener = (onLogout?: () => void) => {
  useEffect(() => {
    const handleLogout = (event: CustomEvent) => {
      console.log("Auth logout detected:", event.detail);
      if (onLogout) {
        onLogout();
      }
    };

    window.addEventListener("auth:logout", handleLogout as EventListener);

    return () => {
      window.removeEventListener("auth:logout", handleLogout as EventListener);
    };
  }, [onLogout]);
};
