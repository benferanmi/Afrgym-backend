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
} from "lucide-react";
import {
  useUsersStore,
  hasQRCode,
  formatDate,
  formatQRCodeStatistics,
} from "@/stores/usersStore";
import { QRScanner } from "@/components/QRScanner"; // Import the QR scanner component

export default function QRCodes() {
  const {
    users,
    loading,
    error,
    qrCodeStatistics,
    qrCodeLoading,
    fetchUsers,
    lookupUserByQRCode,
    getQRCodeStatistics,
    clearError,
    generateUserQRCode,
  } = useUsersStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");

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

  const handleQRCodeLookup = async (qrCodeValue) => {
    if (!qrCodeValue.trim()) return;

    setLookupLoading(true);
    setLookupError("");
    setLookupResult(null);

    try {
      const result = await lookupUserByQRCode(qrCodeValue.trim());
      setLookupResult(result);

      if (!result.user_found) {
        setLookupError("No user found with this QR code");
      }
    } catch (err) {
      setLookupError(err.message || "Failed to lookup QR code");
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
    // The scanned data might be a URL or just the code itself
    let qrCode = scannedData;
    
    // If it's a URL, extract the code from it
    if (scannedData.includes('/')) {
      const urlParts = scannedData.split('/');
      qrCode = urlParts[urlParts.length - 1];
    }
    
    // Validate that it's an 8-digit alphanumeric code
    if (/^[A-Za-z0-9]{8}$/.test(qrCode)) {
      // Set the search term to the scanned code
      setSearchTerm(qrCode);
      
      // Automatically lookup the user
      handleQRCodeLookup(qrCode);
      
      // Show success feedback
      console.log("Valid QR code detected:", qrCode);
    } else {
      // Invalid QR code format
      setLookupError("Invalid QR code format. Expected 8-digit alphanumeric code.");
      console.log("Invalid QR code format:", scannedData);
    }
    
    // Close scanner after successful scan
    setScannerActive(false);
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
            Generate and manage member QR codes
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleScanQR}
            variant="default"
          >
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

      {/* QR Code Lookup Result */}
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
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">
                  {lookupResult.user.name}
                </h3>
                <p className="text-muted-foreground">
                  {lookupResult.user.email}
                </p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      lookupResult.user.membership.status === "active"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {lookupResult.user.membership.plan}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Status: {lookupResult.user.membership.status}
                  </span>
                </div>
                {lookupResult.user.membership.expiry_date && (
                  <p className="text-sm">
                    Expires:{" "}
                    {formatDate(lookupResult.user.membership.expiry_date)}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  QR Code: {lookupResult.user.unique_id}
                </p>
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
                maxLength={50} // Reasonable limit for search
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
                            variant={
                              user.membership.is_active
                                ? "default"
                                : "secondary"
                            }
                          >
                            {user.membership.level_name || "No Membership"}
                          </Badge>
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