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
  useUsersStore,
  GymUser,
  getMembershipStatusDisplay,
  getMembershipStatusColor,
  formatDate,
} from "@/stores/usersStore";
import { EditMemberDialog } from "@/components/members/EditMemberDialog";
import { AddMemberDialog } from "@/components/members/AddMemberDialog";
import { ViewMemberDialog } from "@/components/members/ViewMemberDialog";

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

  // Load users on component mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = getFilteredUsers();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getMembershipStatusBadge = (user: any) => {
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

  const handleEditUser = (user: GymUser) => {
    setEditingUser(user);
    setEditDialogOpen(true);
  };

  const handleViewUser = (user: GymUser) => {
    setViewingUser(user);
    selectUser(user); // Keep this for compatibility with existing store logic
    setViewDialogOpen(true);
  };

  const handleViewToEdit = (user: GymUser) => {
    setViewDialogOpen(false);
    handleEditUser(user);
  };

  const handleEditSuccess = () => {
    // Refresh the users list after successful edit
    fetchUsers(currentPage, searchTerm);
  };

  const handleAddSuccess = () => {
    // Refresh the users list after successful add
    fetchUsers(currentPage, searchTerm);
  };

  const handleDeleteUser = async (userId: number) => {
    if (window.confirm("Are you sure you want to delete this member?")) {
      try {
        await deleteUser(userId);
        // Refresh the users list
        fetchUsers(currentPage, searchTerm);
      } catch (error) {
        console.error("Failed to delete user:", error);
      }
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    // The store will automatically trigger API call
  };

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
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
                          src={user.avatar_url}
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
                      <Badge variant="outline" className="mb-1">
                        {user.membership.level_name}
                      </Badge>
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
                      {user.membership.is_active ? "Active" : "Inactive"}
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
                        {/* ?   <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Member
                        </DropdownMenuItem> */}
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
