/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";

const BASE_URL = "https://afrgym.com.ng/wp-json/gym-admin/v1";

// Email Template Interfaces
export interface EmailTemplate {
  key: string;
  name: string;
  description: string;
  subject: string;
  variables: string[];
  content_preview: string;
  category: string;
}

export interface EmailTemplates {
  [key: string]: EmailTemplate;
}
export interface BulkEmailByCategoryPayload {
  recipient_type:
    | "all"
    | "active"
    | "inactive"
    | "expired"
    | "expiring_7days"
    | "expiring_30days"
    | "paused"
    | "membership";
  membership_level_ids?: string[];
  template?: string;
  custom_subject?: string;
  custom_content?: string;
  custom_data?: Record<string, any>;
}
// Email Payload Interfaces
export interface SingleEmailPayload {
  user_id: number;
  template?: string;
  custom_subject?: string;
  custom_content?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  custom_data?: Record<string, any>;
}

export interface BulkEmailPayload {
  user_ids: number[];
  template?: string;
  custom_subject?: string;
  custom_content?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  custom_data?: Record<string, any>;
}

// Email Response Interfaces
export interface SingleEmailResponse {
  success: boolean;
  message: string;
  log_id: number;
  recipient?: string;
  template?: string;
}

export interface BulkEmailResponse {
  success: boolean;
  results: {
    sent: number;
    failed: number;
    errors: Array<{
      user_id: number;
      error: string;
    }>;
  };
  total_attempted: number;
  sent: number;
  failed: number;
  invalid_users: number;
}

export interface EmailTemplatesResponse {
  templates: EmailTemplates;
  categories: Record<
    string,
    {
      name: string;
      templates: string[];
    }
  >;
}

export interface EmailPreviewPayload {
  template: string;
  user_id?: number;
  custom_subject?: string;
  custom_content?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  custom_data?: Record<string, any>;
}

export interface EmailPreviewResponse {
  subject: string;
  content: string;
  variables_used: string[];
  template_info: EmailTemplate;
  wrapped: boolean;
}

export interface TestEmailPayload {
  template: string;
  test_email: string;
}

export interface EmailStats {
  total_emails: number;
  by_status: Record<string, number>;
  by_template: Record<string, number>;
  daily_count: Array<{
    date: string;
    count: number;
  }>;
  delivery_rate: number;
  period_days: number;
  date_from: string;
}

// Email History Interface
export interface EmailLog {
  id: number;
  user_id: number;
  user_name: string;
  recipient_email: string;
  subject: string;
  template_name: string | null;
  status: "sent" | "pending" | "failed";
  sent_at: string | null;
  created_at: string;
  error_message: string | null;
}

export interface EmailLogsResponse {
  logs: EmailLog[];
  count: number;
  total_count: number;
  limit: number;
  offset: number;
  has_more: boolean;
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

// Enhanced API call function with automatic logout on invalid token
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

      throw new Error(
        error.message || `HTTP ${response.status}: ${response.statusText}`
      );
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

interface EmailState {
  // Data
  templates: EmailTemplates | null;
  templatesCategories: Record<
    string,
    { name: string; templates: string[] }
  > | null;
  emailLogs: EmailLog[];
  emailStats: EmailStats | null;

  // Loading states
  loading: boolean;
  sendingEmail: boolean;
  loadingPreview: boolean;
  loadingStats: boolean;

  // Error states
  error: string | null;

  // Pagination
  logsOffset: number;
  logsHasMore: boolean;

  // Actions
  fetchTemplates: () => Promise<EmailTemplatesResponse>;
  sendSingleEmail: (
    payload: SingleEmailPayload
  ) => Promise<SingleEmailResponse>;
  sendBulkEmail: (payload: BulkEmailPayload) => Promise<BulkEmailResponse>;
  previewEmail: (payload: EmailPreviewPayload) => Promise<EmailPreviewResponse>;
  sendTestEmail: (payload: TestEmailPayload) => Promise<void>;
  fetchEmailLogs: (
    offset?: number,
    limit?: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filters?: Record<string, any>
  ) => Promise<void>;
  fetchEmailStats: (period?: number) => Promise<void>;
  clearError: () => void;
  resetLogs: () => void;
  sendBulkEmailByCategory: (
    payload: BulkEmailByCategoryPayload
  ) => Promise<BulkEmailResponse>;
}

export const useEmailStore = create<EmailState>((set, get) => ({
  // Data
  templates: null,
  templatesCategories: null,
  emailLogs: [],
  emailStats: null,

  // Loading states
  loading: false,
  sendingEmail: false,
  loadingPreview: false,
  loadingStats: false,

  // Error states
  error: null,

  // Pagination
  logsOffset: 0,
  logsHasMore: false,

  fetchTemplates: async () => {
    set({ loading: true, error: null });

    try {
      const response: EmailTemplatesResponse = await apiCall(
        "/emails/templates"
      );

      set({
        templates: response.templates,
        templatesCategories: response.categories,
        loading: false,
        error: null,
      });

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch email templates";
      set({
        loading: false,
        error: errorMessage,
      });
      throw new Error(errorMessage);
    }
  },

  sendSingleEmail: async (payload: SingleEmailPayload) => {
    set({ sendingEmail: true, error: null });

    try {
      const response: SingleEmailResponse = await apiCall("/emails/send", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (response.success) {
        // Refresh logs after successful send
        setTimeout(() => {
          get().fetchEmailLogs();
        }, 1000);

        set({
          sendingEmail: false,
          error: null,
        });

        return response;
      } else {
        throw new Error(response.message || "Failed to send email");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send email";
      set({ sendingEmail: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  sendBulkEmailByCategory: async (payload: BulkEmailByCategoryPayload) => {
    set({ sendingEmail: true, error: null });

    try {
      const response: BulkEmailResponse = await apiCall(
        "/emails/bulk-by-category",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      if (response.success) {
        // Refresh logs and stats after successful send
        setTimeout(() => {
          get().fetchEmailLogs();
          get().fetchEmailStats();
        }, 1000);

        set({
          sendingEmail: false,
          error: null,
        });

        return response;
      } else {
        throw new Error("Failed to send bulk email by category");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send bulk email";
      set({ sendingEmail: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  sendBulkEmail: async (payload: BulkEmailPayload) => {
    set({ sendingEmail: true, error: null });

    try {
      const response: BulkEmailResponse = await apiCall("/emails/bulk", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (response.success) {
        // Refresh logs and stats after successful send
        setTimeout(() => {
          get().fetchEmailLogs();
          get().fetchEmailStats();
        }, 1000);

        set({
          sendingEmail: false,
          error: null,
        });

        return response;
      } else {
        throw new Error("Failed to send bulk email");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send bulk email";
      set({ sendingEmail: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  previewEmail: async (payload: EmailPreviewPayload) => {
    set({ loadingPreview: true, error: null });

    try {
      const response: EmailPreviewResponse = await apiCall("/emails/preview", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      set({
        loadingPreview: false,
        error: null,
      });

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to preview email";
      set({ loadingPreview: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  sendTestEmail: async (payload: TestEmailPayload) => {
    set({ sendingEmail: true, error: null });

    try {
      const response = await apiCall("/emails/test", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (response.success) {
        set({
          sendingEmail: false,
          error: null,
        });
      } else {
        throw new Error(response.message || "Failed to send test email");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send test email";
      set({ sendingEmail: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  fetchEmailLogs: async (offset = 0, limit = 20, filters = {}) => {
    set({ loading: offset === 0, error: null });

    try {
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: limit.toString(),
        ...filters,
      });

      const response: EmailLogsResponse = await apiCall(
        `/emails/logs?${params.toString()}`
      );

      set((state) => ({
        emailLogs:
          offset === 0 ? response.logs : [...state.emailLogs, ...response.logs],
        logsOffset: response.offset + response.count,
        logsHasMore: response.has_more,
        loading: false,
        error: null,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch email logs";
      set({
        loading: false,
        error: errorMessage,
      });
      throw new Error(errorMessage);
    }
  },

  fetchEmailStats: async (period = 30) => {
    set({ loadingStats: true, error: null });

    try {
      const response: EmailStats = await apiCall(
        `/emails/stats?period=${period}`
      );

      set({
        emailStats: response,
        loadingStats: false,
        error: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch email statistics";
      set({
        loadingStats: false,
        error: errorMessage,
      });
      throw new Error(errorMessage);
    }
  },

  resetLogs: () => {
    set({
      emailLogs: [],
      logsOffset: 0,
      logsHasMore: false,
    });
  },

  clearError: () => set({ error: null }),
}));
