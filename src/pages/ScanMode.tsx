import { useState, useEffect, useRef } from "react";
import { useCheckinCacheStore } from "@/stores/checkinCacheStore";
import { GymUser, useUsersStore } from "@/stores/usersStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Wifi,
  WifiOff,
  User,
  Calendar,
  Shield,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  History,
  Edit,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { EditMemberDialog } from "@/components/members/EditMemberDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const BASE_URL = "https://afrgym.com.ng/wp-json/gym-admin/v1";
const GYM_IDENTIFIER = "afrgym_one";
const GYM_NAME = "Afrgym One";

interface StatusResponse {
  success: boolean;
  gym_identifier: string;
  device_serial: string;
  is_connected: boolean;
  last_seen: string | null;
  last_scan: {
    id: number;
    user_id: number;
    zk_pin: string;
    device_serial: string;
    gym_identifier: string;
    last_scan: string;
    scan_count: number;
  } | null;
}

export default function ScanMode() {
  const { lookupByPin, isSyncing, syncCache, lastSyncedAt } = useCheckinCacheStore();
  const [isActive, setIsActive] = useState(true);
  const [deviceStatus, setDeviceStatus] = useState<{
    isConnected: boolean;
    serial: string;
    lastSeen: string | null;
  } | null>(null);

  const [scannedUser, setScannedUser] = useState<GymUser | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessReason, setAccessReason] = useState("");
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editUserTarget, setEditUserTarget] = useState<GymUser | null>(null);
  
  const [viewScanDialogOpen, setViewScanDialogOpen] = useState(false);
  const [selectedScan, setSelectedScan] = useState<{
    user: GymUser;
    time: string;
    status: "granted" | "denied";
    reason?: string;
  } | null>(null);

  const [recentScans, setRecentScans] = useState<Array<{
    user: GymUser;
    time: string;
    status: "granted" | "denied";
    reason?: string;
  }>>([]);

  const lastScanRef = useRef<{
    last_scan: string;
    scan_count: number;
  } | null>(null);

  const effectiveIsActive = isActive && !editDialogOpen && !viewScanDialogOpen;

  // Poll fingerprint status
  useEffect(() => {
    if (!effectiveIsActive) return;

    const fetchStatus = async () => {
      try {
        const authState = localStorage.getItem("gym-auth-storage");
        let token = null;
        if (authState) {
          try {
            const parsedAuth = JSON.parse(authState);
            token = parsedAuth.state?.token;
          } catch (e) {
            console.warn(e);
          }
        }

        const res = await fetch(
          `${BASE_URL}/fingerprint/status?gym_identifier=${GYM_IDENTIFIER}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );

        if (!res.ok) throw new Error("Failed to fetch fingerprint status");

        const data: StatusResponse = await res.json();

        setDeviceStatus({
          isConnected: data.is_connected,
          serial: data.device_serial,
          lastSeen: data.last_seen,
        });

        if (data.last_scan) {
          const currentScan = {
            last_scan: data.last_scan.last_scan,
            scan_count: data.last_scan.scan_count,
          };

          const isNewScan =
            !lastScanRef.current ||
            lastScanRef.current.last_scan !== currentScan.last_scan ||
            lastScanRef.current.scan_count !== currentScan.scan_count;

          if (isNewScan) {
            lastScanRef.current = currentScan;
            handleFingerprintScan(data.last_scan.zk_pin);
          }
        }
      } catch (err) {
        console.error("Fingerprint status poll error:", err);
      }
    };

    // Run immediately then poll every 3 seconds.
    // Reasoning: The actual bottleneck is device-side push delay (5-40+ seconds, confirmed
    // from production logs), not the polling interval. Polling faster than the device can
    // push doesn't reduce perceived latency in any meaningful way, but it does double/triple
    // request load on the backend for no benefit — and the backend is already showing signs
    // of load strain (unrelated MCProtectFW plugin logging MySQL "commands out of sync" errors
    // during normal operation). 3s is a safe, low-load default.
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);

    return () => clearInterval(interval);
  }, [effectiveIsActive]);

  const evaluateAccess = (user: GymUser) => {
    const membership = user.membership;
    const hasActiveMembership = membership && membership.is_active;
    const isPaused = membership && membership.is_paused;
    const isVisitBased = membership && membership.is_visit_based;

    let remainingVisits = isVisitBased && membership.visit_info ? membership.visit_info.remaining_visits : 0;

    let isGranted = hasActiveMembership && !isPaused;
    let reason = "";

    if (!hasActiveMembership) {
      isGranted = false;
      reason = "Membership is inactive or expired";
    } else if (isPaused) {
      isGranted = false;
      reason = "Membership is currently paused";
    } else if (isVisitBased && remainingVisits <= 0) {
      isGranted = false;
      reason = "No remaining visits in this membership cycle";
    }
    
    return { isGranted, reason };
  };

  const handleFingerprintScan = async (pin: string) => {
    try {
      const user = await lookupByPin(pin);
      const scanTime = new Date().toLocaleTimeString();

      if (!user) {
        setScannedUser(null);
        setAccessDenied(true);
        setAccessReason(`Unknown PIN: ${pin}`);
        return;
      }

      setScannedUser(user);

      const { isGranted, reason } = evaluateAccess(user);

      setAccessDenied(!isGranted);
      setAccessReason(reason);

      // Prepend to recent scans
      setRecentScans((prev) => [
        {
          user,
          time: scanTime,
          status: isGranted ? "granted" : "denied",
          reason: reason || undefined,
        },
        ...prev.slice(0, 4), // Keep last 5 scans
      ]);
    } catch (err: any) {
      console.error(err);
      setAccessDenied(true);
      setAccessReason("Error verifying scanned PIN");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleCheckinUser = async () => {
    if (!scannedUser?.id) return;

    try {
      setIsCheckingIn(true);
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

      const response = await fetch(
        `${BASE_URL}/checkin/${scannedUser.id}`,
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
        setScannedUser({
          ...scannedUser,
          membership: {
            ...scannedUser.membership!,
            visit_info: data.visit_info,
          },
        });
        alert(`Check-in successful! ${data.visit_info.remaining_visits} visits remaining.`);
      }
    } catch (err: any) {
      alert(err.message || "Failed to check in user");
    } finally {
      setIsCheckingIn(false);
    }
  };

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const isVisitBased = scannedUser?.membership?.is_visit_based;
  const visitLog = scannedUser?.membership?.visit_info?.visit_log || [];
  const alreadyCheckedIn = visitLog.includes(today);
  const remainingVisits = scannedUser?.membership?.visit_info?.remaining_visits || 0;
  const canCheckIn = isVisitBased && scannedUser?.membership?.is_active && (remainingVisits > 0) && !alreadyCheckedIn;

  return (
    <div className="space-y-6">
      {/* Top controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Live Scan Mode ({GYM_NAME})</h1>
          <p className="text-muted-foreground mt-1">
            Real-time biometric monitoring of gym entry and check-in logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={syncCache}
            disabled={isSyncing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={isSyncing ? "animate-spin w-4 h-4" : "w-4 h-4"} />
            Sync Local Cache
          </Button>

          <Button
            variant={isActive ? "destructive" : "default"}
            onClick={() => setIsActive(!isActive)}
            className="flex items-center gap-2"
          >
            {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isActive ? "Pause Scanning" : "Resume Scanning"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Device Connection & Status info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Biometric Terminal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <span className="text-sm font-medium">Scanner Connection</span>
                {deviceStatus?.isConnected ? (
                  <Badge className="bg-green-500 text-white hover:bg-green-600 flex items-center gap-1.5 animate-pulse">
                    <Wifi className="w-3.5 h-3.5" />
                    Live
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="flex items-center gap-1.5">
                    <WifiOff className="w-3.5 h-3.5" />
                    Offline
                  </Badge>
                )}
              </div>

              {deviceStatus && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Serial Number:</span>
                    <span className="font-mono font-medium">{deviceStatus.serial || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Ping:</span>
                    <span>{deviceStatus.lastSeen ? new Date(deviceStatus.lastSeen).toLocaleTimeString() : "N/A"}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent scans list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Recent Scans
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentScans.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No scan events recorded this session.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentScans.map((scan, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedScan(scan);
                        setViewScanDialogOpen(true);
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg border text-sm bg-muted/10 hover:bg-muted/20 transition-colors text-left"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {scan.user.display_name}
                        </span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {scan.time}
                        </span>
                      </div>
                      <Badge
                        variant={scan.status === "granted" ? "default" : "destructive"}
                        className={scan.status === "granted" ? "bg-green-100 text-green-800 hover:bg-green-100 border-green-200" : ""}
                      >
                        {scan.status === "granted" ? "Granted" : "Denied"}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Lookup Profile Display */}
        <div className="lg:col-span-2">
          {scannedUser ? (
            <Card className={`border-2 shadow-lg transition-all duration-300 ${accessDenied ? "border-red-500 bg-red-50/10" : "border-green-500 bg-green-50/10"}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  {accessDenied ? (
                    <XCircle className="w-6 h-6 text-red-500 animate-bounce" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6 text-green-500 animate-bounce" />
                  )}
                  Access Decision: {accessDenied ? "DENIED" : "GRANTED"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* User details layout */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                  <div className="w-24 h-24 bg-muted rounded-full flex-shrink-0 border overflow-hidden shadow-inner">
                    {scannedUser.profile_picture_url || scannedUser.avatar_url ? (
                      <img
                        src={scannedUser.profile_picture_url || scannedUser.avatar_url}
                        alt={scannedUser.display_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-muted-foreground m-6" />
                    )}
                  </div>

                  <div className="text-center sm:text-left space-y-1">
                    <h2 className="text-2xl font-bold text-foreground">
                      {scannedUser.display_name}
                    </h2>
                    <p className="text-sm text-muted-foreground">{scannedUser.email}</p>
                    {scannedUser.phone && (
                      <p className="text-sm font-medium text-foreground">{scannedUser.phone}</p>
                    )}
                    <div className="pt-2 flex flex-wrap justify-center sm:justify-start gap-2">
                      <Badge variant="outline" className="font-mono">
                        UID: {scannedUser.id}
                      </Badge>
                      {scannedUser.qr_code?.unique_id && (
                        <Badge variant="secondary" className="font-mono">
                          QR: {scannedUser.qr_code.unique_id}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Membership plan info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Membership Verification
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-card p-4 rounded-xl border">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground uppercase font-bold">Plan Level</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-foreground">
                          {scannedUser.membership?.level_name || "No Plan"}
                        </span>
                        {scannedUser.membership?.is_visit_based && (
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                            Visit-Based
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground uppercase font-bold">Start Date</span>
                      <div className="flex items-center gap-1.5 text-foreground">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          {formatDate(scannedUser.membership?.start_date)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground uppercase font-bold">Expiry Date</span>
                      <div className="flex items-center gap-1.5 text-foreground">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          {formatDate(scannedUser.membership?.expiry_date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Visit based info if any */}
                  {scannedUser.membership?.is_visit_based && scannedUser.membership.visit_info && (
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
                      <h4 className="font-semibold text-sm text-blue-900 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        Remaining Visits Tracker
                      </h4>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-white p-3 rounded-lg border border-blue-100">
                          <p className="text-xs text-muted-foreground">Remaining</p>
                          <p className="text-2xl font-bold text-green-600">
                            {scannedUser.membership.visit_info.remaining_visits}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-blue-100">
                          <p className="text-xs text-muted-foreground">Used</p>
                          <p className="text-2xl font-bold text-foreground">
                            {scannedUser.membership.visit_info.used_visits}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-blue-100">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-2xl font-bold text-foreground">
                            {scannedUser.membership.visit_info.total_visits}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Access Status Card */}
                  <div
                    className={`p-4 rounded-xl border-2 flex items-start gap-3 transition-colors ${accessDenied
                        ? "bg-red-100/40 border-red-300 text-red-900"
                        : "bg-green-100/40 border-green-300 text-green-900"
                      }`}
                  >
                    {accessDenied ? (
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold">
                          {accessDenied ? "Access Rejected" : "Access Granted"}
                        </h4>
                        <p className="text-sm mt-0.5 opacity-90">
                          {accessDenied ? accessReason : "Biometric credentials match and membership is fully active."}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {canCheckIn && (
                          <Button
                            size="sm"
                            onClick={handleCheckinUser}
                            disabled={isCheckingIn}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md transition-all hover:scale-105 active:scale-95"
                          >
                            {isCheckingIn ? "Checking in..." : "Check In Now"}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant={accessDenied ? "default" : "outline"}
                          className={accessDenied ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                          onClick={() => {
                            setEditUserTarget(scannedUser);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-1.5" />
                          Assign / Change Plan
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[400px] flex flex-col items-center justify-center text-center p-6 border-dashed border-2">
              <div className="p-4 bg-muted rounded-full mb-4">
                <User className="w-12 h-12 text-muted-foreground animate-pulse" />
              </div>
              <h3 className="text-xl font-bold mb-1">Awaiting Scanner Input...</h3>
              <p className="text-muted-foreground max-w-sm text-sm">
                Place user fingerprint on the connected reader to display status and access verification.
              </p>
              {accessDenied && (
                <div className="mt-4 p-3 bg-red-100/50 border border-red-200 text-red-800 rounded-lg text-sm flex items-center gap-2 max-w-md">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{accessReason}</span>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      <Dialog open={viewScanDialogOpen} onOpenChange={setViewScanDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Recent Scan Details</DialogTitle>
          </DialogHeader>
          {selectedScan && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-muted rounded-full overflow-hidden border">
                  {(selectedScan.user.profile_picture_url || selectedScan.user.avatar_url) ? (
                    <img
                      src={selectedScan.user.profile_picture_url || selectedScan.user.avatar_url}
                      alt={selectedScan.user.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-muted-foreground m-4" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selectedScan.user.display_name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {selectedScan.time}
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg border space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Membership Status</span>
                  <Badge variant={selectedScan.status === "granted" ? "default" : "destructive"}>
                    {selectedScan.status === "granted" ? "Granted" : "Denied"}
                  </Badge>
                </div>
                {selectedScan.reason && (
                  <div className="flex justify-between items-start text-sm">
                    <span className="text-muted-foreground whitespace-nowrap mr-4">Reason</span>
                    <span className="text-right font-medium text-red-600">{selectedScan.reason}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">{selectedScan.user.membership?.level_name || "None"}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Expiry</span>
                  <span className="font-medium">{formatDate(selectedScan.user.membership?.expiry_date)}</span>
                </div>
              </div>

              <Button
                className="w-full"
                variant={selectedScan.status === "denied" ? "default" : "outline"}
                onClick={() => {
                  setViewScanDialogOpen(false);
                  setEditUserTarget(selectedScan.user);
                  setEditDialogOpen(true);
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Assign / Change Plan
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <EditMemberDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={editUserTarget}
        onSuccess={() => {
          // Re-evaluate live panel if it matches the edited user
          if (scannedUser && editUserTarget && scannedUser.id === editUserTarget.id) {
            const updatedUser = useUsersStore.getState().users.find((u) => u.id === scannedUser.id);
            if (updatedUser) {
              setScannedUser(updatedUser);
              const { isGranted, reason } = evaluateAccess(updatedUser);
              setAccessDenied(!isGranted);
              setAccessReason(reason);
            }
          }
        }}
      />
    </div>
  );
}