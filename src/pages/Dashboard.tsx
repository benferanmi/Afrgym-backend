import { useEffect, useState } from "react";
import { Users, UserCheck, QrCode, DollarSign } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { MembershipDistributionChart } from "@/components/dashboard/MembershipDistributionChart";
import { Button } from "@/components/ui/button";
import { Plus, QrCode as QrIcon, Mail } from "lucide-react";
import { useMembershipStore } from "@/stores/membershipStore";
import { useUsersStore } from "@/stores/usersStore";
import { AddMemberDialog } from "@/components/members/AddMemberDialog";
import { QRScanner } from "@/components/QRScanner"; // Import the new QR scanner
import {
  MembershipBarChart,
  MembershipBarChartComplete,
} from "@/components/dashboard/MembershipBarChart";

export default function Dashboard() {
  const { statistics, getMembershipStatistics } = useMembershipStore();
  const { qrCodeStatistics, getQRCodeStatistics } = useUsersStore();
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    getMembershipStatistics();
    getQRCodeStatistics();
  }, [getMembershipStatistics, getQRCodeStatistics]);

  // Refresh data when a new member is added
  const handleMemberAdded = () => {
    getMembershipStatistics();
    getQRCodeStatistics();
  };

  // Prepare membership distribution data for chart
  const membershipDistribution =
    statistics?.by_level?.map((level) => ({
      name: level.level_name,
      value: level.member_count,
      level_id: level.level_id,
    })) || [];

  const handleScanQR = () => {
    setIsScannerOpen(true);
  };

  const handleQRScanned = (data) => {
    console.log("QR Code scanned:", data);

    // Here you can process the scanned QR code data
    // For example:
    // - Look up member by ID
    // - Check them in/out
    // - Navigate to member profile
    // - Show member information

    // Example: If QR code contains member ID
    if (data.startsWith("MEMBER_")) {
      const memberId = data.replace("MEMBER_", "");
      // Navigate to member profile or check them in
      console.log("Processing member check-in for ID:", memberId);

      // You could show a toast notification here
      // toast.success(`Member ${memberId} checked in successfully!`);
    } else {
      console.log("Unknown QR code format:", data);
      // toast.error("Invalid QR code format");
    }
  };

  const handleScannerClose = () => {
    setIsScannerOpen(false);
  };

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
            onClick={() => setIsAddMemberDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
          <Button onClick={handleScanQR} variant="outline" size="sm">
            <QrIcon className="mr-2 h-4 w-4" />
            Scan QR
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="mr-2 h-4 w-4" />
            Send Email
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Members"
          value={statistics?.total_members?.toLocaleString() || "0"}
          icon={Users}
        />
        <StatsCard
          title="Active Members"
          value={statistics?.active_members?.toLocaleString() || "0"}
          icon={UserCheck}
        />
        <StatsCard
          title="QR Code Coverage"
          value={`${qrCodeStatistics?.coverage_percentage || 0}%`}
          icon={QrCode}
        />
        <StatsCard
          title="Total Users"
          value={qrCodeStatistics?.total_users?.toLocaleString() || "0"}
          icon={DollarSign}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6">
        <MembershipDistributionChart data={membershipDistribution} />
      </div>

      <div className="grid gap-6">
        <MembershipBarChartComplete data={membershipDistribution} />
        <MembershipBarChart data={membershipDistribution} />
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
