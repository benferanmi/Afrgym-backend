import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Fingerprint,
  Loader2,
  X,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useCheckinCacheStore, FingerprintEnrollment } from "@/stores/checkinCacheStore";
import {
  GymUser,
  getMembershipStatusColor,
  getMembershipStatusDisplay,
} from "@/stores/usersStore";

const BASE_URL = "https://afrgym.com.ng/wp-json/gym-admin/v1";

async function apiCall(endpoint: string, options: RequestInit = {}) {
  const authState = localStorage.getItem("gym-auth-storage");
  let token: string | null = null;
  if (authState) {
    try {
      token = JSON.parse(authState)?.state?.token ?? null;
    } catch {
      /* ignore */
    }
  }
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || `Request failed (${res.status})`);
  }
  return res.json();
}

interface FingerprintEnrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FingerprintEnrollDialog({
  open,
  onOpenChange,
}: FingerprintEnrollDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GymUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [selectedMember, setSelectedMember] = useState<GymUser | null>(null);
  const [selectedGym, setSelectedGym] = useState<string>("");
  const [existingEnrollment, setExistingEnrollment] = useState<FingerprintEnrollment | null>(null);
  const [isLoadingEnrollment, setIsLoadingEnrollment] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceSerial, setDeviceSerial] = useState("");
  const [isManualSerial, setIsManualSerial] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState(false);

  // Reset state helper
  const handleReset = () => {
    setSearchQuery("");
    setDebouncedQuery("");
    setSearchResults([]);
    setSelectedMember(null);
    setSelectedGym("");
    setExistingEnrollment(null);
    setIsConnected(false);
    setDeviceSerial("");
    setIsManualSerial(false);
    setEnrollError("");
    setEnrollSuccess(false);
  };

  useEffect(() => {
    if (!open) {
      handleReset();
    }
  }, [open]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Perform search call
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedQuery.trim().length < 3) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      setSearchError("");
      try {
        const response = await apiCall(
          `/users?search=${encodeURIComponent(debouncedQuery)}&page=1&per_page=8`
        );
        if (response && response.users) {
          setSearchResults(response.users);
        } else {
          setSearchResults([]);
        }
      } catch (err: any) {
        console.error("Search failed:", err);
        setSearchError(err.message || "Failed to search members.");
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  // Load status and enrollment check
  const loadGymAndEnrollmentData = async (gym: string, userId: number) => {
    setIsLoadingStatus(true);
    setIsLoadingEnrollment(true);
    setEnrollError("");
    
    try {
      // 1. Get device status
      const statusData = await apiCall(`/fingerprint/status?gym_identifier=${gym}`);
      if (statusData && statusData.success) {
        setIsConnected(statusData.is_connected ?? false);
        setDeviceSerial(statusData.device_serial ?? "");
      } else {
        setIsConnected(false);
        setDeviceSerial("");
      }

      // 2. Get enrolled fingerprints
      const enrolledData = await apiCall(`/fingerprint/enrolled?gym_identifier=${gym}`);
      if (enrolledData && enrolledData.success && enrolledData.enrollments) {
        const activeEnrollment = enrolledData.enrollments.find(
          (e: any) => e.user_id === userId && e.is_active === true
        );
        setExistingEnrollment(activeEnrollment || null);
      }
    } catch (err: any) {
      console.error("Failed to fetch gym status or enrollment data:", err);
      setEnrollError(err.message || "Failed to fetch status/enrollment data.");
    } finally {
      setIsLoadingStatus(false);
      setIsLoadingEnrollment(false);
    }
  };

  const handleGymChange = async (gym: string) => {
    setSelectedGym(gym);
    setExistingEnrollment(null);
    setIsConnected(false);
    setDeviceSerial("");
    setIsManualSerial(false);
    
    if (selectedMember) {
      await loadGymAndEnrollmentData(gym, selectedMember.id);
    }
  };

  const handleMemberSelect = async (member: GymUser) => {
    setSelectedMember(member);
    setSearchQuery("");
    setSearchResults([]);
    
    if (selectedGym) {
      await loadGymAndEnrollmentData(selectedGym, member.id);
    }
  };

  const handleEnroll = async () => {
    if (!selectedMember || !selectedGym) return;
    
    if (!deviceSerial && !isManualSerial) {
      setEnrollError("Device Serial is required. Connect a device or enter serial manually.");
      return;
    }

    setIsSubmitting(true);
    setEnrollError("");
    
    try {
      const result = await apiCall("/fingerprint/enroll", {
        method: "POST",
        body: JSON.stringify({
          user_id: selectedMember.id,
          zk_pin: String(selectedMember.id),
          device_serial: deviceSerial,
          gym_identifier: selectedGym
        })
      });

      const otherGymLabel = result?.other_gym_identifier === "afrgym_two" ? "Gym Two" : "Gym One";
      const zkPin = String(selectedMember.id);
      
      switch (result?.link_status) {
        case "created":
        case "reactivated":
          toast.success(
            `Enrolled here. ID ${zkPin} is also reserved on ${otherGymLabel}'s device — just scan this member there and use the same ID, no extra form needed.`
          );
          break;
        case "already_active":
          toast.success("Fingerprint registered on database successfully.");
          break;
        case "collision":
          toast.warning(
            `Enrolled here, but ID ${zkPin} is already used by a different member on ${otherGymLabel}'s device. Pick a different ID when scanning this member there.`
          );
          break;
        case "not_configured":
          toast.success(
            `Fingerprint registered on database successfully. (${otherGymLabel}'s device isn't configured yet, so it wasn't auto-linked there.)`
          );
          break;
        default:
          toast.success("Fingerprint registered on database successfully.");
      }

      // Sync Gym One cache if Gym One is selected
      if (selectedGym === "afrgym_one") {
        useCheckinCacheStore.getState().syncCache().catch((err) => {
          console.warn("Auto sync cache failed:", err);
        });
      }

      setEnrollSuccess(true);
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.message || "Failed to save enrollment to database.";
      setEnrollError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0) || ""}${lastName.charAt(0) || ""}`.toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-primary animate-pulse" />
            Fast Fingerprint Enrollment
          </DialogTitle>
          <DialogDescription>
            Search for a member, verify their PIN, select the gym device, and register their fingerprint.
          </DialogDescription>
        </DialogHeader>

        {enrollSuccess ? (
          <div className="space-y-6 py-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-green-800">Enrollment Logged Successfully!</h3>
              <p className="text-sm text-muted-foreground">
                The fingerprint enrollment configuration has been saved on the database for{" "}
                <strong className="text-foreground">{selectedMember?.display_name}</strong>.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <Button variant="outline" onClick={handleReset}>
                Enroll Another
              </Button>
              <Button onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Step 1: Search member */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Step 1: Select Member</Label>
              {selectedMember ? (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/40 shadow-sm border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 text-primary flex items-center justify-center rounded-full font-bold overflow-hidden">
                      {selectedMember.profile_picture_url || selectedMember.avatar_url ? (
                        <img
                          src={selectedMember.profile_picture_url || selectedMember.avatar_url}
                          alt={selectedMember.display_name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        getInitials(selectedMember.first_name, selectedMember.last_name)
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm flex items-center gap-2">
                        {selectedMember.display_name}
                        <Badge
                          className={
                            getMembershipStatusColor(selectedMember) === "green"
                              ? "bg-green-100 text-green-800"
                              : getMembershipStatusColor(selectedMember) === "orange"
                              ? "bg-orange-100 text-orange-800"
                              : getMembershipStatusColor(selectedMember) === "red"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {getMembershipStatusDisplay(selectedMember)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {selectedMember.email} {selectedMember.phone && `• ${selectedMember.phone}`}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedMember(null);
                      setExistingEnrollment(null);
                    }}
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search member by name, email, or phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {isSearching && (
                    <div className="flex items-center justify-center p-4 border rounded-lg bg-card text-muted-foreground text-xs gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Searching members...
                    </div>
                  )}
                  {searchError && (
                    <div className="text-xs text-red-600 font-medium px-1">
                      {searchError}
                    </div>
                  )}
                  {!isSearching && searchQuery.trim().length >= 3 && searchResults.length === 0 && (
                    <div className="text-center p-4 border rounded-lg bg-card text-muted-foreground text-xs">
                      No members found.
                    </div>
                  )}
                  {!isSearching && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-lg max-h-[220px] overflow-y-auto">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => handleMemberSelect(user)}
                          className="flex items-center gap-3 p-3 hover:bg-muted/80 cursor-pointer border-b last:border-0 transition-colors"
                        >
                          <div className="w-8 h-8 bg-muted text-muted-foreground flex items-center justify-center rounded-full text-xs font-semibold overflow-hidden shrink-0">
                            {user.profile_picture_url || user.avatar_url ? (
                              <img
                                src={user.profile_picture_url || user.avatar_url}
                                alt={user.display_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              getInitials(user.first_name, user.last_name)
                            )}
                          </div>
                          <div className="flex-grow min-w-0">
                            <div className="text-sm font-medium truncate flex items-center gap-1.5">
                              {user.display_name}
                              <Badge
                                className={
                                  getMembershipStatusColor(user) === "green"
                                    ? "bg-green-100 text-green-800 text-[10px] px-1.5 py-0"
                                    : getMembershipStatusColor(user) === "orange"
                                    ? "bg-orange-100 text-orange-800 text-[10px] px-1.5 py-0"
                                    : getMembershipStatusColor(user) === "red"
                                    ? "bg-red-100 text-red-800 text-[10px] px-1.5 py-0"
                                    : "bg-yellow-100 text-yellow-800 text-[10px] px-1.5 py-0"
                                }
                              >
                                {getMembershipStatusDisplay(user)}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {user.email} {user.phone && `| ${user.phone}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedMember && (
              <>
                {/* Step 2: PIN display */}
                <div className="space-y-2 border-t pt-4 animate-fade-in">
                  <Label className="text-sm font-semibold">Step 2: Device PIN Configuration</Label>
                  <div className="p-4 border rounded-lg bg-muted/20 flex flex-col items-center justify-center text-center space-y-3">
                    <p className="text-xs text-muted-foreground max-w-[400px]">
                      The ZK Device PIN is tied to the WordPress User ID.
                    </p>
                    <div className="text-4xl font-extrabold font-mono text-primary bg-primary/5 px-6 py-2.5 rounded-lg border border-primary/10 tracking-wider">
                      {selectedMember.id}
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p className="font-semibold text-foreground">Instructions:</p>
                      <p>1. Type this PIN on the physical device keypad.</p>
                      <p>2. Have the member scan their finger 3 times on the ZKTeco device now.</p>
                    </div>
                  </div>
                </div>

                {/* Step 3: Gym / device selection */}
                <div className="space-y-2 border-t pt-4 animate-fade-in">
                  <Label className="text-sm font-semibold">Step 3: Select Gym Location</Label>
                  <Select value={selectedGym} onValueChange={handleGymChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a gym location..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="afrgym_one">Gym One</SelectItem>
                      <SelectItem value="afrgym_two">Gym Two</SelectItem>
                    </SelectContent>
                  </Select>

                  {selectedGym && (
                    <div className="bg-muted/10 p-4 rounded-lg border border-muted/20 space-y-4 mt-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-xs">Scanner Device:</span>
                        {isLoadingStatus ? (
                          <span className="flex items-center gap-1 text-muted-foreground text-xs">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Checking status...
                          </span>
                        ) : isConnected ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px]">
                            Connected ({deviceSerial})
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            Disconnected {deviceSerial ? `(${deviceSerial})` : ""}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="deviceSerial" className="text-[11px] text-muted-foreground">Device Serial Number</Label>
                          {!isConnected && (
                            <div className="flex items-center gap-1.5">
                              <Switch
                                id="manual-serial-toggle"
                                checked={isManualSerial}
                                onCheckedChange={setIsManualSerial}
                              />
                              <Label htmlFor="manual-serial-toggle" className="text-[10px] text-muted-foreground cursor-pointer">
                                Enter Manually
                              </Label>
                            </div>
                          )}
                        </div>

                        {isConnected ? (
                          <div className="h-9 px-3 py-1 bg-green-50/50 text-green-800 border border-green-200/50 rounded-md flex items-center justify-between text-xs font-mono">
                            <span>Device Serial: {deviceSerial || "Unknown"}</span>
                            <span className="text-[10px] text-green-600 font-sans">✓ auto-detected</span>
                          </div>
                        ) : isManualSerial ? (
                          <Input
                            id="deviceSerial"
                            value={deviceSerial}
                            onChange={(e) => setDeviceSerial(e.target.value)}
                            placeholder="e.g. SN1234567890"
                            className="h-9 font-mono text-xs"
                          />
                        ) : (
                          <Input
                            id="deviceSerial"
                            value={deviceSerial}
                            disabled
                            placeholder="No device connected (offline)"
                            className="h-9 font-mono text-xs bg-muted cursor-not-allowed"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 4: Already enrolled warning block */}
                {selectedGym && !isLoadingEnrollment && existingEnrollment && (
                  <div className="space-y-2 border-t pt-4 animate-fade-in">
                    <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 p-4 rounded-md space-y-2 shadow-sm">
                      <div className="flex items-center gap-2 font-semibold text-xs">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span>Warning: Member Already Enrolled</span>
                      </div>
                      <p className="text-[11px] text-amber-700">
                        This member already has an active fingerprint enrollment on this gym's device.
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono mt-1 border-t border-amber-200/50 pt-2 text-amber-800">
                        <div>PIN: {existingEnrollment.zk_pin}</div>
                        <div>Scan Count: {existingEnrollment.scan_count}</div>
                        <div className="col-span-2 truncate">
                          Enrolled: {new Date(existingEnrollment.enrolled_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {enrollError && (
                  <div className="text-xs text-red-600 font-medium px-1 pt-2">
                    Error: {enrollError}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter className="border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          {!enrollSuccess && selectedMember && selectedGym && (
            existingEnrollment ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={
                      isSubmitting ||
                      isLoadingStatus ||
                      isLoadingEnrollment ||
                      (!deviceSerial && !isManualSerial)
                    }
                    className="gradient-gym text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging Enrollment...
                      </>
                    ) : (
                      "Log Enrollment"
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Overwrite Existing Enrollment?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This member is already enrolled on the {selectedGym === "afrgym_one" ? "Gym One" : "Gym Two"} device.
                      Re-enrolling will overwrite their existing access configuration. Are you sure you want to proceed?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleEnroll}
                      className="bg-amber-600 text-white hover:bg-amber-700 font-semibold"
                    >
                      Confirm & Re-enroll
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button
                onClick={handleEnroll}
                disabled={
                  isSubmitting ||
                  isLoadingStatus ||
                  isLoadingEnrollment ||
                  (!deviceSerial && !isManualSerial)
                }
                className="gradient-gym text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging Enrollment...
                  </>
                ) : (
                  "Log Enrollment"
                )}
              </Button>
            )
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
