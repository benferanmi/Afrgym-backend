import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, QrCode as QrIcon, Mail, RefreshCw } from "lucide-react";
import { AddMemberDialog } from "@/components/members/AddMemberDialog";
import { QRScanner } from "@/components/QRScanner";
import { MembershipDistributionChart } from "@/components/dashboard/MembershipDistributionChart";
import { useMembershipStore } from "@/stores/membershipStore";
import { useDashboardStore } from "@/stores/dashboardStore";
import {
  SummaryStatsGrid,
  MembershipStatusCard,
  DailyStatsCard,
  RecentActivitiesCard,
  PauseStatsCard,
  ExpiringMembershipsCard,
  GrowthTrendsChart,
} from "@/components/dashboard/DashboardStatsComponents";
import {
  MembershipBarChart,
  MembershipBarChartComplete,
} from "@/components/dashboard/MembershipBarChart";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const { statistics, getMembershipStatistics } = useMembershipStore();

  const navigate = useNavigate()

  // Keep existing membership store for the distribution chart
  const { statistics: legacyStats } = useMembershipStore();

  // Dashboard store for refresh functionality
  const { fetchDashboardOverview } = useDashboardStore();

  useEffect(() => {
    getMembershipStatistics();
  }, [getMembershipStatistics]);

  const membershipDistributionData =
    statistics?.by_level?.map((level) => ({
      name: level.level_name,
      value: level.member_count,
      level_id: level.level_id,
    })) || [];

  // Handle member added - refresh both stores
  const handleMemberAdded = () => {
    fetchDashboardOverview(); // Refresh dashboard stats
    // You can also refresh the legacy membership store if needed
  };

  const handleScanQR = () => {
    setIsScannerOpen(true);
  };

  const handleQRScanned = (data) => {
    console.log("QR Code scanned:", data);

    // Process QR code data
    if (data.startsWith("MEMBER_")) {
      const memberId = data.replace("MEMBER_", "");
      console.log("Processing member check-in for ID:", memberId);
    } else {
      console.log("Unknown QR code format:", data);
    }
  };

  const handleScannerClose = () => {
    setIsScannerOpen(false);
  };

  const handleRefreshAll = () => {
    fetchDashboardOverview();
  };

  // Prepare membership distribution data for existing chart
  const membershipDistribution =
    legacyStats?.by_level?.map((level) => ({
      name: level.level_name,
      value: level.member_count,
      level_id: level.level_id,
    })) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening at your gym today.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            title="Refresh all dashboard data"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddMemberDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
          <Button onClick={handleScanQR} variant="outline" size="sm">
            <QrIcon className="mr-2 h-4 w-4" />
            Scan QR
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/emails")}>
            <Mail className="mr-2 h-4 w-4" />
            Send Email
          </Button>
        </div>
      </div>

      {/* Main Stats Grid - Loads independently */}
      <SummaryStatsGrid />

      {/* Secondary Stats Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <DailyStatsCard />
        <MembershipStatusCard />
        <PauseStatsCard />
      </div>

      {/* Alerts and Warnings */}
      <div className="grid gap-6 md:grid-cols-2">
        <ExpiringMembershipsCard />
        <RecentActivitiesCard />
      </div>

      {/* Growth Trends - Full width */}
      <GrowthTrendsChart />

      {/* Existing Charts - Keep your current charts */}
      <div className="grid gap-6">
        <MembershipDistributionChart data={membershipDistribution} />
      </div>

      <div className="h-10 grid gap-6 grid-cols-2">
        <MembershipBarChartComplete data={membershipDistributionData} />
        <MembershipBarChart data={membershipDistributionData} />

      </div>

      <div className="grid gap-6">
      </div>

      {/* Add Member Dialog */}
      <AddMemberDialog
        open={isAddMemberDialogOpen}
        onOpenChange={setIsAddMemberDialogOpen}
        onSuccess={handleMemberAdded}
      />

      {/* QR Scanner */}
      <QRScanner
        isOpen={isScannerOpen}
        onClose={handleScannerClose}
        onScan={handleQRScanned}
      />
    </div>
  );
}
