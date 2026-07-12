import { useEffect, useState } from "react";
import {
  Download,
  Loader2,
  RefreshCw,
  FileText,
  TrendingUp,
  AlertCircle,
  CalendarDays,
  CalendarRange,
  BarChart2,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useRevenueStore,
  formatCurrency,
  ReportMode,
} from "@/stores/revenueStore";
import { SuperAdminOnly } from "@/components/Superadminonly";

// ─────────────────────────────────────────────────────────────────────────────
// Report mode tab config
// ─────────────────────────────────────────────────────────────────────────────

const REPORT_MODES: {
  value: ReportMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
    { value: "daily", label: "Daily", icon: Sun },
    { value: "weekly", label: "Weekly", icon: CalendarDays },
    { value: "monthly", label: "Monthly", icon: BarChart2 },
    { value: "range", label: "Custom Range", icon: CalendarRange },
  ];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns last 24 months as { value: "YYYY-MM", label: "Month YYYY" } */
const getMonthOptions = () => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-US", { year: "numeric", month: "long" }),
    });
  }
  return months;
};

/** Returns the Monday of the week containing the given YYYY-MM-DD date */
const getWeekLabel = (dateStr: string): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  const sat = new Date(mon);
  sat.setDate(mon.getDate() + 5);
  const fmt = (dt: Date) =>
    dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `Week of ${fmt(mon)} – ${fmt(sat)}, ${sat.getFullYear()}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function Revenue() {
  const {
    report,
    transactions,
    summary,
    levelBreakdown,
    reportMode,
    selectedDate,
    selectedWeekDate,
    selectedMonth,
    selectedStartDate,
    selectedEndDate,
    loading,
    exporting,
    error,
    setReportMode,
    setSelectedDate,
    setSelectedWeekDate,
    setSelectedMonth,
    setDateRange,
    exportCSV,
    exportPDF,
    clearError,
    refreshReport,
    fetchRevenueByMonth,
  } = useRevenueStore();

  const [searchTerm, setSearchTerm] = useState("");

  // Load current month on first mount
  useEffect(() => {
    fetchRevenueByMonth();
  }, []);

  // Filter transactions
  const filteredTransactions = transactions.filter((t) =>
    [t.name, t.email, t.membership_plan, t.assigned_by_admin]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  const filteredTotal = filteredTransactions.reduce(
    (sum, t) => sum + t.amount,
    0,
  );

  const monthOptions = getMonthOptions();

  // ── Period selector panel ────────────────────────────────────────────────

  const renderPeriodSelector = () => {
    switch (reportMode) {
      case "daily":
        return (
          <div className="max-w-xs">
            <Label
              htmlFor="daily-date"
              className="mb-2 block text-sm font-medium"
            >
              Select Date
            </Label>
            <Input
              id="daily-date"
              type="date"
              value={selectedDate}
              max={(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })()}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        );

      case "weekly":
        return (
          <div className="max-w-xs space-y-1">
            <Label
              htmlFor="weekly-date"
              className="mb-2 block text-sm font-medium"
            >
              Pick any date in the target week
            </Label>
            <Input
              id="weekly-date"
              type="date"
              value={selectedWeekDate}
              max={(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })()}
              onChange={(e) => setSelectedWeekDate(e.target.value)}
            />
            {selectedWeekDate && (
              <p className="text-xs text-muted-foreground pt-1">
                {getWeekLabel(selectedWeekDate)}
              </p>
            )}
          </div>
        );

      case "monthly":
        return (
          <div className="max-w-xs">
            <Label
              htmlFor="month-select"
              className="mb-2 block text-sm font-medium"
            >
              Select Month
            </Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger id="month-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "range":
        return (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label
                htmlFor="start-date"
                className="mb-2 block text-sm font-medium"
              >
                Start Date
              </Label>
              <Input
                id="start-date"
                type="date"
                value={selectedStartDate}
                max={selectedEndDate || (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })()}
                onChange={(e) => setDateRange(e.target.value, selectedEndDate)}
              />
            </div>
            <div className="flex-1">
              <Label
                htmlFor="end-date"
                className="mb-2 block text-sm font-medium"
              >
                End Date
              </Label>
              <Input
                id="end-date"
                type="date"
                value={selectedEndDate}
                min={selectedStartDate}
                max={(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })()}
                onChange={(e) =>
                  setDateRange(selectedStartDate, e.target.value)
                }
              />
            </div>
          </div>
        );
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <SuperAdminOnly>
      <div className="space-y-6 animate-fade-in">
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Revenue Report
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track membership revenue and audit transactions
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshReport}
              disabled={loading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>

            <Button
              size="sm"
              onClick={exportCSV}
              disabled={exporting || !report}
            >
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              CSV
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={exportPDF}
              disabled={exporting || !report}
            >
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              PDF
            </Button>
          </div>
        </div>

        {/* ── Error ──────────────────────────────────────────────────────────── */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={clearError}>
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* ── Report Mode Tabs + Period Selector ─────────────────────────────── */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Report Period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Mode tabs */}
            <div className="flex flex-wrap gap-2">
              {REPORT_MODES.map(({ value, label, icon: Icon }) => {
                const active = reportMode === value;
                return (
                  <button
                    key={value}
                    onClick={() => setReportMode(value)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-colors
                    ${active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Period selector for active mode */}
            <div>{renderPeriodSelector()}</div>

            {/* Active period display */}
            {report && (
              <div className="bg-muted/60 px-4 py-2.5 rounded-lg flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Period
                </span>
                <span className="text-sm font-medium">
                  {report.period.display}
                </span>
                {loading && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin ml-auto text-muted-foreground" />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Loading state (no data yet) ────────────────────────────────────── */}
        {loading && !report && (
          <div className="flex items-center justify-center h-48 gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading revenue report…</span>
          </div>
        )}

        {/* ── Summary Cards ──────────────────────────────────────────────────── */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="shadow-card border-l-4 border-l-green-500">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.total_revenue)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  For selected period
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card border-l-4 border-l-blue-500">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {summary.transaction_count}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Memberships assigned
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card border-l-4 border-l-orange-500">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Per Transaction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(summary.average_transaction_value)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Per membership assigned
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Membership Level Breakdown ─────────────────────────────────────── */}
        {levelBreakdown.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                Revenue by Membership Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {levelBreakdown.map((level, index) => (
                  <div
                    key={`${level.level_id ?? "unknown"}-${level.membership_name}-${index}`}
                    className="border rounded-lg p-4 space-y-2 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">
                        {level.membership_name}
                      </h4>
                      <Badge variant="secondary" className="text-xs">
                        {level.transaction_count} tx
                      </Badge>
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(level.total_revenue)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Avg: {formatCurrency(level.average_per_transaction)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Empty state ────────────────────────────────────────────────────── */}
        {!loading && report && transactions.length === 0 && (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <BarChart2 className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground font-medium">
                No transactions in this period
              </p>
              <p className="text-xs text-muted-foreground">
                Try a different date range or period
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Member Transactions Table ──────────────────────────────────────── */}
        {transactions.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-base">
                  Member Transactions
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({transactions.length})
                  </span>
                </CardTitle>
                <Input
                  placeholder="Search name, email, plan, admin…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-xs h-8 text-sm"
                />
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-semibold">
                        Member
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Email
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Plan
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Start Date
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Expiry
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-right">
                        Amount
                      </TableHead>
                      <TableHead className="text-xs font-semibold">
                        Assigned By
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map((t, i) => (
                        <TableRow
                          key={`${t.user_id}-${t.start_date}-${i}`}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="font-medium text-sm">
                            {t.name}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {t.email}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="text-xs whitespace-nowrap"
                            >
                              {t.membership_plan}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm tabular-nums">
                            {t.start_date}
                          </TableCell>
                          <TableCell className="text-sm">
                            {t.expiry_date === "Lifetime" ? (
                              <Badge variant="secondary" className="text-xs">
                                Lifetime
                              </Badge>
                            ) : (
                              <span className="tabular-nums">
                                {t.expiry_date}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600 tabular-nums text-sm">
                            {formatCurrency(t.amount)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {t.assigned_by_admin}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-10 text-muted-foreground text-sm"
                        >
                          {searchTerm
                            ? "No transactions match your search"
                            : "No transactions found for this period"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Filtered summary footer */}
              {filteredTransactions.length > 0 && (
                <div className="flex items-center justify-between bg-muted/50 px-4 py-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {searchTerm
                      ? `${filteredTransactions.length} of ${transactions.length} transactions`
                      : `${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? "s" : ""}`}
                  </p>
                  <div className="text-right">
                    {searchTerm && (
                      <p className="text-xs text-muted-foreground">
                        Filtered total
                      </p>
                    )}
                    <p className="text-base font-bold text-green-600">
                      {formatCurrency(filteredTotal)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </SuperAdminOnly>
  );
}