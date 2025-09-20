import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  Loader2,
  Pause,
  Play,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  useUsersStore,
  GymUser,
  getMembershipStatusDisplay,
  getMembershipStatusColor,
  formatDate,
} from "@/stores/usersStore";
import { EditMemberDialog } from "@/components/members/EditMemberDialog";
import { AddMemberDialog } from "@/components/members/AddMemberDialog";
import { ViewMemberDialog } from "@/components/members/ViewMemberDialog";

const BASE_URL = "https://afrgym.com.ng/wp-json/gym-admin/v1";

// Helper function to make API calls with auth
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${BASE_URL}${endpoint}`;

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

  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, defaultOptions);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `HTTP error! status: ${response.status}`
    );
  }

  return response.json();
};

export default function Members() {
  const {
    users,
    loading,
    error,
    searchTerm,
    filterStatus,
    currentPage,
    totalPages,
    total,
    fetchUsers,
    setSearchTerm,
    setFilterStatus,
    setCurrentPage,
    getFilteredUsers,
    selectUser,
    deleteUser,
    clearError,
  } = useUsersStore();

  // State for edit dialog
  const [editingUser, setEditingUser] = useState<GymUser | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // State for add dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // State for view dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<GymUser | null>(null);

  // State for pause dialog
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [pausingUser, setPausingUser] = useState<GymUser | null>(null);
  const [pauseReason, setPauseReason] = useState("");

  // State for unpause confirmation
  const [unpauseDialogOpen, setUnpauseDialogOpen] = useState(false);
  const [unpausingUser, setUnpausingUser] = useState<GymUser | null>(null);

  // Loading states for pause/unpause actions
  const [pauseLoading, setPauseLoading] = useState(false);
  const [unpauseLoading, setUnpauseLoading] = useState(false);

  // Load users on component mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = getFilteredUsers();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getMembershipStatusBadge = (user: any) => {
    // Check if membership is paused
    if (user.membership.is_paused) {
      return "bg-yellow-100 text-yellow-800";
    }

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

  const getMembershipStatusText = (user: GymUser) => {
    if (user.membership.is_paused) {
      return "Paused";
    }
    return user.membership.is_active ? "Active" : "Inactive";
  };

  const handleEditUser = (user: GymUser) => {
    setEditingUser(user);
    setEditDialogOpen(true);
  };

  const handleViewUser = (user: GymUser) => {
    setViewingUser(user);
    selectUser(user);
    setViewDialogOpen(true);
  };

  const handleViewToEdit = (user: GymUser) => {
    setViewDialogOpen(false);
    handleEditUser(user);
  };

  const handleEditSuccess = () => {
    fetchUsers(currentPage, searchTerm);
  };

  const handleAddSuccess = () => {
    fetchUsers(currentPage, searchTerm);
  };

  const handleDeleteUser = async (userId: number) => {
    if (window.confirm("Are you sure you want to delete this member?")) {
      try {
        await deleteUser(userId);
        fetchUsers(currentPage, searchTerm);
      } catch (error) {
        console.error("Failed to delete user:", error);
      }
    }
  };

  const handlePauseMembership = (user: GymUser) => {
    setPausingUser(user);
    setPauseReason("");
    setPauseDialogOpen(true);
  };

  const handleUnpauseMembership = (user: GymUser) => {
    setUnpausingUser(user);
    setUnpauseDialogOpen(true);
  };

  const executePauseMembership = async () => {
    if (!pausingUser) return;

    setPauseLoading(true);
    try {
      const response = await apiCall(`/memberships/${pausingUser.id}/pause`, {
        method: "POST",
        body: JSON.stringify({ reason: pauseReason }),
      });

      if (response.success) {
        // Show success message
        console.log("Membership paused successfully:", response.message);

        // Close dialog and refresh users
        setPauseDialogOpen(false);
        setPausingUser(null);
        setPauseReason("");
        fetchUsers(currentPage, searchTerm);
      }
    } catch (error) {
      console.error("Failed to pause membership:", error);
      alert(
        "Failed to pause membership: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setPauseLoading(false);
    }
  };

  const executeUnpauseMembership = async () => {
    if (!unpausingUser) return;

    setUnpauseLoading(true);
    try {
      const response = await apiCall(
        `/memberships/${unpausingUser.id}/unpause`,
        {
          method: "POST",
        }
      );

      if (response.success) {
        // Show success message
        console.log("Membership unpaused successfully:", response.message);

        // Close dialog and refresh users
        setUnpauseDialogOpen(false);
        setUnpausingUser(null);
        fetchUsers(currentPage, searchTerm);
      }
    } catch (error) {
      console.error("Failed to unpause membership:", error);
      alert(
        "Failed to unpause membership: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setUnpauseLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const canPauseMembership = (user: GymUser) => {
    return user.membership.is_active && !user.membership.is_paused;
  };

  const canUnpauseMembership = (user: GymUser) => {
    return user.membership.is_paused;
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading members...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
          <p className="text-muted-foreground">
            Manage your gym members and their memberships. ({total} total
            members)
          </p>
        </div>
        <Button
          className="gradient-gym text-white"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            {error}
            <Button variant="outline" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members by name, email, username, or QR code..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Status: {filterStatus === "all" ? "All" : filterStatus}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleFilterChange("all")}>
                  All Members
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFilterChange("active")}>
                  Active Membership
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFilterChange("paused")}>
                  Paused Membership
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleFilterChange("inactive")}
                >
                  Inactive Membership
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleFilterChange("no_membership")}
                >
                  No Membership
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Members List ({filteredUsers.length})</span>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Membership</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>QR Code</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage
                          src={user.profile_picture_url || user.avatar_url}
                          alt={user.display_name}
                        />
                        <AvatarFallback>
                          {getInitials(user.first_name, user.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.display_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          @{user.username}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">
                          {user.membership.level_name}
                        </Badge>
                        {user.membership.is_paused && (
                          <Badge
                            variant="outline"
                            className="bg-yellow-100 text-yellow-800"
                          >
                            <Pause className="h-3 w-3 mr-1" />
                            Paused
                          </Badge>
                        )}
                      </div>
                      {user.membership.expiry_date && (
                        <div className="text-xs text-muted-foreground">
                          Expires: {formatDate(user.membership.expiry_date)}
                        </div>
                      )}
                      {user.membership.start_date && (
                        <div className="text-xs text-muted-foreground">
                          Started: {formatDate(user.membership.start_date)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getMembershipStatusBadge(user)}>
                      {getMembershipStatusText(user)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {user.qr_code.has_qr_code ? (
                        <>
                          <div className="font-mono text-xs bg-muted px-2 py-1 rounded">
                            {user.qr_code.unique_id}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Generated by {user.qr_code.generated_by}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          No QR Code
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{formatDate(user.registered)}</div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleViewUser(user)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditUser(user)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Member
                        </DropdownMenuItem>
                        {user.qr_code.qr_code_url && (
                          <DropdownMenuItem
                            onClick={() =>
                              window.open(user.qr_code.qr_code_url!, "_blank")
                            }
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View QR Code
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />

                        {/* Pause/Unpause Actions */}
                        {canPauseMembership(user) && (
                          <DropdownMenuItem
                            onClick={() => handlePauseMembership(user)}
                            className="text-orange-600"
                          >
                            <Pause className="mr-2 h-4 w-4" />
                            Pause Membership
                          </DropdownMenuItem>
                        )}

                        {canUnpauseMembership(user) && (
                          <DropdownMenuItem
                            onClick={() => handleUnpauseMembership(user)}
                            className="text-green-600"
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Resume Membership
                          </DropdownMenuItem>
                        )}

                        {user.membership.is_paused && (
                          <DropdownMenuItem
                            onClick={() => handleViewUser(user)}
                            className="text-blue-600"
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            View Pause Details
                          </DropdownMenuItem>
                        )}

                        {/* Uncomment if delete functionality is needed
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Member
                        </DropdownMenuItem>
                        */}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({total} total members)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredUsers.length === 0 && !loading && (
            <div className="text-center py-8">
              <div className="text-muted-foreground">
                {searchTerm || filterStatus !== "all"
                  ? "No members match your search criteria."
                  : "No members found. Add your first member to get started."}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pause Membership Dialog */}
      <Dialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause Membership</DialogTitle>
            <DialogDescription>
              Pause {pausingUser?.display_name}'s membership. The membership
              will be extended by the number of days it remains paused.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="pause-reason">Reason for Pause (Optional)</Label>
              <Textarea
                id="pause-reason"
                placeholder="Enter reason for pausing membership..."
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                rows={3}
              />
            </div>

            {pausingUser && (
              <div className="bg-muted p-3 rounded-lg">
                <h4 className="font-medium mb-2">
                  Current Membership Details:
                </h4>
                <div className="text-sm space-y-1">
                  <div>
                    Plan:{" "}
                    <span className="font-medium">
                      {pausingUser.membership.level_name}
                    </span>
                  </div>
                  {pausingUser.membership.expiry_date && (
                    <div>
                      Expires:{" "}
                      <span className="font-medium">
                        {formatDate(pausingUser.membership.expiry_date)}
                      </span>
                    </div>
                  )}
                  <div className="text-muted-foreground text-xs mt-2">
                    When unpaused, the expiry date will be extended by the
                    number of days the membership was paused.
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPauseDialogOpen(false)}
              disabled={pauseLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={executePauseMembership}
              disabled={pauseLoading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {pauseLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Pausing...
                </>
              ) : (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause Membership
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unpause Membership Dialog */}
      <Dialog open={unpauseDialogOpen} onOpenChange={setUnpauseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resume Membership</DialogTitle>
            <DialogDescription>
              Resume {unpausingUser?.display_name}'s paused membership. The
              expiry date will be automatically extended.
            </DialogDescription>
          </DialogHeader>

          {unpausingUser && (
            <div className="bg-muted p-3 rounded-lg">
              <h4 className="font-medium mb-2">Membership Details:</h4>
              <div className="text-sm space-y-1">
                <div>
                  Plan:{" "}
                  <span className="font-medium">
                    {unpausingUser.membership.level_name}
                  </span>
                </div>
                {unpausingUser.membership.expiry_date && (
                  <div>
                    Current Expiry:{" "}
                    <span className="font-medium">
                      {formatDate(unpausingUser.membership.expiry_date)}
                    </span>
                  </div>
                )}
                <div className="text-green-600 text-xs mt-2">
                  The expiry date will be extended by the number of days the
                  membership was paused.
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUnpauseDialogOpen(false)}
              disabled={unpauseLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={executeUnpauseMembership}
              disabled={unpauseLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {unpauseLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resuming...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Resume Membership
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Member Dialog */}
      <ViewMemberDialog
        user={viewingUser}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        onEdit={handleViewToEdit}
      />

      {/* Edit Member Dialog */}
      <EditMemberDialog
        user={editingUser}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleEditSuccess}
      />

      {/* Add Member Dialog */}
      <AddMemberDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
