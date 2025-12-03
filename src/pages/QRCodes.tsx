import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  QrCode,
  Search,
  Camera,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  User,
  Calendar,
  TrendingUp,
  UserCheck,
  Clock,
  Shield,
  AlertTriangle,
  Edit,
} from "lucide-react";
import {
  useUsersStore,
  hasQRCode,
  formatDate,
  formatQRCodeStatistics,
  isVisitBased,
  getMembershipStatusDisplay,
  getMembershipStatusColor,
  GymUser,
} from "@/stores/usersStore";
import { QRScanner } from "@/components/QRScanner";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { Separator } from "@/components/ui/separator";
import { EditMemberDialog } from "@/components/members/EditMemberDialog";

const BASE_URL = "https://afrgym.com.ng/wp-json/gym-admin/v1";

export default function QRCodes() {
  const {
    users,
    loading,
    error,
    qrCodeStatistics,
    qrCodeLoading,
    fetchUsers, // Back to fetchUsers for gym-specific list
    lookupUserByQRCode, // Lookup only, works cross-gym
    getQRCodeStatistics,
    clearError,
    generateUserQRCode,
    fetchSingleUser,
  } = useUsersStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [assignMembershipDialogOpen, setAssignMembershipDialogOpen] =
    useState(false);
  const [editingUserFromQR, setEditingUserFromQR] = useState<GymUser | null>(
    null
  );

  // Load initial data - fetch gym-specific users for the list
  useEffect(() => {
    fetchUsers(); // Gym-specific users only
    getQRCodeStatistics();
  }, [fetchUsers, getQRCodeStatistics]);

  // Filter users based on search term (only searches gym-specific users in list)
  const filteredUsers = users.filter(
    (user) =>
      user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.qr_code.unique_id &&
        user.qr_code.unique_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // QR lookup works cross-gym (doesn't auto-check-in)
  const handleQRCodeLookup = async (qrCodeValue) => {
    if (!qrCodeValue.trim()) return;

    setLookupLoading(true);
    setLookupError("");
    setLookupResult(null);

    try {
      // This lookup works across ALL gyms via backend
      const result = await lookupUserByQRCode(qrCodeValue.trim());
      setLookupResult(result);

      if (!result.user_found) {
        setLookupError(
          "No user found with this QR code, username, email, or phone number."
        );
      }
    } catch (err) {
      setLookupError(err.message || "Failed to lookup QR code");
    } finally {
      setLookupLoading(false);
    }
  };

  // Manual check-in (works cross-gym)
  const handleCheckinUser = async () => {
    if (!lookupResult?.user?.id) return;

    try {
      setLookupLoading(true);

      // Get auth token
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

      // Call check-in endpoint directly (works cross-gym)
      const response = await fetch(
        `${BASE_URL}/checkin/${lookupResult.user.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to check in user");
      }

      const data = await response.json();

      if (data.success) {
        // Update the lookup result with new visit info
        setLookupResult({
          ...lookupResult,
          user: {
            ...lookupResult.user,
            membership: {
              ...lookupResult.user.membership,
              visit_info: data.visit_info,
            },
          },
          visit_status: {
            can_check_in: false,
            already_checked_in_today: true,
          },
        });

        // Show success message
        alert(
          `Check-in successful! ${data.visit_info.remaining_visits} visits remaining.`
        );
      }
    } catch (err) {
      setLookupError(err.message || "Failed to check in user");
    } finally {
      setLookupLoading(false);
    }
  };

  // Handler to open edit dialog for cross-gym membership assignment
  const handleAssignMembershipFromQR = async () => {
    if (!lookupResult?.user) return;

    // Use local loading state instead of store loading
    setLookupLoading(true);
    setLookupError("");

    try {
      // Fetch the full user object to populate the edit dialog
      const fullUser = await fetchSingleUser(lookupResult.user.id);
      setEditingUserFromQR(fullUser);
      setAssignMembershipDialogOpen(true);
    } catch (error) {
      console.error("Failed to fetch user details:", error);
      setLookupError("Failed to load user details for editing");
    } finally {
      // Clear local loading state
      setLookupLoading(false);
    }
  };

  const handleEditSuccess = () => {
    // Refresh the lookup to show updated data
    if (lookupResult?.user?.unique_id) {
      handleQRCodeLookup(lookupResult.user.unique_id);
    }
    // Refresh statistics
    getQRCodeStatistics();
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
  };

  const handleSearchSubmit = () => {
    if (searchTerm.trim().length >= 3) {
      handleQRCodeLookup(searchTerm.trim());
    } else {
      setLookupError("Please enter at least 3 characters to search");
    }
  };

  const handleGenerateQR = async (userId) => {
    try {
      await generateUserQRCode(userId);
      await getQRCodeStatistics();
    } catch (err) {
      console.error("Failed to generate QR code:", err);
    }
  };

  const handleDownloadQR = (qrCodeUrl) => {
    if (qrCodeUrl) {
      const link = document.createElement("a");
      link.href = qrCodeUrl;
      link.download = "qr-code.png";
      link.click();
    }
  };

  const handleScanQR = () => {
    setScannerActive(true);
  };

  const handleScannerClose = () => {
    setScannerActive(false);
  };

  const handleQRScanned = (scannedData) => {
    console.log("QR Code scanned:", scannedData);

    let qrCode = scannedData;

    if (scannedData.includes("/")) {
      const urlParts = scannedData.split("/");
      qrCode = urlParts[urlParts.length - 1];
    }

    if (/^[A-Za-z0-9]{8}$/.test(qrCode)) {
      setSearchTerm(qrCode);
      handleQRCodeLookup(qrCode); // Cross-gym lookup
      console.log("Valid QR code detected:", qrCode);
    } else {
      setLookupError(
        "Invalid QR code format. Expected 8-digit alphanumeric code. Try manual search for username/email/phone."
      );
      console.log("Invalid QR code format:", scannedData);
    }

    setScannerActive(false);
  };

  const statsDisplay = qrCodeStatistics
    ? formatQRCodeStatistics(qrCodeStatistics)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">QR Code Management</h1>
          <p className="text-muted-foreground mt-2">
            Generate and manage member QR codes, scan for access control
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleScanQR} variant="default">
            <Camera className="w-4 h-4 mr-2" />
            Scan QR Code
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={clearError}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {qrCodeLoading ? "..." : statsDisplay?.totalUsers || users.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>With QR Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {qrCodeLoading ? "..." : statsDisplay?.withQRCode || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Without QR Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {qrCodeLoading ? "..." : statsDisplay?.withoutQRCode || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {qrCodeLoading ? "..." : statsDisplay?.coveragePercentage || "0%"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced User Lookup Result - Shows ANY user from cross-gym lookup */}
      {lookupResult && (
        <Card
          className={`border-2 ${
            lookupResult.user_found ? "border-green-500" : "border-red-500"
          }`}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {lookupResult.user_found ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              User Lookup Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lookupResult.user_found ? (
              <div className="space-y-4">
                {/* User Basic Info */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {lookupResult.user.first_name &&
                    lookupResult.user.last_name ? (
                      <Avatar className="w-20 h-20 block">
                        <AvatarImage
                          src={
                            lookupResult.user.profile_picture_url ||
                            lookupResult.user.avatar_url
                          }
                          alt={lookupResult.user.name}
                          className="w-full h-full object-cover rounded-full"
                        />
                        <AvatarFallback className="w-20 h-20 bg-blue-100 text-blue-600 flex items-center justify-center rounded-full">
                          {lookupResult.user.first_name[0]}
                          {lookupResult.user.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                        {lookupResult.user.profile_picture_url ||
                        lookupResult.user.avatar_url ? (
                          <img
                            src={
                              lookupResult.user.profile_picture_url ||
                              lookupResult.user.avatar_url
                            }
                            alt={lookupResult.user.name}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <User className="w-10 h-10 text-gray-400" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex-grow space-y-2">
                    <h3 className="text-xl font-semibold">
                      {lookupResult.user.name}
                    </h3>
                    <p className="text-muted-foreground">
                      {lookupResult.user.email}
                    </p>
                    <p className="text-sm text-muted-foreground font-mono">
                      QR Code: {lookupResult.user.unique_id}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Membership Information */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Membership Details
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          className={`${
                            lookupResult.user.membership.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {lookupResult.user.membership.plan}
                        </Badge>
                        {lookupResult.user.membership.is_visit_based && (
                          <Badge
                            variant="outline"
                            className="bg-blue-100 text-blue-800"
                          >
                            Visit-Based
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Status: {lookupResult.user.membership.status}
                      </p>
                    </div>

                    {lookupResult.user.membership.expiry_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Expires</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(
                              lookupResult.user.membership.expiry_date
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Visit-Based Information */}
                  {lookupResult.user.membership.is_visit_based &&
                    lookupResult.user.membership.visit_info && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <h5 className="font-medium flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                          Visit Information
                        </h5>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Remaining</p>
                            <p className="font-medium text-green-600">
                              {
                                lookupResult.user.membership.visit_info
                                  .remaining_visits
                              }
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Used</p>
                            <p className="font-medium">
                              {
                                lookupResult.user.membership.visit_info
                                  .used_visits
                              }
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Total</p>
                            <p className="font-medium">
                              {
                                lookupResult.user.membership.visit_info
                                  .total_visits
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                </div>

                <Separator />

                {/* Access Status */}
                {lookupResult.access_status && (
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Access Status
                    </h4>
                    <div
                      className={`p-3 rounded-lg border-2 ${
                        lookupResult.access_status.can_access
                          ? "bg-green-50 border-green-200"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {lookupResult.access_status.can_access ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span
                          className={`font-medium ${
                            lookupResult.access_status.can_access
                              ? "text-green-800"
                              : "text-red-800"
                          }`}
                        >
                          {lookupResult.access_status.status_message}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 🆕 MEMBERSHIP MANAGEMENT ACTIONS */}
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Membership Actions
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={handleAssignMembershipFromQR}
                      disabled={lookupLoading}
                      variant="default"
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {lookupLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Edit className="w-4 h-4 mr-2" />
                          Assign/Renew Membership
                        </>
                      )}
                    </Button>

                    {lookupResult.user.membership.is_visit_based &&
                      lookupResult.visit_status?.can_check_in &&
                      !lookupResult.visit_status?.already_checked_in_today && (
                        <Button
                          onClick={handleCheckinUser}
                          disabled={lookupLoading}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {lookupLoading ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Checking In...
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-4 h-4 mr-2" />
                              Check In Now
                            </>
                          )}
                        </Button>
                      )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    💡 You can manage membership for users from any gym location
                  </p>
                </div>

                {/* Visit Status and Check-in Button */}
                {lookupResult.visit_status && (
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      Today's Visit Status
                    </h4>
                    <div className="flex items-center gap-2">
                      {lookupResult.visit_status.already_checked_in_today ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            Already checked in today
                          </span>
                        </div>
                      ) : lookupResult.visit_status.can_check_in ? (
                        <div className="flex items-center gap-2 text-blue-600">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            Ready to check in
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            Cannot check in
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-red-600">
                User not found with the provided QR code
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lookup Error */}
      {lookupError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{lookupError}</AlertDescription>
        </Alert>
      )}

      {/* Search and User List - Shows ONLY gym-specific users */}
      <Card>
        <CardHeader>
          <CardTitle>Member QR Codes</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by QR code, username, email, or phone..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyUp={(e) => e.key === "Enter" && handleSearchSubmit()}
                className="pl-10"
                maxLength={50}
              />
            </div>
            <Button
              onClick={handleSearchSubmit}
              disabled={lookupLoading || searchTerm.trim().length < 3}
              size="sm"
              className="shrink-0"
            >
              {lookupLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleScanQR}
              className="shrink-0"
            >
              <Camera className="w-4 h-4 mr-2" />
              Scan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Loading users...
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No users found matching your search.
                </div>
              ) : (
                filteredUsers.slice(0, 20).map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          hasQRCode(user)
                            ? "bg-green-100 text-green-600"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        <QrCode className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-medium">{user.display_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            className={`${
                              getMembershipStatusColor(user) === "green"
                                ? "bg-green-100 text-green-800"
                                : getMembershipStatusColor(user) === "orange"
                                ? "bg-orange-100 text-orange-800"
                                : getMembershipStatusColor(user) === "red"
                                ? "bg-red-100 text-red-800"
                                : getMembershipStatusColor(user) === "yellow"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {getMembershipStatusDisplay(user)}
                          </Badge>
                          {isVisitBased(user) && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-blue-100 text-blue-800"
                            >
                              Visit-Based
                            </Badge>
                          )}
                          {hasQRCode(user) ? (
                            <span className="text-xs text-green-600 font-medium font-mono">
                              QR: {user.qr_code.unique_id}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">
                              No QR Code
                            </span>
                          )}
                        </div>
                        {user.membership.expiry_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Expires: {formatDate(user.membership.expiry_date)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasQRCode(user) ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateQR(user.id)}
                            disabled={qrCodeLoading}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Regenerate
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDownloadQR(user.qr_code.qr_code_url)
                            }
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleGenerateQR(user.id)}
                          disabled={qrCodeLoading}
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          Generate QR
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Scanner */}
      <QRScanner
        isOpen={scannerActive}
        onClose={handleScannerClose}
        onScan={handleQRScanned}
      />
      {editingUserFromQR && (
        <EditMemberDialog
          user={editingUserFromQR}
          open={assignMembershipDialogOpen}
          onOpenChange={setAssignMembershipDialogOpen}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
