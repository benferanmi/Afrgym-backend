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
} from "lucide-react";
import {
  useUsersStore,
  hasQRCode,
  formatDate,
  formatQRCodeStatistics,
  // Import visit-based utilities
  isVisitBased,
  getMembershipStatusDisplay,
  getMembershipStatusColor,
} from "@/stores/usersStore";
import { QRScanner } from "@/components/QRScanner";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { Separator } from "@/components/ui/separator";

export default function QRCodes() {
  const {
    users,
    loading,
    error,
    qrCodeStatistics,
    qrCodeLoading,
    fetchUsers,
    lookupUserByQRCode,
    lookupAndCheckinByQRCode,
    getQRCodeStatistics,
    clearError,
    generateUserQRCode,
  } = useUsersStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [showCheckinOption, setShowCheckinOption] = useState(false);

  // Load initial data
  useEffect(() => {
    fetchUsers();
    getQRCodeStatistics();
  }, [fetchUsers, getQRCodeStatistics]);

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user) =>
      user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.qr_code.unique_id &&
        user.qr_code.unique_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleQRCodeLookup = async (qrCodeValue, performCheckin = false) => {
    if (!qrCodeValue.trim()) return;

    setLookupLoading(true);
    setLookupError("");
    setLookupResult(null);

    try {
      const result = await lookupAndCheckinByQRCode(
        qrCodeValue.trim(),
        performCheckin
      );
      setLookupResult(result);

      if (!result.user_found) {
        setLookupError("No user found with this QR code");
      } else {
        // Show check-in option if user is visit-based and can check in
        setShowCheckinOption(
          result.user.membership?.is_visit_based &&
            result.visit_status?.can_check_in
        );
      }
    } catch (err) {
      setLookupError(err.message || "Failed to lookup QR code");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCheckinUser = async () => {
    if (!lookupResult?.user?.unique_id) return;

    try {
      setLookupLoading(true);
      const result = await lookupAndCheckinByQRCode(
        lookupResult.user.unique_id,
        true // Perform check-in
      );
      setLookupResult(result);
      setShowCheckinOption(false);
    } catch (err) {
      setLookupError(err.message || "Failed to check in user");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);

    // If the search looks like a QR code (8 digits alphanumeric), also do a lookup
    if (value.length === 8 && /^[A-Za-z0-9]{8}$/.test(value)) {
      handleQRCodeLookup(value);
    } else {
      setLookupResult(null);
      setLookupError("");
      setShowCheckinOption(false);
    }
  };

  const handleGenerateQR = async (userId) => {
    try {
      await generateUserQRCode(userId);
      // Refresh statistics after generating
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

    // Extract the 8-digit code from scanned data
    let qrCode = scannedData;

    // If it's a URL, extract the code from it
    if (scannedData.includes("/")) {
      const urlParts = scannedData.split("/");
      qrCode = urlParts[urlParts.length - 1];
    }

    // Validate that it's an 8-digit alphanumeric code
    if (/^[A-Za-z0-9]{8}$/.test(qrCode)) {
      setSearchTerm(qrCode);
      handleQRCodeLookup(qrCode);
      console.log("Valid QR code detected:", qrCode);
    } else {
      setLookupError(
        "Invalid QR code format. Expected 8-digit alphanumeric code."
      );
      console.log("Invalid QR code format:", scannedData);
    }

    setScannerActive(false);
  };

  // Get access status color and icon
  const getAccessStatusDisplay = (result) => {
    if (!result.access_status) return { color: "gray", icon: AlertCircle };

    const canAccess = result.access_status.can_access;
    return {
      color: canAccess ? "green" : "red",
      icon: canAccess ? CheckCircle2 : XCircle,
    };
  };

  // Format statistics for display
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

      {/* Error Display */}
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

      {/* Enhanced QR Code Lookup Result */}
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
              QR Code Lookup Result
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
                      <Avatar className="w-20 h-20">
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

                {/* Visit Status and Check-in */}
                {lookupResult.visit_status && (
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      Today's Visit Status
                    </h4>
                    <div className="flex items-center justify-between">
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

                      {showCheckinOption &&
                        lookupResult.visit_status.can_check_in && (
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

      {/* Search and User List */}
      <Card>
        <CardHeader>
          <CardTitle>Member QR Codes</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search members or enter 8-digit QR code..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
                maxLength={50}
              />
            </div>
            {lookupLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Looking up QR code...
              </div>
            )}
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
    </div>
  );
}
