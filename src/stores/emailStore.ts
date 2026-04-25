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

export interface SingleEmailPayload {
  user_id: number;
  template?: string;
  custom_subject?: string;
  custom_content?: string;
  custom_data?: Record<string, any>;
}

export interface BulkEmailPayload {
  user_ids: number[];
  template?: string;
  custom_subject?: string;
  custom_content?: string;
  custom_data?: Record<string, any>;
}

export interface SingleEmailResponse {
  success: boolean;
  message: string;
  log_id: number;
  recipient?: string;
  template?: string;
}

export interface BulkEmailResponse {
  success: boolean;
  job_id?: string;
  results?: {
    sent: number;
    failed: number;
    errors: Array<{
      user_id: number;
      error: string;
    }>;
  };
  total_attempted?: number;
  sent: number;
  failed: number;
  invalid_users?: number;
  message?: string;
  status?: string;
  total_users?: number;
  note?: string;
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

// ✨ NEW: Bulk Job Interfaces
export interface FailedJobUser {
  user_id: number;
  email: string;
  username?: string;
  display_name?: string;
  error: string;
  retry_count?: number;
}

export interface BulkJob {
  job_id: string;
  status: "processing" | "completed" | "failed";
  total_users: number;
  sent: number;
  failed: number;
  started_at: string;
  completed_at: string | null;
  current_batch?: number;
  total_batches?: number;
  failed_users: FailedJobUser[];
}

export interface BulkJobsResponse {
  jobs: BulkJob[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface BulkJobResponse {
  success: boolean;
  job: BulkJob;
}

export interface RetryFailedResponse {
  success: boolean;
  message: string;
  retried_count: number;
  job: BulkJob;
}

// Token validation helpers
const isTokenInvalidError = (error: any): boolean => {
  if (error?.code === "jwt_auth_invalid_token") return true;
  if (error?.data?.status === 403) return true;
  if (error?.status === 403) return true;
  if (error?.message?.toLowerCase().includes("token is invalid")) return true;
  if (error?.message?.toLowerCase().includes("unauthorized")) return true;
  if (error?.message?.toLowerCase().includes("forbidden")) return true;
  return false;
};

const handleTokenInvalidation = async () => {
  console.log("Invalid token detected, logging out user");
  localStorage.removeItem("gym-auth-storage");
  window.dispatchEvent(
    new CustomEvent("auth:logout", {
      detail: { reason: "token_invalid" },
    }),
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

      throw new Error(
        error.message || `HTTP ${response.status}: ${response.statusText}`,
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
  currentJob: BulkJob | null;
  jobHistory: BulkJob[];
  jobHistoryTotal: number;

  // Loading states
  loading: boolean;
  sendingEmail: boolean;
  loadingPreview: boolean;
  loadingStats: boolean;
  jobLoading: boolean;
  jobHistoryLoading: boolean;

  // Error states
  error: string | null;

  // Pagination
  logsOffset: number;
  logsHasMore: boolean;
  jobHistoryPage: number;
  jobHistoryHasMore: boolean;

  // Polling
  isPollingJob: boolean;
  pollingJobId: string | null;

  // Actions
  fetchTemplates: () => Promise<EmailTemplatesResponse>;
  sendSingleEmail: (
    payload: SingleEmailPayload,
  ) => Promise<SingleEmailResponse>;
  sendBulkEmail: (payload: BulkEmailPayload) => Promise<BulkEmailResponse>;
  previewEmail: (payload: EmailPreviewPayload) => Promise<EmailPreviewResponse>;
  sendTestEmail: (payload: TestEmailPayload) => Promise<void>;
  fetchEmailLogs: (
    offset?: number,
    limit?: number,
    filters?: Record<string, any>,
  ) => Promise<void>;
  fetchEmailStats: (period?: number) => Promise<void>;
  clearError: () => void;
  resetLogs: () => void;
  sendBulkEmailByCategory: (
    payload: BulkEmailByCategoryPayload,
  ) => Promise<BulkEmailResponse>;

  // ✨ NEW: Job actions
  checkJobStatus: (jobId: string) => Promise<BulkJob>;
  fetchJobHistory: (page?: number, limit?: number) => Promise<void>;
  retryFailedEmails: (jobId: string) => Promise<RetryFailedResponse>;
  startJobPolling: (jobId: string) => void;
  stopJobPolling: () => void;
  clearCurrentJob: () => void;
}

export const useEmailStore = create<EmailState>((set, get) => ({
  // Data
  templates: null,
  templatesCategories: null,
  emailLogs: [],
  emailStats: null,
  currentJob: null,
  jobHistory: [],
  jobHistoryTotal: 0,

  // Loading states
  loading: false,
  sendingEmail: false,
  loadingPreview: false,
  loadingStats: false,
  jobLoading: false,
  jobHistoryLoading: false,

  // Error states
  error: null,

  // Pagination
  logsOffset: 0,
  logsHasMore: false,
  jobHistoryPage: 1,
  jobHistoryHasMore: false,

  // Polling
  isPollingJob: false,
  pollingJobId: null,

  fetchTemplates: async () => {
    set({ loading: true, error: null });

    try {
      const response: EmailTemplatesResponse =
        await apiCall("/emails/templates");

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
        },
      );

      if (response.success && response.job_id) {
        // ✨ NEW: Start polling the job
        set({
          sendingEmail: false,
          error: null,
        });

        get().startJobPolling(response.job_id);

        setTimeout(() => {
          get().fetchEmailLogs();
          get().fetchEmailStats();
          get().fetchJobHistory(1);
        }, 1000);

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
        // ✨ NEW: Start polling the job if we have job_id
        if (response.job_id) {
          set({
            sendingEmail: false,
            error: null,
          });

          get().startJobPolling(response.job_id);
        }

        setTimeout(() => {
          get().fetchEmailLogs();
          get().fetchEmailStats();
          if (response.job_id) {
            get().fetchJobHistory(1);
          }
        }, 1000);

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
        `/emails/logs?${params.toString()}`,
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
        `/emails/stats?period=${period}`,
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

  // ✨ NEW: Job Status Checking
  checkJobStatus: async (jobId: string) => {
    set({ jobLoading: true, error: null });

    try {
      const response: BulkJobResponse = await apiCall(`/bulk-jobs/${jobId}`);

      if (response.success) {
        set({
          currentJob: response.job,
          jobLoading: false,
          error: null,
        });

        return response.job;
      } else {
        throw new Error("Failed to check job status");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to check job status";
      set({ jobLoading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // ✨ NEW: Fetch Job History
  fetchJobHistory: async (page = 1, limit = 10) => {
    set({ jobHistoryLoading: page === 1 });

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response: BulkJobsResponse = await apiCall(
        `/bulk-jobs?${params.toString()}`,
      );

      set({
        jobHistory:
          page === 1 ? response.jobs : [...get().jobHistory, ...response.jobs],
        jobHistoryPage: page,
        jobHistoryTotal: response.total,
        jobHistoryHasMore: response.has_more,
        jobHistoryLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch job history";
      set({
        jobHistoryLoading: false,
        error: errorMessage,
      });
      throw new Error(errorMessage);
    }
  },

  // ✨ NEW: Retry Failed Emails
  retryFailedEmails: async (jobId: string) => {
    set({ jobLoading: true, error: null });

    try {
      const response: RetryFailedResponse = await apiCall(
        `/bulk-jobs/${jobId}/retry`,
        {
          method: "POST",
        },
      );

      if (response.success) {
        set({
          currentJob: response.job,
          jobLoading: false,
          error: null,
        });

        // Update job history
        set((state) => ({
          jobHistory: state.jobHistory.map((job) =>
            job.job_id === jobId ? response.job : job,
          ),
        }));

        return response;
      } else {
        throw new Error("Failed to retry failed emails");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to retry failed emails";
      set({ jobLoading: false, error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // ✨ NEW: Start Polling Job Status
  startJobPolling: (jobId: string) => {
    set({
      isPollingJob: true,
      pollingJobId: jobId,
    });

    const pollInterval = setInterval(async () => {
      try {
        const job = await get().checkJobStatus(jobId);

        // Stop polling if job is completed or failed
        if (job.status === "completed" || job.status === "failed") {
          clearInterval(pollInterval);
          set({
            isPollingJob: false,
            pollingJobId: null,
          });
        }
      } catch (error) {
        console.error("Polling error:", error);
        clearInterval(pollInterval);
        set({
          isPollingJob: false,
          pollingJobId: null,
        });
      }
    }, 5000); // Poll every 5 seconds

    // Store interval for cleanup
    (set as any).pollInterval = pollInterval;
  },

  // ✨ NEW: Stop Polling
  stopJobPolling: () => {
    set({
      isPollingJob: false,
      pollingJobId: null,
    });
  },

  // ✨ NEW: Clear Current Job
  clearCurrentJob: () => {
    set({
      currentJob: null,
    });
  },
}));
