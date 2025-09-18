import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect } from "react";

const BASE_URL = "https://afrgym.com.ng/wp-json/gym-admin/v1";

export interface User {
  id: number;
  username: string;
  email: string;
  display_name: string;
  roles: string[];
  profileImage?: string;
}

interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    display_name: string;
  };
  expires_in: number;
}

interface LogoutResponse {
  success: boolean;
  message: string;
}

interface ValidateResponse {
  valid: boolean;
  user: {
    id: number;
    username: string;
    email: string;
    display_name: string;
    roles: string[];
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  validateToken: () => Promise<boolean>;
  clearError: () => void;
}

// Helper function to check if error is related to invalid token
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isTokenInvalidError = (error: any): boolean => {
  if (error?.code === "jwt_auth_invalid_token") return true;
  if (error?.data?.status === 403) return true;
  if (error?.message?.toLowerCase().includes("token is invalid")) return true;
  if (error?.message?.toLowerCase().includes("unauthorized")) return true;
  if (error?.message?.toLowerCase().includes("forbidden")) return true;
  return false;
};

// Helper function for API calls
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${BASE_URL}${endpoint}`;

  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, defaultOptions);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = {
      ...errorData,
      status: response.status,
      statusText: response.statusText,
    };
    throw error;
  }

  return response.json();
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const response: LoginResponse = await apiCall("/auth/login", {
            method: "POST",
            body: JSON.stringify({ username, password }),
          });

          if (response.success) {
            const user: User = {
              id: response.user.id,
              username: response.user.username,
              email: response.user.email,
              display_name: response.user.display_name,
              roles: [], // Will be populated when we validate the token
            };

            set({
              user,
              token: response.token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            // Validate token to get full user data including roles
            await get().validateToken();
          } else {
            throw new Error("Login failed");
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Login failed";
          set({
            isLoading: false,
            error: errorMessage,
            user: null,
            token: null,
            isAuthenticated: false,
          });
          throw new Error(errorMessage);
        }
      },

      logout: async () => {
        const { token } = get();

        set({ isLoading: true, error: null });

        try {
          if (token) {
            await apiCall("/auth/logout", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
          }

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          // Even if logout fails on server, clear local state
          console.warn("Logout API call failed:", error);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      validateToken: async () => {
        const { token } = get();

        if (!token) {
          set({ isAuthenticated: false, user: null });
          return false;
        }

        try {
          const response: ValidateResponse = await apiCall("/auth/validate", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.valid && response.user) {
            const user: User = {
              id: response.user.id,
              username: response.user.username,
              email: response.user.email,
              display_name: response.user.display_name,
              roles: response.user.roles,
            };

            set({
              user,
              isAuthenticated: true,
              error: null,
            });
            return true;
          } else {
            // Invalid token response - logout user
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              error: "Session expired. Please login again.",
            });
            return false;
          }
        } catch (error) {
          console.warn("Token validation failed:", error);

          // Check if the error is due to invalid token
          if (isTokenInvalidError(error)) {
            console.log("Invalid token detected, logging out user");
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              error: "Your session has expired. Please login again.",
            });
          } else {
            // For other errors, just set error without logging out
            set({
              error: "Unable to validate session. Please try again.",
            });
          }
          return false;
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "gym-auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Enhanced API call wrapper that automatically handles token invalidation
export const apiCallWithAuth = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  try {
    return await apiCall(endpoint, options);
  } catch (error) {
    // Check if the error is due to invalid token
    if (isTokenInvalidError(error)) {
      console.log("Invalid token detected in API call, triggering logout");
      // Get the current auth store state and trigger logout
      const { logout } = useAuthStore.getState();
      await logout();
    }
    throw error;
  }
};

// Hook to initialize auth state on app load
export const useInitializeAuth = () => {
  const validateToken = useAuthStore((state) => state.validateToken);

  useEffect(() => {
    validateToken();
  }, [validateToken]);
};
