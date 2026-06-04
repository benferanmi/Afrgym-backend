import { create } from "zustand";

const BASE_URL = "https://afrgym.com.ng/wp-json/gym-admin/v1";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RevenueTransaction {
  user_id: number;
  name: string;
  email: string;
  membership_plan: string;
  start_date: string;
  expiry_date: string;
  amount: number;
  assigned_by_admin: string;
}

export interface RevenueLevelBreakdown {
  membership_name: string;
  transaction_count: number;
  total_revenue: number;
  average_per_transaction: number;
}

export interface RevenueSummary {
  total_revenue: number;
  transaction_count: number;
  average_transaction_value: number;
}

export interface RevenuePeriod {
  start_date: string;
  end_date: string;
  display: string;
}

export interface RevenueReport {
  success: boolean;
  gym_identifier: string;
  gym_name: string;
  period: RevenuePeriod;
  summary: RevenueSummary;
  by_membership_level: RevenueLevelBreakdown[];
  members: RevenueTransaction[];
  generated_at: string;
}

/**
 * The backend wraps all revenue responses in:
 * { success, report_type, gym_identifier, gym_name, data: RevenueReport, timestamp }
 */
interface ApiRevenueResponse {
  success: boolean;
  report_type?: string;
  gym_identifier: string;
  gym_name: string;
  data: RevenueReport;
  timestamp: string;
}

export type ReportMode = "daily" | "weekly" | "monthly" | "range";

export interface ExportParams {
  month?: string;
  start_date?: string;
  end_date?: string;
  date?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth helpers (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────

const isTokenInvalidError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;
  if (e.code === "jwt_auth_invalid_token") return true;
  if ((e.data as Record<string, unknown>)?.status === 403) return true;
  if (e.status === 403) return true;
  if (typeof e.message === "string") {
    const msg = e.message.toLowerCase();
    if (msg.includes("token is invalid") || msg.includes("unauthorized")) return true;
  }
  return false;
};

const handleTokenInvalidation = async () => {
  localStorage.removeItem("gym-auth-storage");
  window.dispatchEvent(new CustomEvent("auth:logout", { detail: { reason: "token_invalid" } }));
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// API helper
// ─────────────────────────────────────────────────────────────────────────────

const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<ApiRevenueResponse> => {
  const url = `${BASE_URL}${endpoint}`;

  const authState = localStorage.getItem("gym-auth-storage");
  let token: string | null = null;

  if (authState) {
    try {
      const parsedAuth = JSON.parse(authState);
      token = parsedAuth.state?.token ?? null;
    } catch {
      console.warn("Failed to parse auth token");
    }
  }

  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers ?? {}),
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = { ...errorData, status: response.status, statusText: response.statusText };

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

// ─────────────────────────────────────────────────────────────────────────────
// Unwrap helper — backend always wraps in { data: RevenueReport }
// ─────────────────────────────────────────────────────────────────────────────

const unwrapReport = (response: ApiRevenueResponse): RevenueReport => {
  // The data field IS the RevenueReport
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// Store interface
// ─────────────────────────────────────────────────────────────────────────────

interface RevenueState {
  // Data
  report: RevenueReport | null;
  transactions: RevenueTransaction[];
  summary: RevenueSummary | null;
  levelBreakdown: RevenueLevelBreakdown[];

  // Mode & selections
  reportMode: ReportMode;
  selectedDate: string;       // YYYY-MM-DD (daily)
  selectedWeekDate: string;   // YYYY-MM-DD (any date in target week)
  selectedMonth: string;      // YYYY-MM
  selectedStartDate: string;  // YYYY-MM-DD (range)
  selectedEndDate: string;    // YYYY-MM-DD (range)

  // Status
  loading: boolean;
  exporting: boolean;
  error: string | null;

  // Actions
  setReportMode: (mode: ReportMode) => void;
  fetchRevenueByDate: (date?: string) => Promise<void>;
  fetchRevenueByWeek: (date?: string) => Promise<void>;
  fetchRevenueByMonth: (month?: string) => Promise<void>;
  fetchRevenueByDateRange: (startDate: string, endDate: string) => Promise<void>;
  setSelectedDate: (date: string) => void;
  setSelectedWeekDate: (date: string) => void;
  setSelectedMonth: (month: string) => void;
  setDateRange: (startDate: string, endDate: string) => void;
  exportCSV: (params?: ExportParams) => Promise<void>;
  exportPDF: (params?: ExportParams) => Promise<void>;
  clearError: () => void;
  refreshReport: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10);
const currentMonth = new Date().toISOString().slice(0, 7);
const firstOfMonth = new Date(new Date().setDate(1)).toISOString().slice(0, 10);

export const useRevenueStore = create<RevenueState>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────────
  report: null,
  transactions: [],
  summary: null,
  levelBreakdown: [],

  reportMode: "monthly",
  selectedDate: today,
  selectedWeekDate: today,
  selectedMonth: currentMonth,
  selectedStartDate: firstOfMonth,
  selectedEndDate: today,

  loading: false,
  exporting: false,
  error: null,

  // ── Mode switch ────────────────────────────────────────────────────────────
  setReportMode: (mode) => {
    set({ reportMode: mode, error: null });

    // Auto-fetch when switching modes
    const state = get();
    switch (mode) {
      case "daily":
        state.fetchRevenueByDate(state.selectedDate);
        break;
      case "weekly":
        state.fetchRevenueByWeek(state.selectedWeekDate);
        break;
      case "monthly":
        state.fetchRevenueByMonth(state.selectedMonth);
        break;
      case "range":
        state.fetchRevenueByDateRange(state.selectedStartDate, state.selectedEndDate);
        break;
    }
  },

  // ── Fetch: Daily ───────────────────────────────────────────────────────────
  fetchRevenueByDate: async (date?: string) => {
    const dateToFetch = date || get().selectedDate;
    set({ loading: true, error: null });

    try {
      const response = await apiCall(`/stats/revenue/daily?date=${dateToFetch}`);
      const report = unwrapReport(response);

      set({
        report,
        transactions: report.members || [],
        summary: report.summary,
        levelBreakdown: report.by_membership_level || [],
        selectedDate: dateToFetch,
        loading: false,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to fetch daily revenue";
      set({ loading: false, error: msg, report: null, transactions: [], summary: null, levelBreakdown: [] });
      if (!isTokenInvalidError(error)) throw new Error(msg);
    }
  },

  // ── Fetch: Weekly ──────────────────────────────────────────────────────────
  fetchRevenueByWeek: async (date?: string) => {
    const dateToFetch = date || get().selectedWeekDate;
    set({ loading: true, error: null });

    try {
      const response = await apiCall(`/stats/revenue/weekly?date=${dateToFetch}`);
      const report = unwrapReport(response);

      set({
        report,
        transactions: report.members || [],
        summary: report.summary,
        levelBreakdown: report.by_membership_level || [],
        selectedWeekDate: dateToFetch,
        loading: false,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to fetch weekly revenue";
      set({ loading: false, error: msg, report: null, transactions: [], summary: null, levelBreakdown: [] });
      if (!isTokenInvalidError(error)) throw new Error(msg);
    }
  },

  // ── Fetch: Monthly ─────────────────────────────────────────────────────────
  fetchRevenueByMonth: async (month?: string) => {
    const monthToFetch = month || get().selectedMonth;
    set({ loading: true, error: null });

    try {
      const response = await apiCall(`/stats/revenue/monthly?month=${monthToFetch}`);
      const report = unwrapReport(response);

      set({
        report,
        transactions: report.members || [],
        summary: report.summary,
        levelBreakdown: report.by_membership_level || [],
        selectedMonth: monthToFetch,
        loading: false,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to fetch monthly revenue";
      set({ loading: false, error: msg, report: null, transactions: [], summary: null, levelBreakdown: [] });
      if (!isTokenInvalidError(error)) throw new Error(msg);
    }
  },

  // ── Fetch: Date range ──────────────────────────────────────────────────────
  fetchRevenueByDateRange: async (startDate: string, endDate: string) => {
    set({ loading: true, error: null });

    try {
      const response = await apiCall(`/stats/revenue/range?start_date=${startDate}&end_date=${endDate}`);
      const report = unwrapReport(response);

      set({
        report,
        transactions: report.members || [],
        summary: report.summary,
        levelBreakdown: report.by_membership_level || [],
        selectedStartDate: startDate,
        selectedEndDate: endDate,
        loading: false,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to fetch revenue report";
      set({ loading: false, error: msg, report: null, transactions: [], summary: null, levelBreakdown: [] });
      if (!isTokenInvalidError(error)) throw new Error(msg);
    }
  },

  // ── Setters (update state + auto-fetch) ───────────────────────────────────
  setSelectedDate: (date) => {
    set({ selectedDate: date });
    get().fetchRevenueByDate(date);
  },

  setSelectedWeekDate: (date) => {
    set({ selectedWeekDate: date });
    get().fetchRevenueByWeek(date);
  },

  setSelectedMonth: (month) => {
    set({ selectedMonth: month });
    get().fetchRevenueByMonth(month);
  },

  setDateRange: (startDate, endDate) => {
    set({ selectedStartDate: startDate, selectedEndDate: endDate });
    // Only fetch if both dates are filled
    if (startDate && endDate) {
      get().fetchRevenueByDateRange(startDate, endDate);
    }
  },

  // ── Export: CSV ────────────────────────────────────────────────────────────
  // Uses already-loaded report data — no extra API call needed
  exportCSV: async () => {
    const { report } = get();
    if (!report) return;

    set({ exporting: true, error: null });

    try {
      const csv = convertToCSV(report);
      downloadFile(csv, `afrgym-revenue-${today}.csv`, "text/csv;charset=utf-8;");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to export CSV";
      set({ error: msg });
    } finally {
      set({ exporting: false });
    }
  },

  // ── Export: PDF ────────────────────────────────────────────────────────────
  // Uses already-loaded report data — no extra API call needed
  exportPDF: async () => {
    const { report } = get();
    if (!report) return;

    set({ exporting: true, error: null });

    try {
      generateAndDownloadPDF(report);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to export PDF";
      set({ error: msg });
    } finally {
      set({ exporting: false });
    }
  },

  // ── Misc ───────────────────────────────────────────────────────────────────
  clearError: () => set({ error: null }),

  refreshReport: async () => {
    const state = get();
    switch (state.reportMode) {
      case "daily":
        await state.fetchRevenueByDate(state.selectedDate);
        break;
      case "weekly":
        await state.fetchRevenueByWeek(state.selectedWeekDate);
        break;
      case "monthly":
        await state.fetchRevenueByMonth(state.selectedMonth);
        break;
      case "range":
        await state.fetchRevenueByDateRange(state.selectedStartDate, state.selectedEndDate);
        break;
    }
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function convertToCSV(report: RevenueReport): string {
  const lines: string[] = [];

  lines.push(`Revenue Report - ${report.gym_name}`);
  lines.push(`Period: ${report.period.display}`);
  lines.push(`Generated: ${new Date(report.generated_at).toLocaleString()}`);
  lines.push("");

  lines.push("SUMMARY");
  lines.push(`Total Revenue,${formatCurrency(report.summary.total_revenue)}`);
  lines.push(`Transaction Count,${report.summary.transaction_count}`);
  lines.push(`Average Per Transaction,${formatCurrency(report.summary.average_transaction_value)}`);
  lines.push("");

  lines.push("BY MEMBERSHIP LEVEL");
  lines.push("Membership Plan,Transaction Count,Total Revenue,Average Per Transaction");
  report.by_membership_level.forEach((level) => {
    lines.push(
      `"${level.membership_name}",${level.transaction_count},${formatCurrency(level.total_revenue)},${formatCurrency(level.average_per_transaction)}`
    );
  });
  lines.push("");

  lines.push("MEMBER TRANSACTIONS");
  lines.push("Name,Email,Membership Plan,Start Date,Expiry Date,Amount,Assigned By");
  report.members.forEach((t) => {
    lines.push(
      `"${t.name}","${t.email}","${t.membership_plan}",${t.start_date},${t.expiry_date},${formatCurrency(t.amount)},"${t.assigned_by_admin}"`
    );
  });

  return lines.join("\n");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function generateAndDownloadPDF(report: RevenueReport) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Revenue Report - ${report.gym_name}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; color: #222; padding: 32px; font-size: 13px; }
        h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
        .meta { color: #666; font-size: 12px; margin-bottom: 24px; }
        h2 { font-size: 15px; font-weight: 700; margin: 24px 0 10px; border-bottom: 2px solid #111; padding-bottom: 4px; }
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
        .card { border: 1px solid #ddd; border-radius: 6px; padding: 14px; }
        .card-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
        .card-value { font-size: 20px; font-weight: 700; color: #111; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
        th { background: #111; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; }
        td { padding: 8px 10px; border-bottom: 1px solid #eee; }
        tr:nth-child(even) td { background: #f9f9f9; }
        .amount { color: #16a34a; font-weight: 600; }
        .footer { margin-top: 32px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
        @media print { body { padding: 16px; } }
      </style>
    </head>
    <body>
      <h1>${report.gym_name} — Revenue Report</h1>
      <p class="meta">
        Period: <strong>${report.period.display}</strong> &nbsp;|&nbsp;
        Generated: <strong>${new Date(report.generated_at).toLocaleString()}</strong>
      </p>

      <h2>Summary</h2>
      <div class="summary-grid">
        <div class="card">
          <div class="card-label">Total Revenue</div>
          <div class="card-value" style="color:#16a34a">${formatCurrency(report.summary.total_revenue)}</div>
        </div>
        <div class="card">
          <div class="card-label">Transactions</div>
          <div class="card-value">${report.summary.transaction_count}</div>
        </div>
        <div class="card">
          <div class="card-label">Avg. Per Transaction</div>
          <div class="card-value" style="color:#1d4ed8">${formatCurrency(report.summary.average_transaction_value)}</div>
        </div>
      </div>

      <h2>By Membership Plan</h2>
      <table>
        <thead>
          <tr>
            <th>Plan</th><th>Transactions</th><th>Total Revenue</th><th>Avg. Per Transaction</th>
          </tr>
        </thead>
        <tbody>
          ${report.by_membership_level.map((l) => `
          <tr>
            <td>${l.membership_name}</td>
            <td>${l.transaction_count}</td>
            <td class="amount">${formatCurrency(l.total_revenue)}</td>
            <td>${formatCurrency(l.average_per_transaction)}</td>
          </tr>`).join("")}
        </tbody>
      </table>

      <h2>Member Transactions (${report.members.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th><th>Email</th><th>Plan</th><th>Start</th><th>Expiry</th><th>Amount</th><th>Assigned By</th>
          </tr>
        </thead>
        <tbody>
          ${report.members.map((t) => `
          <tr>
            <td>${t.name}</td>
            <td>${t.email}</td>
            <td>${t.membership_plan}</td>
            <td>${t.start_date}</td>
            <td>${t.expiry_date}</td>
            <td class="amount">${formatCurrency(t.amount)}</td>
            <td>${t.assigned_by_admin}</td>
          </tr>`).join("")}
        </tbody>
      </table>

      <div class="footer">Automated report from Afrgym Revenue Tracking System.</div>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    // Small delay to ensure content is fully rendered before print dialog
    setTimeout(() => printWindow.print(), 500);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Currency formatter — exported for use in components
// ─────────────────────────────────────────────────────────────────────────────
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount);
}