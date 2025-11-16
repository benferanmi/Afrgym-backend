import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  User,
  Mail,
  Calendar,
  CreditCard,
  QrCode,
  ExternalLink,
  UserCheck,
  Clock,
  TrendingUp,
  Pause,
  Play,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  GymUser,
  getMembershipStatusColor,
  formatDate,
  // Import visit-based utility functions
  isVisitBased,
  canCheckin,
  hasCheckedInToday,
  getVisitStatusText,
  getVisitProgressPercentage,
  getDaysUntilVisitReset,
  formatVisitInfo,
} from "@/stores/usersStore";

interface ViewMemberDialogProps {
  user: GymUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (user: GymUser) => void;
}

export function ViewMemberDialog({
  user,
  open,
  onOpenChange,
  onEdit,
}: ViewMemberDialogProps) {
  if (!user) return null;

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getMembershipStatusBadge = () => {
    const color = getMembershipStatusColor(user);
    const variants = {
      green: "bg-green-100 text-green-800",
      orange: "bg-orange-100 text-orange-800",
      red: "bg-red-100 text-red-800",
      gray: "bg-gray-100 text-gray-800",
    };
    return (
      variants[color as keyof typeof variants] || "bg-gray-100 text-gray-800"
    );
  };

  const handleViewQRCode = () => {
    if (user.qr_code.qr_code_url) {
      window.open(user.qr_code.qr_code_url, "_blank");
    }
  };

  // Get formatted visit information if user has visit-based membership
  const visitInfo = isVisitBased(user) ? formatVisitInfo(user) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage
                src={user.profile_picture_url || user.avatar_url}
                alt={user.display_name}
              />
              <AvatarFallback>
                {getInitials(user.first_name, user.last_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-xl font-semibold">{user.display_name}</div>
              <div className="text-sm text-muted-foreground">
                @{user.username}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Complete member information and membership details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Basic Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  First Name
                </label>
                <div className="text-sm">{user.first_name}</div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Last Name
                </label>
                <div className="text-sm">{user.last_name}</div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Phone Number
                </label>
                <div className="text-sm">{user.phone || "N/A"}</div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Email
                </label>
                <div className="text-sm">{user.email}</div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Registered
                </label>
                <div className="text-sm">{formatDate(user.registered)}</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Membership Information */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Membership Information
            </h4>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Status:
                </label>
                <Badge className={getMembershipStatusBadge()}>
                  {user.membership.is_active ? "Active" : "Inactive"}
                </Badge>
                {user.membership.is_paused && (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    <Pause className="h-3 w-3 mr-1" />
                    Paused
                  </Badge>
                )}
                {/* Visit-based membership badge */}
                {isVisitBased(user) && (
                  <Badge className="bg-blue-100 text-blue-800">
                    Visit-Based
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Membership Level
                  </label>
                  <div className="text-sm">
                    <Badge variant="outline">
                      {user.membership.level_name}
                    </Badge>
                  </div>
                </div>

                {user.membership.level_id && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Level ID
                    </label>
                    <div className="text-sm font-mono">
                      {user.membership.level_id}
                    </div>
                  </div>
                )}
              </div>

              {/* Visit-based membership details */}
              {isVisitBased(user) && visitInfo ? (
                <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Visit Information
                    </h5>
                    {canCheckin(user) ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Can Check In
                      </Badge>
                    ) : hasCheckedInToday(user) ? (
                      <Badge className="bg-blue-100 text-blue-800">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Checked In Today
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800">
                        <XCircle className="h-3 w-3 mr-1" />
                        Cannot Check In
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Total Visits</div>
                      <div className="font-medium">
                        {visitInfo.total_visits}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Used</div>
                      <div className="font-medium">{visitInfo.used_visits}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Remaining</div>
                      <div className="font-medium text-green-600">
                        {visitInfo.remaining_visits}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Reset In</div>
                      <div className="font-medium">
                        {visitInfo.daysUntilReset} days
                      </div>
                    </div>
                  </div>

                  {/* Visit progress bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Visit Progress</span>
                      <span>{visitInfo.progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={visitInfo.progress} className="h-2" />
                  </div>

                  {/* Visit status message */}
                  <div className="text-sm p-2 bg-white rounded border">
                    {visitInfo.status}
                  </div>

                  {/* Visit cycle information */}
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>
                      Cycle Start: {formatDate(visitInfo.cycle_start_date)}
                    </div>
                    <div>Cycle End: {formatDate(visitInfo.cycle_end_date)}</div>
                    <div>Next Reset: {visitInfo.resetDate}</div>
                  </div>

                  {/* Recent visit log */}
                  {visitInfo.visit_log.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Recent Check-ins:
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {visitInfo.visit_log.slice(-5).map((date, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs"
                          >
                            {formatDate(date)}
                          </Badge>
                        ))}
                        {visitInfo.visit_log.length > 5 && (
                          <Badge
                            variant="outline"
                            className="text-xs text-muted-foreground"
                          >
                            +{visitInfo.visit_log.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Time-based membership details
                user.membership.start_date && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Start Date
                      </label>
                      <div className="text-sm">
                        {formatDate(user.membership.start_date)}
                      </div>
                    </div>

                    {user.membership.expiry_date && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Expiry Date
                        </label>
                        <div className="text-sm">
                          {formatDate(user.membership.expiry_date)}
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}

              {/* Pause Information */}
              {user.membership.is_paused && user.membership.pause_info && (
                <div className="bg-yellow-50 p-4 rounded-lg space-y-3">
                  <h5 className="font-medium flex items-center gap-2">
                    <Pause className="h-4 w-4" />
                    Pause Information
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Paused On</div>
                      <div className="font-medium">
                        {formatDate(user.membership.pause_info.pause_date)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Days Paused</div>
                      <div className="font-medium">
                        {user.membership.pause_info.days_paused_so_far} days
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">
                        Remaining Days
                      </div>
                      <div className="font-medium">
                        {user.membership.pause_info.remaining_days} days
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Total Paused</div>
                      <div className="font-medium">
                        {user.membership.pause_info.total_paused_days} days
                      </div>
                    </div>
                  </div>
                  {user.membership.pause_info.current_end_date && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">
                        Current End Date:{" "}
                      </span>
                      <span className="font-medium">
                        {formatDate(
                          user.membership.pause_info.current_end_date
                        )}
                      </span>
                    </div>
                  )}

                  {/* Pause history */}
                  {user.membership.pause_info.pause_history.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Pause History:
                      </label>
                      <div className="space-y-1">
                        {user.membership.pause_info.pause_history
                          .slice(-3)
                          .map((entry, index) => (
                            <div
                              key={index}
                              className="text-xs bg-white p-2 rounded border"
                            >
                              <span className="font-medium capitalize">
                                {entry.action}
                              </span>{" "}
                              on {formatDate(entry.date)}
                              {entry.reason && (
                                <div className="text-muted-foreground mt-1">
                                  Reason: {entry.reason}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {user.membership.description && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Description
                  </label>
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: user.membership.description,
                      }}
                      className="prose prose-sm max-w-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* QR Code Information */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              QR Code Information
            </h4>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground">
                  QR Code Status:
                </label>
                <Badge
                  variant={user.qr_code.has_qr_code ? "default" : "secondary"}
                >
                  {user.qr_code.has_qr_code ? "Generated" : "Not Generated"}
                </Badge>
              </div>

              {user.qr_code.has_qr_code && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Unique ID
                      </label>
                      <div className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {user.qr_code.unique_id}
                      </div>
                    </div>

                    {user.qr_code.generated_by && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">
                          Generated By
                        </label>
                        <div className="text-sm">
                          {user.qr_code.generated_by}
                        </div>
                      </div>
                    )}
                  </div>

                  {user.qr_code.qr_code_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleViewQRCode}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View QR Code
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Notes Section */}
          {user.notes && user.notes.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium">Notes</h4>
                <div className="space-y-2">
                  {user.notes.map((note, index) => (
                    <div
                      key={index}
                      className="text-sm bg-muted p-3 rounded-lg"
                    >
                      {String(note)}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onEdit && (
            <Button
              onClick={() => onEdit(user)}
              className="gradient-gym text-white"
            >
              Edit Member
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
