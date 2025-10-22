import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";

const BASE_URL = "https://afrgym.com.ng/wp-json/gym-admin/v1";

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  profileImage?: string;
}

interface LoginResponse {
  success: boolean;
  token: string;
  admin: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    full_name: string;
  };
  expires_in: number;
}

interface ValidateResponse {
  valid: boolean;
  admin: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    role: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isValidating: boolean; 
  isInitialized: boolean; 
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  validateToken: () => Promise<boolean>;
  clearError: () => void;
}

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
      isValidating: false,
      isInitialized: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const response: LoginResponse = await apiCall("/auth/login/gym-one", {
            method: "POST",
            body: JSON.stringify({ username, password }),
          });

          if (response.success) {
            const user: User = {
              id: parseInt(response.admin.id),
              username: response.admin.username,
              email: response.admin.email,
              first_name: response.admin.first_name,
              last_name: response.admin.last_name,
              full_name: response.admin.full_name,
              role: response.admin.role,
            };

            set({
              user,
              token: response.token,
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
              error: null,
            });
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
            isInitialized: true,
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
            isInitialized: true,
            error: null,
          });
        } catch (error) {
          console.warn("Logout API call failed:", error);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
            error: null,
          });
        }
      },

      validateToken: async () => {
        const { token } = get();

        if (!token) {
          set({
            isAuthenticated: false,
            user: null,
            isInitialized: true,
            isValidating: false,
          });
          return false;
        }

        set({ isValidating: true, error: null });

        try {
          const response: ValidateResponse = await apiCall("/auth/validate", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.valid && response.admin) {
            const user: User = {
              id: parseInt(response.admin.id),
              username: response.admin.username,
              email: response.admin.email,
              first_name: response.admin.first_name,
              last_name: response.admin.last_name,
              full_name: response.admin.full_name,
              role: response.admin.role,
            };

            set({
              user,
              isAuthenticated: true,
              isValidating: false,
              isInitialized: true,
              error: null,
            });
            return true;
          } else {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isValidating: false,
              isInitialized: true,
              error: "Session expired. Please login again.",
            });
            return false;
          }
        } catch (error) {
          console.warn("Token validation failed:", error);

          if (isTokenInvalidError(error)) {
            console.log("Invalid token detected, logging out user");
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isValidating: false,
              isInitialized: true,
              error: "Your session has expired. Please login again.",
            });
          } else {
            set({
              error: "Unable to validate session. Please try again.",
              isValidating: false,
              isInitialized: true,
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
      // Add onRehydrateStorage to handle initialization after hydration
      onRehydrateStorage: () => (state) => {
        // Don't set isInitialized here - let the hook handle it
        console.log("Auth store rehydrated");
      },
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
    if (isTokenInvalidError(error)) {
      console.log("Invalid token detected in API call, triggering logout");
      const { logout } = useAuthStore.getState();
      await logout();
    }
    throw error;
  }
};

// Improved hook to initialize auth state on app load
export const useInitializeAuth = () => {
  const { validateToken, isInitialized, isValidating, token } = useAuthStore();
  const [initComplete, setInitComplete] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      // Only run initialization once and if not already initialized
      if (!isInitialized && !isValidating) {
        try {
          await validateToken();
        } catch (error) {
          console.warn("Auth initialization failed:", error);
        } finally {
          setInitComplete(true);
        }
      } else if (isInitialized) {
        setInitComplete(true);
      }
    };

    initializeAuth();
  }, [validateToken, isInitialized, isValidating]);

  // Return loading state - true if validation is in progress or init not complete
  return {
    isInitializing: !initComplete || isValidating,
    isInitialized,
  };
};
