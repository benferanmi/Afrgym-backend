/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  AlertCircle,
  Upload,
  X,
  User,
  UserCheck,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  GymUser,
  UpdateUserPayload,
  useUsersStore,
  // Import visit-based utilities
  isVisitBased,
  canCheckin,
  hasCheckedInToday,
  getVisitStatusText,
  formatVisitInfo,
} from "@/stores/usersStore";
import { uploadToCloudinary } from "@/config/cloudinary";

interface EditMemberDialogProps {
  user: GymUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Updated membership plans with visit-based indicators
const membershipPlans = {
  withTrainer: [
    {
      id: "9",
      name: "Daily (With a Trainer)",
      description: "Daily access with personal trainer",
      defaultDays: 1,
      isVisitBased: false,
    },
    {
      id: "8",
      name: "Weekly (with a trainer)",
      description: "Weekly plan with personal trainer",
      defaultDays: 6,
      isVisitBased: false,
    },
    {
      id: "12",
      name: "3x a week / Month (With Trainer)",
      description: "Visit-based: 12 visits per month with trainer",
      defaultDays: 30,
      isVisitBased: true,
      monthlyVisits: 12,
    },
    {
      id: "10",
      name: "Monthly (With a Trainer)",
      description: "Monthly plan with personal trainer",
      defaultDays: 30,
      isVisitBased: false,
    },
    {
      id: "11",
      name: "3 Months (With a Trainer)",
      description: "3 Month plan with personal trainer",
      defaultDays: 90,
      isVisitBased: false,
    },
  ],
  withoutTrainer: [
    {
      id: "1",
      name: "Daily",
      description: "Daily gym access",
      defaultDays: 1,
      isVisitBased: false,
    },
    {
      id: "2",
      name: "Weekly",
      description: "Weekly gym access",
      defaultDays: 6,
      isVisitBased: false,
    },
    {
      id: "3",
      name: "Bi weekly",
      description: "Bi-weekly gym access",
      defaultDays: 12,
      isVisitBased: false,
    },
    {
      id: "13",
      name: "3x a week / Month",
      description: "Visit-based: 12 visits per month",
      defaultDays: 30,
      isVisitBased: true,
      monthlyVisits: 12,
    },
    {
      id: "4",
      name: "Monthly",
      description: "Monthly gym access",
      defaultDays: 30,
      isVisitBased: false,
    },
    {
      id: "5",
      name: "3 Months",
      description: "3 Month gym access",
      defaultDays: 90,
      isVisitBased: false,
    },
    {
      id: "6",
      name: "6 Months",
      description: "6-month gym access",
      defaultDays: 180,
      isVisitBased: false,
    },
    {
      id: "7",
      name: "1 Year",
      description: "Yearly gym access",
      defaultDays: 365,
      isVisitBased: false,
    },
  ],
};

const allPlans = [
  ...membershipPlans.withTrainer,
  ...membershipPlans.withoutTrainer,
];

export function EditMemberDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: EditMemberDialogProps) {
  const {
    updateUser,
    loading,
    error,
    clearError,
    // Check-in functionality
    checkinUser,
  } = useUsersStore();

  const [formData, setFormData] = useState<UpdateUserPayload>({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    level_id: undefined,
    start_date: "",
    end_date: "",
    profile_picture_url: "",
    // Add check-in option
    checkin_today: false,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Image upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string>("");
  const [originalImageUrl, setOriginalImageUrl] = useState<string>("");

  // Check-in states
  const [showCheckinOption, setShowCheckinOption] = useState(false);

  // Form reset and initialization
  useEffect(() => {
    if (user && open) {
      const today = new Date().toISOString().split("T")[0];
      const userProfileUrl = user.profile_picture_url || "";

      setFormData({
        username: user.username || "",
        email: user.email || "",
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        phone: user.phone || "",
        level_id: user.membership?.level_id
          ? parseInt(user.membership.level_id)
          : undefined,
        start_date: user.membership?.start_date
          ? user.membership.start_date.split(" ")[0]
          : today,
        end_date: user.membership?.expiry_date
          ? user.membership.expiry_date.split(" ")[0]
          : "",
        profile_picture_url: userProfileUrl,
        checkin_today: false,
      });

      setOriginalImageUrl(userProfileUrl);
      setImagePreview("");
      setSelectedFile(null);
      setImageUploadError("");
      setFormErrors({});

      // Show check-in option for visit-based users who can check in
      setShowCheckinOption(isVisitBased(user) && canCheckin(user));

      clearError();
    }
  }, [user, open, clearError]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.username?.trim()) {
      errors.username = "Username is required";
    }

    if (!formData.email?.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email format";
    }

    if (!formData.first_name?.trim()) {
      errors.first_name = "First name is required";
    }

    if (!formData.last_name?.trim()) {
      errors.last_name = "Last name is required";
    }

    if (selectedFile && !formData.profile_picture_url) {
      errors.image = "Please upload the selected image before submitting";
    }

    if (!formData.phone?.trim()) {
      errors.phone = "Phone number is required";
    }

    // Membership validation
    if (formData.level_id && formData.level_id > 0) {
      if (!formData.start_date) {
        errors.start_date = "Start date is required when assigning membership";
      }
      if (!formData.end_date) {
        errors.end_date = "End date is required when assigning membership";
      }
      if (formData.start_date && formData.end_date) {
        const startDate = new Date(formData.start_date);
        const endDate = new Date(formData.end_date);
        if (endDate <= startDate) {
          errors.end_date = "End date must be after start date";
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageUploadError("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageUploadError("Image size must be less than 5MB");
      return;
    }

    setSelectedFile(file);
    setImageUploadError("");

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    if (formData.profile_picture_url !== originalImageUrl) {
      handleChange("profile_picture_url", originalImageUrl);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedFile) return;

    setIsUploadingImage(true);
    setImageUploadError("");

    try {
      const uploadedUrl = await uploadToCloudinary(selectedFile);
      handleChange("profile_picture_url", uploadedUrl);
      console.log("Image uploaded successfully:", uploadedUrl);
    } catch (error) {
      console.error("Image upload error:", error);
      setImageUploadError("Failed to upload image. Please try again.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview("");
    setImageUploadError("");
    handleChange("profile_picture_url", "");

    const fileInput = document.getElementById(
      "profile_picture"
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleRestoreOriginalImage = () => {
    setSelectedFile(null);
    setImagePreview("");
    setImageUploadError("");
    handleChange("profile_picture_url", originalImageUrl);

    const fileInput = document.getElementById(
      "profile_picture"
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !validateForm()) return;

    setIsSubmitting(true);

    try {
      const updatePayload: UpdateUserPayload = {};

      // Basic fields - only if changed
      if (formData.username !== user.username) {
        updatePayload.username = formData.username;
      }
      if (formData.email !== user.email) {
        updatePayload.email = formData.email;
      }
      if (formData.first_name !== user.first_name) {
        updatePayload.first_name = formData.first_name;
      }
      if (formData.last_name !== user.last_name) {
        updatePayload.last_name = formData.last_name;
      }

      if (formData.phone !== user.phone) {
        updatePayload.phone = formData.phone;
      }

      // Profile picture - only if changed
      if (formData.profile_picture_url !== originalImageUrl) {
        updatePayload.profile_picture_url = formData.profile_picture_url;
      }

      // Include check-in request if enabled
      if (formData.checkin_today && showCheckinOption) {
        updatePayload.checkin_today = true;
      }

      // Membership data - always include when level_id is set
      if (formData.level_id !== undefined) {
        updatePayload.level_id = formData.level_id;

        if (formData.level_id && formData.level_id > 0) {
          updatePayload.start_date = formData.start_date;
          updatePayload.end_date = formData.end_date;
        }
      }

      if (Object.keys(updatePayload).length === 0) {
        setFormErrors({ general: "No changes detected" });
        return;
      }

      console.log("Sending update payload:", updatePayload);

      const updatedUser = await updateUser(user.id, updatePayload);
      console.log("User updated successfully:", updatedUser);

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Failed to update user:", error);

      let errorMessage = "Failed to update user. Please try again.";
      if (error.message) {
        errorMessage = error.message;
      } else if (error.data?.message) {
        errorMessage = error.data.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      setFormErrors({ general: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateEndDate = (startDate: string, daysToAdd: number) => {
    if (!startDate) return "";

    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + daysToAdd);
    return end.toISOString().split("T")[0];
  };

  const handleMembershipChange = (value: string) => {
    if (value === "none" || value === "0") {
      handleChange("level_id", 0);
      handleChange("end_date", "");
    } else {
      const levelId = parseInt(value);
      handleChange("level_id", levelId);

      const selectedPlan = allPlans.find((plan) => plan.id === value);
      if (selectedPlan && formData.start_date) {
        const defaultEndDate = calculateEndDate(
          formData.start_date,
          selectedPlan.defaultDays
        );
        handleChange("end_date", defaultEndDate);
      }
    }
  };

  const handleStartDateChange = (newStartDate: string) => {
    handleChange("start_date", newStartDate);

    if (formData.level_id && formData.level_id > 0) {
      const selectedPlan = allPlans.find(
        (plan) => plan.id === formData.level_id?.toString()
      );
      if (selectedPlan) {
        const newEndDate = calculateEndDate(
          newStartDate,
          selectedPlan.defaultDays
        );
        handleChange("end_date", newEndDate);
      }
    }
  };

  // Get selected plan info for display
  const selectedPlan =
    formData.level_id && formData.level_id > 0
      ? allPlans.find((plan) => plan.id === formData.level_id?.toString())
      : null;

  const handleChange = (field: keyof UpdateUserPayload, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
    if (formErrors.general) {
      setFormErrors((prev) => ({ ...prev, general: "" }));
    }
  };

  // Check if form can be submitted
  const canSubmit =
    !selectedFile || formData.profile_picture_url !== originalImageUrl;
  const currentDisplayImage = imagePreview || formData.profile_picture_url;

  // Get visit information for current user
  const visitInfo = user && isVisitBased(user) ? formatVisitInfo(user) : null;

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
          <DialogDescription>
            Update member information and membership details for{" "}
            {user.display_name}.
          </DialogDescription>
        </DialogHeader>

        {(error || formErrors.general) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || formErrors.general}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Visit-Based Information Display */}
          {visitInfo && (
            <div className="bg-blue-50 p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Current Visit Status
                </h4>
                <Badge className="bg-blue-100 text-blue-800">
                  Visit-Based Plan
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Remaining</div>
                  <div className="font-medium text-green-600">
                    {visitInfo.remaining_visits}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Used</div>
                  <div className="font-medium">{visitInfo.used_visits}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total</div>
                  <div className="font-medium">{visitInfo.total_visits}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Reset In</div>
                  <div className="font-medium">
                    {visitInfo.daysUntilReset} days
                  </div>
                </div>
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground">Status: </span>
                <span className="font-medium">{visitInfo.status}</span>
              </div>

              {visitInfo.hasCheckedInToday && (
                <div className="text-sm text-green-600 font-medium flex items-center gap-1">
                  <UserCheck className="h-4 w-4" />
                  Already checked in today
                </div>
              )}
            </div>
          )}

          {/* Check-in Option for Visit-Based Users */}
          {showCheckinOption && (
            <div className="bg-green-50 p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="checkin_today"
                  className="flex items-center gap-2 font-medium"
                >
                  <UserCheck className="h-4 w-4" />
                  Check in today
                </Label>
                <Switch
                  id="checkin_today"
                  checked={formData.checkin_today}
                  onCheckedChange={(checked) =>
                    handleChange("checkin_today", checked)
                  }
                />
              </div>
              <p className="text-sm text-green-700">
                Enable this option to record a visit check-in for today when
                updating the member.
              </p>
            </div>
          )}

          {/* Profile Picture Upload */}
          <div className="space-y-4 border-b pb-4">
            <h4 className="font-medium">Profile Picture</h4>

            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                {currentDisplayImage ? (
                  <div className="relative">
                    <img
                      src={currentDisplayImage}
                      alt="Profile preview"
                      className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                    <User className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center space-y-2">
                <Label htmlFor="profile_picture" className="cursor-pointer">
                  <div className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                    <Upload className="h-4 w-4" />
                    <span>Choose New Image</span>
                  </div>
                </Label>
                <Input
                  id="profile_picture"
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Max file size: 5MB. Supported: JPG, PNG, GIF
                </p>
              </div>

              <div className="flex flex-col space-y-2 w-full max-w-[200px]">
                {selectedFile &&
                  formData.profile_picture_url === originalImageUrl && (
                    <Button
                      type="button"
                      onClick={handleImageUpload}
                      disabled={isUploadingImage}
                      size="sm"
                      className="w-full"
                    >
                      {isUploadingImage ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Image
                        </>
                      )}
                    </Button>
                  )}

                {originalImageUrl &&
                  (formData.profile_picture_url !== originalImageUrl ||
                    selectedFile) && (
                    <Button
                      type="button"
                      onClick={handleRestoreOriginalImage}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Restore Original
                    </Button>
                  )}
              </div>

              {selectedFile &&
                formData.profile_picture_url !== originalImageUrl && (
                  <p className="text-sm text-green-600 flex items-center">
                    <span className="mr-1">✓</span>
                    New image uploaded successfully
                  </p>
                )}

              {imageUploadError && (
                <p className="text-sm text-destructive text-center">
                  {imageUploadError}
                </p>
              )}

              {formErrors.image && (
                <p className="text-sm text-destructive text-center">
                  {formErrors.image}
                </p>
              )}
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="Enter email address"
              />
              {formErrors.email && (
                <p className="text-sm text-destructive">{formErrors.email}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  readOnly
                  value={formData.username}
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Username cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="8100110011"
                />
                {formErrors.phone && (
                  <p className="text-sm text-destructive">{formErrors.phone}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleChange("first_name", e.target.value)}
                  placeholder="Enter first name"
                />
                {formErrors.first_name && (
                  <p className="text-sm text-destructive">
                    {formErrors.first_name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleChange("last_name", e.target.value)}
                  placeholder="Enter last name"
                />
                {formErrors.last_name && (
                  <p className="text-sm text-destructive">
                    {formErrors.last_name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Membership information */}
          <div className="space-y-4">
            <h4 className="font-medium">Membership Information</h4>

            <div className="space-y-2">
              <Label htmlFor="membership_level">Membership Plan</Label>
              <Select
                value={
                  formData.level_id ? formData.level_id.toString() : "none"
                }
                onValueChange={handleMembershipChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select membership plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Membership</SelectItem>

                  {/* Plans with Trainer */}
                  <div className="px-2 py-1 text-sm font-medium text-muted-foreground bg-muted/50">
                    Plans with Trainer
                  </div>
                  {membershipPlans.withTrainer.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span>{plan.name}</span>
                          {plan.isVisitBased && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-blue-100 text-blue-800"
                            >
                              Visit-Based
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {plan.isVisitBased
                            ? `${plan.monthlyVisits} visits/month`
                            : `${plan.defaultDays} days`}
                        </span>
                      </div>
                    </SelectItem>
                  ))}

                  {/* Plans without Trainer */}
                  <div className="px-2 py-1 text-sm font-medium text-muted-foreground bg-muted/50">
                    Plans without Trainer
                  </div>
                  {membershipPlans.withoutTrainer.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span>{plan.name}</span>
                          {plan.isVisitBased && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-blue-100 text-blue-800"
                            >
                              Visit-Based
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {plan.isVisitBased
                            ? `${plan.monthlyVisits} visits/month`
                            : `${plan.defaultDays} days`}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.level_id && formData.level_id > 0 && (
              <>
                {selectedPlan && (
                  <div
                    className={`p-3 border rounded-md ${
                      selectedPlan.isVisitBased
                        ? "bg-blue-50 border-blue-200"
                        : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-medium">
                        Selected Plan: {selectedPlan.name}
                      </p>
                      {selectedPlan.isVisitBased && (
                        <Badge className="bg-blue-100 text-blue-800">
                          Visit-Based
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedPlan.isVisitBased
                        ? `Visit-based plan with ${selectedPlan.monthlyVisits} visits per month. Visits reset monthly based on start date.`
                        : `Time-based plan with ${selectedPlan.defaultDays} days duration. You can modify the dates below if needed.`}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="start_date"
                      className="flex items-center gap-1"
                    >
                      <Calendar className="h-3 w-3" />
                      Start Date *
                    </Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                    />
                    {formErrors.start_date && (
                      <p className="text-sm text-destructive">
                        {formErrors.start_date}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="end_date"
                      className="flex items-center gap-1"
                    >
                      <Calendar className="h-3 w-3" />
                      End Date *
                    </Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => handleChange("end_date", e.target.value)}
                      min={formData.start_date}
                    />
                    {formErrors.end_date && (
                      <p className="text-sm text-destructive">
                        {formErrors.end_date}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {selectedPlan?.isVisitBased
                        ? "For visit-based plans, this sets the billing cycle duration."
                        : "Auto-calculated based on plan. You can modify if needed."}
                    </p>
                  </div>
                </div>

                {/* Additional Info for Visit-Based Plans */}
                {selectedPlan?.isVisitBased && (
                  <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-amber-600" />
                      <p className="text-sm font-medium text-amber-800">
                        Visit-Based Plan Information
                      </p>
                    </div>
                    <div className="text-xs text-amber-700 space-y-1">
                      <p>
                        • This plan includes {selectedPlan.monthlyVisits} visits
                        per billing cycle
                      </p>
                      <p>
                        • Visits reset automatically based on the start date
                      </p>
                      <p>• Unused visits do not carry over to the next cycle</p>
                      <p>• Members can only check in once per day</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || isUploadingImage}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting || loading || isUploadingImage || !canSubmit
              }
              className="gradient-gym text-white"
            >
              {isSubmitting || loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {formData.checkin_today && showCheckinOption
                    ? "Updating & Checking In..."
                    : "Updating..."}
                </>
              ) : (
                <>
                  {formData.checkin_today && showCheckinOption
                    ? "Update & Check In"
                    : "Update Member"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
