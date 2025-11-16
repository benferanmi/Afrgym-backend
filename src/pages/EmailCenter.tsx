import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Mail,
  Send,
  Users,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  TestTube,
  TrendingUp,
  BarChart3,
  Zap,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { useUsersStore } from "@/stores/usersStore";
import {
  useEmailStore,
  EmailTemplate as StoreEmailTemplate,
  SingleEmailPayload,
  BulkEmailPayload,
  BulkEmailByCategoryPayload,
} from "@/stores/emailStore";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

type RecipientType =
  | "all"
  | "active"
  | "expired"
  | "inactive"
  | "expiring"
  | "membership"
  | "specific";

const EmailModes = {
  TEMPLATE_ONLY: "template_only",
  CUSTOM_WITH_TEMPLATE: "custom_with_template",
  CUSTOM_ONLY: "custom_only",
} as const;

type EmailMode = (typeof EmailModes)[keyof typeof EmailModes];

interface MembershipLevel {
  id: number;
  name: string;
}

export default function EmailCenter() {
  const {
    users,
    fetchUsers,
    loading: usersLoading,
    recipientStats,
    recipientStatsLoading,
    fetchRecipientStats,
  } = useUsersStore();
  const {
    templates,
    templatesCategories,
    emailLogs,
    emailStats,
    loading,
    sendingEmail,
    loadingPreview,
    loadingStats,
    error,
    logsHasMore,
    fetchTemplates,
    sendSingleEmail,
    sendBulkEmail,
    previewEmail,
    sendTestEmail,
    fetchEmailLogs,
    fetchEmailStats,
    clearError,
    resetLogs,
    sendBulkEmailByCategory,
  } = useEmailStore();

  // Extract unique membership levels from users
  const membershipLevels: MembershipLevel[] = Array.from(
    new Map(
      users
        .filter(
          (user) => user.membership.level_id && user.membership.level_name
        )
        .map((user) => [
          user.membership.level_id,
          {
            id: parseInt(user.membership.level_id!),
            name: user.membership.level_name,
          },
        ])
    ).values()
  );

  // All users state (for pagination in specific member selection)
  const [allUsers, setAllUsers] = useState<typeof users>([]);
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);

  // Form state
  const [selectedTemplate, setSelectedTemplate] =
    useState<StoreEmailTemplate | null>(null);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [selectedRecipients, setSelectedRecipients] =
    useState<RecipientType>("all");
  const [specificUserId, setSpecificUserId] = useState<string>("");
  const [selectedMembershipIds, setSelectedMembershipIds] = useState<string[]>(
    []
  );

  // Pagination for specific member selection
  const [specificMemberPage, setSpecificMemberPage] = useState(1);
  const [specificMemberSearch, setSpecificMemberSearch] = useState("");
  const [specificMemberTotal, setSpecificMemberTotal] = useState(0);
  const [specificMemberTotalPages, setSpecificMemberTotalPages] = useState(1);

  // UI state
  const [emailMode, setEmailMode] = useState<EmailMode>(
    EmailModes.TEMPLATE_ONLY
  );
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [testEmailDialogOpen, setTestEmailDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [previewContent, setPreviewContent] = useState<{
    subject: string;
    content: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState("compose");

  // Load all users for specific member selection with pagination
  const loadAllUsersForSelection = async (
    page: number = 1,
    search: string = ""
  ) => {
    setLoadingAllUsers(true);
    try {
      await fetchUsers(page, search, 100); // 100 per page for better selection
      setAllUsers(users);
      setSpecificMemberTotal(users.length);
      setSpecificMemberTotalPages(Math.ceil(users.length / 20));
    } catch (error) {
      console.error("Failed to load users for selection:", error);
      toast.error("Failed to load users");
    } finally {
      setLoadingAllUsers(false);
    }
  };
  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Fetch recipient stats FIRST and independently (most critical for UI)
        fetchRecipientStats();

        // Fetch other data in parallel
        const promises = [];

        if (!templates) {
          promises.push(fetchTemplates());
        }
        if (emailLogs.length === 0) {
          promises.push(fetchEmailLogs());
        }
        if (!emailStats) {
          promises.push(fetchEmailStats());
        }

        await Promise.all(promises);
      } catch (err) {
        console.error("Failed to initialize email data:", err);
      }
    };

    initializeData();
  }, []);

  // Clear error automatically
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  useEffect(() => {
    if (users.length === 0) {
      fetchUsers(1, "", 100); // Load more users initially
    }
  }, [fetchUsers, users.length]);

  // Load all users when specific recipient type is selected
  useEffect(() => {
    if (selectedRecipients === "specific" && allUsers.length === 0) {
      loadAllUsersForSelection();
    }
  }, [selectedRecipients]);

  // Handle search in specific member selection
  useEffect(() => {
    if (selectedRecipients === "specific") {
      const debounceTimer = setTimeout(() => {
        loadAllUsersForSelection(1, specificMemberSearch);
        setSpecificMemberPage(1);
      }, 300);

      return () => clearTimeout(debounceTimer);
    }
  }, [specificMemberSearch, selectedRecipients]);

  // Determine email mode based on form state
  useEffect(() => {
    const hasTemplate = !!selectedTemplateKey;
    const hasCustomSubject = !!emailSubject.trim();
    const hasCustomContent = !!emailContent.trim();

    if (hasTemplate && !hasCustomSubject && !hasCustomContent) {
      setEmailMode(EmailModes.TEMPLATE_ONLY);
    } else if (hasTemplate && (hasCustomSubject || hasCustomContent)) {
      setEmailMode(EmailModes.CUSTOM_WITH_TEMPLATE);
    } else if (!hasTemplate && (hasCustomSubject || hasCustomContent)) {
      setEmailMode(EmailModes.CUSTOM_ONLY);
    }
  }, [selectedTemplateKey, emailSubject, emailContent]);

  const handleTemplateSelect = (templateKey: string) => {
    // Handle the "custom-none" option
    if (templateKey === "custom-none" || templateKey === "") {
      setSelectedTemplate(null);
      setSelectedTemplateKey("");
      if (emailMode === EmailModes.TEMPLATE_ONLY) {
        setEmailSubject("");
        setEmailContent("");
      }
      return;
    }

    if (!templates || !templates[templateKey]) return;

    const template = templates[templateKey];
    setSelectedTemplate(template);
    setSelectedTemplateKey(templateKey);

    // Only clear custom fields if switching to a different template
    if (emailMode === EmailModes.TEMPLATE_ONLY) {
      setEmailSubject("");
      setEmailContent("");
    }
  };

  const resetForm = () => {
    setSelectedTemplate(null);
    setSelectedTemplateKey("");
    setEmailSubject("");
    setEmailContent("");
    setSelectedRecipients("all");
    setSpecificUserId("");
    setSelectedMembershipIds([]);
    setSpecificMemberSearch("");
    setSpecificMemberPage(1);
  };

  const getRecipientUsers = () => {
    let targetUsers = users;

    // For "all" recipients, ensure we have all users loaded
    if (selectedRecipients === "all" && users.length < 100) {
      targetUsers = users; // Use what we have for now
    }

    switch (selectedRecipients) {
      case "all":
        return targetUsers;
      case "active":
        return targetUsers.filter(
          (u) => u.membership.is_active && !u.membership.is_paused
        );
      case "inactive":
        return targetUsers.filter(
          (u) =>
            !u.membership.is_active || u.membership.status === "no_membership"
        );

      case "expiring":
        return targetUsers.filter((u) => {
          if (!u.membership.expiry_date || !u.membership.is_active)
            return false;
          const expiryDate = new Date(u.membership.expiry_date);
          const today = new Date();
          const diffTime = expiryDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= 7 && diffDays > 0;
        });
      case "membership":
        if (selectedMembershipIds.length === 0) return [];
        return targetUsers.filter((u) =>
          selectedMembershipIds.includes(
            u.membership.level_id?.toString() || ""
          )
        );
      case "expired":
        return targetUsers.filter((u) => {
          if (!u.membership.expiry_date) return false;
          const expiryDate = new Date(u.membership.expiry_date);
          const today = new Date();
          return expiryDate < today && u.membership.status !== "no_membership";
        });
      case "specific": {
        const user = (allUsers.length > 0 ? allUsers : targetUsers).find(
          (u) => u.id.toString() === specificUserId
        );
        return user ? [user] : [];
      }
      default:
        return [];
    }
  };

  const getRecipientCount = () => {
    // For specific user selection, use local calculation since we have the actual user data
    if (selectedRecipients === "specific") {
      const recipients = getRecipientUsers();
      return recipients.length;
    }

    // For all other recipient types, ONLY use API stats
    // This ensures consistent counts from the backend database
    if (!recipientStats) {
      return 0; // Return 0 while loading, not a calculated value
    }

    switch (selectedRecipients) {
      case "all":
        return recipientStats.all;
      case "active":
        return recipientStats.active;
      case "inactive":
        return recipientStats.inactive;
      case "expired":
        return recipientStats.expired;
      case "expiring":
        return recipientStats.expiring_7days;
      case "membership":
        if (selectedMembershipIds.length === 0) return 0;
        return recipientStats.by_membership
          .filter((level) =>
            selectedMembershipIds.includes(level.id.toString())
          )
          .reduce((sum, level) => sum + level.count, 0);
      default:
        return 0;
    }
  };

  const validateForm = () => {
    if (emailMode === EmailModes.CUSTOM_ONLY && !emailSubject.trim()) {
      toast.error("Please enter an email subject for custom emails");
      return false;
    }

    if (emailMode === EmailModes.CUSTOM_ONLY && !emailContent.trim()) {
      toast.error("Please enter email content for custom emails");
      return false;
    }

    if (emailMode === EmailModes.TEMPLATE_ONLY && !selectedTemplateKey) {
      toast.error("Please select an email template");
      return false;
    }

    const recipientUsers = getRecipientUsers();
    if (recipientUsers.length === 0) {
      toast.error("No recipients selected");
      return false;
    }

    return true;
  };

  /**
   * UPDATED handleSendEmail function for EmailCenter.tsx
   * Replace the existing handleSendEmail function with this optimized version
   */

  const handleSendEmail = async () => {
    if (!validateForm()) return;

    try {
      // For specific user, still use single/traditional bulk endpoint
      if (selectedRecipients === "specific") {
        const recipientUsers = getRecipientUsers();

        if (recipientUsers.length === 1) {
          // Send single email
          const user = recipientUsers[0];
          const payload: SingleEmailPayload = {
            user_id: user.id,
            custom_data: {
              user_name: `${user.first_name} ${user.last_name}`,
              membership_plan: user.membership.level_name,
              expiry_date: user.membership.expiry_date || "N/A",
            },
          };

          if (selectedTemplateKey) payload.template = selectedTemplateKey;
          if (emailSubject.trim()) payload.custom_subject = emailSubject;
          if (emailContent.trim()) payload.custom_content = emailContent;

          await sendSingleEmail(payload);
          toast.success("Email sent successfully!");
        } else {
          // Multiple specific users - use traditional bulk
          const payload: BulkEmailPayload = {
            user_ids: recipientUsers.map((u) => u.id),
            custom_data: {},
          };

          if (selectedTemplateKey) payload.template = selectedTemplateKey;
          if (emailSubject.trim()) payload.custom_subject = emailSubject;
          if (emailContent.trim()) payload.custom_content = emailContent;

          const result = await sendBulkEmail(payload);

          if (result.failed > 0) {
            toast.warning(
              `Sent to ${result.sent} recipients, ${result.failed} failed`
            );
          } else {
            toast.success(
              `Bulk email sent to ${result.sent} recipients successfully!`
            );
          }
        }
      } else {
        // ✨ NEW: Use category-based bulk sending for all other recipient types
        // This is much more efficient - no need to load all users!

        let recipient_type: BulkEmailByCategoryPayload["recipient_type"];

        // Map frontend recipient type to backend category
        switch (selectedRecipients) {
          case "all":
            recipient_type = "all";
            break;
          case "active":
            recipient_type = "active";
            break;
          case "inactive":
            recipient_type = "inactive";
            break;
          case "expired": // ✨ NEW: Maps to backend 'expired' category
            recipient_type = "expired"; // ✨ NEW
            break;
          case "expiring":
            recipient_type = "expiring_7days";
            break;
          case "membership":
            recipient_type = "membership";
            break;
          default:
            throw new Error("Invalid recipient type");
        }

        const payload: BulkEmailByCategoryPayload = {
          recipient_type,
          custom_data: {},
        };

        // Add membership level IDs if applicable
        if (
          selectedRecipients === "membership" &&
          selectedMembershipIds.length > 0
        ) {
          payload.membership_level_ids = selectedMembershipIds;
        }

        // Add email content
        if (selectedTemplateKey) payload.template = selectedTemplateKey;
        if (emailSubject.trim()) payload.custom_subject = emailSubject;
        if (emailContent.trim()) payload.custom_content = emailContent;

        // Send using new category-based endpoint
        const result = await sendBulkEmailByCategory(payload);

        if (result.failed > 0) {
          toast.warning(
            `Sent to ${result.sent} recipients, ${result.failed} failed`
          );
        } else {
          toast.success(
            `Bulk email sent to ${result.sent} recipients successfully!`
          );
        }
      }

      resetForm();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send email";
      toast.error(errorMessage);
    }
  };

  const handlePreviewEmail = async () => {
    if (!selectedTemplateKey && !emailSubject && !emailContent) {
      toast.error(
        "Please select a template or enter custom content to preview"
      );
      return;
    }

    try {
      const payload: Record<string, unknown> = {};
      if (selectedTemplateKey) payload.template = selectedTemplateKey;
      if (emailSubject.trim()) payload.custom_subject = emailSubject;
      if (emailContent.trim()) payload.custom_content = emailContent;

      // Use first recipient for realistic preview if available
      const recipients = getRecipientUsers();
      if (recipients.length > 0) {
        payload.user_id = recipients[0].id;
      }

      const preview = await previewEmail(payload);
      setPreviewContent({
        subject: preview.subject,
        content: preview.content,
      });
      setPreviewDialogOpen(true);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to preview email";
      toast.error(errorMessage);
    }
  };

  const handleSendTestEmail = async () => {
    if (!selectedTemplateKey) {
      toast.error("Please select a template to test");
      return;
    }

    if (!testEmail.trim()) {
      toast.error("Please enter a test email address");
      return;
    }

    try {
      await sendTestEmail({
        template: selectedTemplateKey,
        test_email: testEmail.trim(),
      });
      toast.success(`Test email sent to ${testEmail}`);
      setTestEmailDialogOpen(false);
      setTestEmail("");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send test email";
      toast.error(errorMessage);
    }
  };

  const handleSpecificMemberPageChange = (newPage: number) => {
    setSpecificMemberPage(newPage);
    loadAllUsersForSelection(newPage, specificMemberSearch);
  };

  const getTemplateArray = () => {
    if (!templates) return [];
    return Object.entries(templates).map(([key, template]) => ({
      key,
      ...template,
    }));
  };

  const getCategorizedTemplates = () => {
    if (!templates || !templatesCategories) {
      return { general: getTemplateArray() };
    }

    const categorized: Record<
      string,
      Array<StoreEmailTemplate & { key: string }>
    > = {};

    Object.entries(templatesCategories).forEach(([category, info]) => {
      categorized[category] = info.templates.map((templateKey) => ({
        key: templateKey,
        ...templates[templateKey],
      }));
    });

    return categorized;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "sent":
        return "default";
      case "pending":
        return "secondary";
      case "failed":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get filtered users for specific member selection
  const getFilteredUsersForSelection = () => {
    const targetUsers = allUsers.length > 0 ? allUsers : users;

    if (!specificMemberSearch.trim()) {
      return targetUsers;
    }

    const searchTerm = specificMemberSearch.toLowerCase();
    return targetUsers.filter(
      (user) =>
        user.display_name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        user.first_name.toLowerCase().includes(searchTerm) ||
        user.last_name.toLowerCase().includes(searchTerm)
    );
  };

  if (loading && !templates) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading email center...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Center</h1>
          <p className="text-muted-foreground mt-2">
            Send and manage email communications with your members
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          disabled={loading}
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Total Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {emailStats?.total_emails?.toLocaleString() || 0}
            </div>
            <p className="text-sm text-muted-foreground">
              Last {emailStats?.period_days || 30} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {emailStats?.by_status?.pending || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Delivery Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {emailStats?.delivery_rate || 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
      </div> */}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="compose">Compose Email</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">Email History</TabsTrigger>
          {/* <TabsTrigger value="analytics">Analytics</TabsTrigger> */}
        </TabsList>

        <TabsContent value="compose">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Compose New Email
                    <div className="flex gap-2">
                      <Dialog
                        open={previewDialogOpen}
                        onOpenChange={setPreviewDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePreviewEmail}
                            disabled={loadingPreview}
                          >
                            {loadingPreview ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                            Preview
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Email Preview</DialogTitle>
                          </DialogHeader>
                          {previewContent && (
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">
                                  Subject:
                                </label>
                                <p className="text-sm bg-muted p-2 rounded">
                                  {previewContent.subject}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">
                                  Content:
                                </label>
                                <div className="text-sm bg-muted p-4 rounded max-h-96 overflow-y-auto">
                                  {previewContent.content}
                                </div>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      {selectedTemplateKey && (
                        <Dialog
                          open={testEmailDialogOpen}
                          onOpenChange={setTestEmailDialogOpen}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <TestTube className="w-4 h-4" />
                              Test
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Send Test Email</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">
                                  Test Email Address
                                </label>
                                <Input
                                  type="email"
                                  placeholder="test@example.com"
                                  value={testEmail}
                                  onChange={(e) => setTestEmail(e.target.value)}
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => setTestEmailDialogOpen(false)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={handleSendTestEmail}
                                  disabled={sendingEmail}
                                >
                                  {sendingEmail ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  ) : (
                                    <Send className="w-4 h-4 mr-2" />
                                  )}
                                  Send Test
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Template Selection */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Email Template (Optional)
                    </label>
                    <Select
                      value={selectedTemplateKey}
                      onValueChange={handleTemplateSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template or create custom email" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom-none">
                          None (Custom Email)
                        </SelectItem>
                        {Object.entries(getCategorizedTemplates()).map(
                          ([category, templates]) => (
                            <div key={category}>
                              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                {templatesCategories?.[category]?.name ||
                                  category}
                              </div>
                              {templates.map((template) => (
                                <SelectItem
                                  key={template.key}
                                  value={template.key}
                                >
                                  {template.name}
                                </SelectItem>
                              ))}
                            </div>
                          )
                        )}
                      </SelectContent>
                    </Select>

                    {selectedTemplate && (
                      <div className="mt-2 p-3 bg-muted rounded-md">
                        <p className="text-sm font-medium">
                          {selectedTemplate.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedTemplate.description}
                        </p>
                        {selectedTemplate.variables.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium">
                              Available variables:
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedTemplate.variables.map((variable) => (
                                <Badge
                                  key={variable}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {`{{${variable}}}`}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Email Subject */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Email Subject
                      {emailMode === EmailModes.CUSTOM_ONLY && (
                        <span className="text-red-500">*</span>
                      )}
                      {emailMode === EmailModes.TEMPLATE_ONLY &&
                        selectedTemplate && (
                          <span className="text-muted-foreground ml-1">
                            (will use template subject)
                          </span>
                        )}
                    </label>
                    <Input
                      placeholder={
                        selectedTemplate
                          ? `Default: ${selectedTemplate.subject}`
                          : "Enter email subject"
                      }
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                    />
                  </div>

                  {/* Email Content */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Email Content
                      {emailMode === EmailModes.CUSTOM_ONLY && (
                        <span className="text-red-500">*</span>
                      )}
                      {emailMode === EmailModes.TEMPLATE_ONLY &&
                        selectedTemplate && (
                          <span className="text-muted-foreground ml-1">
                            (will use template content)
                          </span>
                        )}
                    </label>
                    <Textarea
                      placeholder={
                        selectedTemplate
                          ? "Leave empty to use template content, or enter custom content"
                          : "Enter your email content"
                      }
                      value={emailContent}
                      onChange={(e) => setEmailContent(e.target.value)}
                      rows={8}
                    />
                  </div>

                  {/* Email Mode Indicator */}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        emailMode === EmailModes.TEMPLATE_ONLY
                          ? "default"
                          : "secondary"
                      }
                    >
                      {emailMode === EmailModes.TEMPLATE_ONLY &&
                        "Template Mode"}
                      {emailMode === EmailModes.CUSTOM_WITH_TEMPLATE &&
                        "Template + Custom"}
                      {emailMode === EmailModes.CUSTOM_ONLY && "Custom Mode"}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {emailMode === EmailModes.TEMPLATE_ONLY &&
                        "Using template subject and content"}
                      {emailMode === EmailModes.CUSTOM_WITH_TEMPLATE &&
                        "Using custom content with template fallback"}
                      {emailMode === EmailModes.CUSTOM_ONLY &&
                        "Using only custom subject and content"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Recipients</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Select Recipients
                    </label>
                    <Select
                      value={selectedRecipients}
                      onValueChange={(value: string) =>
                        setSelectedRecipients(value as RecipientType)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Members</SelectItem>
                        <SelectItem value="active">Active Members</SelectItem>
                        <SelectItem value="inactive">
                          Inactive Members
                        </SelectItem>
                        <SelectItem value="expired">Expired Members</SelectItem>
                        <SelectItem value="expiring">
                          Expiring Soon (7 days)
                        </SelectItem>
                        <SelectItem value="membership">
                          By Membership Level
                        </SelectItem>
                        <SelectItem value="specific">
                          Specific Member
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Membership Level Selection */}
                  {selectedRecipients === "membership" && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Membership Levels
                      </label>
                      <div className="space-y-2">
                        {membershipLevels.map((level) => (
                          <div
                            key={level.id}
                            className="flex items-center space-x-2"
                          >
                            <input
                              type="checkbox"
                              id={`level-${level.id}`}
                              checked={selectedMembershipIds.includes(
                                level.id.toString()
                              )}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMembershipIds([
                                    ...selectedMembershipIds,
                                    level.id.toString(),
                                  ]);
                                } else {
                                  setSelectedMembershipIds(
                                    selectedMembershipIds.filter(
                                      (id) => id !== level.id.toString()
                                    )
                                  );
                                }
                              }}
                              className="rounded"
                            />
                            <label
                              htmlFor={`level-${level.id}`}
                              className="text-sm"
                            >
                              {level.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Specific User Selection with Search and Pagination */}
                  {selectedRecipients === "specific" && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium mb-2 block">
                        Select Member
                      </label>

                      {/* Search Input */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search members..."
                          value={specificMemberSearch}
                          onChange={(e) =>
                            setSpecificMemberSearch(e.target.value)
                          }
                          className="pl-9"
                        />
                      </div>

                      {/* Loading State */}
                      {loadingAllUsers && (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-sm text-muted-foreground">
                            Loading members...
                          </span>
                        </div>
                      )}

                      {/* Member Selection */}
                      <div className="border rounded-md max-h-64 overflow-y-auto">
                        {getFilteredUsersForSelection().map((user) => (
                          <div
                            key={user.id}
                            className={`flex items-center space-x-3 p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 ${
                              specificUserId === user.id.toString()
                                ? "bg-muted"
                                : ""
                            }`}
                            onClick={() =>
                              setSpecificUserId(user.id.toString())
                            }
                          >
                            <input
                              type="radio"
                              name="specific-member"
                              checked={specificUserId === user.id.toString()}
                              onChange={() =>
                                setSpecificUserId(user.id.toString())
                              }
                              className="rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {user.first_name} {user.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {user.email}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {user.membership.level_name ||
                                    "No Membership"}
                                </Badge>
                                {user.membership.is_active && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Active
                                  </Badge>
                                )}
                                {user.membership.is_paused && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Paused
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {getFilteredUsersForSelection().length === 0 &&
                          !loadingAllUsers && (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              {specificMemberSearch
                                ? "No members found matching your search."
                                : "No members available."}
                            </div>
                          )}
                      </div>

                      {/* Pagination for Specific Member Selection */}
                      {specificMemberTotalPages > 1 && (
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            Page {specificMemberPage} of{" "}
                            {specificMemberTotalPages}
                          </p>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleSpecificMemberPageChange(
                                  specificMemberPage - 1
                                )
                              }
                              disabled={
                                specificMemberPage <= 1 || loadingAllUsers
                              }
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleSpecificMemberPageChange(
                                  specificMemberPage + 1
                                )
                              }
                              disabled={
                                specificMemberPage >=
                                  specificMemberTotalPages || loadingAllUsers
                              }
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recipient Count */}
                  <div className="bg-muted p-3 rounded-md">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Recipients:</span>
                      {recipientStatsLoading || !recipientStats ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">
                            Loading...
                          </span>
                        </div>
                      ) : (
                        <Badge variant="outline">
                          {getRecipientCount()}{" "}
                          {getRecipientCount() === 1 ? "person" : "people"}
                        </Badge>
                      )}
                    </div>
                    {selectedRecipients !== "specific" &&
                      recipientStats &&
                      !recipientStatsLoading && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ✓ Count from database
                        </p>
                      )}
                    {selectedRecipients === "specific" && specificUserId && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ✓ User selected
                      </p>
                    )}
                  </div>

                  {/* Send Button */}
                  <Button
                    onClick={handleSendEmail}
                    disabled={sendingEmail || getRecipientCount() === 0}
                    className="w-full"
                  >
                    {sendingEmail ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    {sendingEmail
                      ? "Sending..."
                      : `Send to ${getRecipientCount()} ${
                          getRecipientCount() === 1 ? "Person" : "People"
                        }`}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Email Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(getCategorizedTemplates()).map(
                  ([category, templates]) => (
                    <div key={category}>
                      <h3 className="text-lg font-semibold mb-3 capitalize">
                        {templatesCategories?.[category]?.name || category}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map((template) => (
                          <Card
                            key={template.key}
                            className="hover:shadow-md transition-shadow"
                          >
                            <CardHeader>
                              <CardTitle className="text-base">
                                {template.name}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {template.description}
                              </p>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">
                                    Subject:
                                  </p>
                                  <p className="text-sm">{template.subject}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">
                                    Preview:
                                  </p>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {template.content_preview}
                                  </p>
                                </div>
                                {template.variables.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                      Variables:
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {template.variables.map((variable) => (
                                        <Badge
                                          key={variable}
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          {`{{${variable}}}`}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className="flex gap-2 pt-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setActiveTab("compose");
                                      handleTemplateSelect(template.key);
                                    }}
                                  >
                                    Use Template
                                  </Button>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button size="sm" variant="ghost">
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                      <DialogHeader>
                                        <DialogTitle>
                                          {template.name}
                                        </DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div>
                                          <label className="text-sm font-medium">
                                            Subject:
                                          </label>
                                          <p className="text-sm bg-muted p-2 rounded">
                                            {template.subject}
                                          </p>
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium">
                                            Content Preview:
                                          </label>
                                          <p className="text-sm bg-muted p-4 rounded">
                                            {template.content_preview}
                                          </p>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Email History
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex gap-4 flex-wrap">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select defaultValue="all">
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Templates</SelectItem>
                      {templates &&
                        Object.entries(templates).map(([key, template]) => (
                          <SelectItem key={key} value={key}>
                            {template.name}
                          </SelectItem>
                        ))}
                      <SelectItem value="custom">Custom Emails</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input placeholder="Search recipient..." className="w-48" />
                </div>

                {/* Email Logs Table */}
                <div className="border rounded-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b bg-muted/50">
                        <tr>
                          <th className="p-3 text-left text-sm font-medium">
                            Status
                          </th>
                          <th className="p-3 text-left text-sm font-medium">
                            Recipient
                          </th>
                          <th className="p-3 text-left text-sm font-medium">
                            Subject
                          </th>
                          <th className="p-3 text-left text-sm font-medium">
                            Template
                          </th>
                          <th className="p-3 text-left text-sm font-medium">
                            Sent At
                          </th>
                          <th className="p-3 text-left text-sm font-medium">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {emailLogs.map((log) => (
                          <tr
                            key={log.id}
                            className="border-b hover:bg-muted/30"
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(log.status)}
                                <Badge
                                  variant={getStatusBadgeVariant(log.status)}
                                >
                                  {log.status}
                                </Badge>
                              </div>
                            </td>
                            <td className="p-3">
                              <div>
                                <p className="font-medium text-sm">
                                  {log.user_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {log.recipient_email}
                                </p>
                              </div>
                            </td>
                            <td className="p-3">
                              <p
                                className="text-sm max-w-xs truncate"
                                title={log.subject}
                              >
                                {log.subject}
                              </p>
                            </td>
                            <td className="p-3">
                              {log.template_name ? (
                                <Badge variant="outline">
                                  {log.template_name}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Custom
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="text-sm">
                                {log.sent_at ? (
                                  <div>
                                    <p>{formatDate(log.sent_at)}</p>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">
                                    Not sent
                                  </span>
                                )}
                                {log.error_message && (
                                  <p
                                    className="text-xs text-red-500 mt-1"
                                    title={log.error_message}
                                  >
                                    Error: {log.error_message.substring(0, 30)}
                                    ...
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {log.status === "failed" && (
                                  <Button variant="ghost" size="sm">
                                    <RefreshCw className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {emailLogs.length} of {emailLogs.length} entries
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" disabled={!logsHasMore}>
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Delivery Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {emailStats?.delivery_rate || 0}%
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Last {emailStats?.period_days || 30} days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Total Emails
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {emailStats?.total_emails?.toLocaleString() || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Since{" "}
                    {emailStats?.date_from
                      ? new Date(emailStats.date_from).toLocaleDateString()
                      : "N/A"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Daily Average
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {emailStats
                      ? Math.round(
                          emailStats.total_emails / emailStats.period_days
                        )
                      : 0}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Emails per day
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Email Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Email Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {emailStats?.by_status &&
                      Object.entries(emailStats.by_status).map(
                        ([status, count]) => (
                          <div
                            key={status}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              {getStatusIcon(status)}
                              <span className="capitalize font-medium">
                                {status}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    status === "sent"
                                      ? "bg-green-500"
                                      : status === "pending"
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{
                                    width: `${
                                      emailStats
                                        ? (count / emailStats.total_emails) *
                                          100
                                        : 0
                                    }%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium w-12 text-right">
                                {count}
                              </span>
                            </div>
                          </div>
                        )
                      )}
                  </div>
                </CardContent>
              </Card>

              {/* Template Usage */}
              <Card>
                <CardHeader>
                  <CardTitle>Template Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {emailStats?.by_template &&
                      Object.entries(emailStats.by_template)
                        .sort(([, a], [, b]) => b - a)
                        .map(([template, count]) => (
                          <div
                            key={template}
                            className="flex items-center justify-between"
                          >
                            <span className="capitalize font-medium">
                              {template}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full bg-blue-500"
                                  style={{
                                    width: `${
                                      emailStats
                                        ? (count / emailStats.total_emails) *
                                          100
                                        : 0
                                    }%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium w-12 text-right">
                                {count}
                              </span>
                            </div>
                          </div>
                        ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Daily Activity Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Daily Email Activity
                  <Select defaultValue="period-7">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="period-7">Last 7 days</SelectItem>
                      <SelectItem value="period-30">Last 30 days</SelectItem>
                      <SelectItem value="period-90">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-64 flex items-end justify-between gap-2 border-b pb-4">
                    {emailStats?.daily_count?.map((day, index) => {
                      const maxCount = Math.max(
                        ...emailStats.daily_count.map((d) => d.count)
                      );
                      const height =
                        maxCount > 0 ? (day.count / maxCount) * 200 : 4;

                      return (
                        <div
                          key={index}
                          className="flex flex-col items-center gap-1 flex-1"
                        >
                          <div className="text-xs text-muted-foreground">
                            {day.count}
                          </div>
                          <div
                            className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors min-h-[4px]"
                            style={{ height: `${height}px` }}
                            title={`${new Date(
                              day.date
                            ).toLocaleDateString()}: ${day.count} emails`}
                          ></div>
                          <div className="text-xs text-muted-foreground transform -rotate-45 origin-left mt-1">
                            {new Date(day.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-center">
                    <p className="text-sm text-muted-foreground">
                      Email activity over the last{" "}
                      {emailStats?.daily_count?.length || 0} days
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
