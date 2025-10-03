/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
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
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CreateUserPayload, useUsersStore } from "@/stores/usersStore";
import { uploadToCloudinary } from "@/config/cloudinary";

interface AddMemberDialogProps {
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

export function AddMemberDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddMemberDialogProps) {
  const { addUser, loading, error, clearError } = useUsersStore();

  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const calculateEndDate = (startDate: string, daysToAdd: number) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + daysToAdd);
    return end.toISOString().split("T")[0];
  };

  const allPlans = [
    ...membershipPlans.withTrainer,
    ...membershipPlans.withoutTrainer,
  ];

  const [formData, setFormData] = useState<CreateUserPayload>({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    level_id: undefined,
    start_date: getCurrentDate(),
    end_date: "",
    profile_picture_url: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Image upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string>("");

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      phone: "",
      first_name: "",
      last_name: "",
      level_id: undefined,
      start_date: getCurrentDate(),
      end_date: "",
      profile_picture_url: "",
    });
    setFormErrors({});
    setSelectedFile(null);
    setImagePreview("");
    setImageUploadError("");
    clearError();
  };

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

    if (!formData.phone?.trim()) {
      errors.phone = "Phone number is required";
    }

    if (selectedFile && !formData.profile_picture_url) {
      errors.image = "Please upload the selected image before submitting";
    }

    if (formData.level_id) {
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

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setImageUploadError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
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

    if (formData.profile_picture_url) {
      handleChange("profile_picture_url", "");
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

    // Reset the file input
    const fileInput = document.getElementById(
      "profile_picture"
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await addUser(formData);

      // Close dialog, reset form, and notify success
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to add user:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof CreateUserPayload, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleMembershipChange = (value: string) => {
    if (value === "none") {
      handleChange("level_id", undefined);
      handleChange("end_date", "");
    } else {
      handleChange("level_id", value);

      const selectedPlan = allPlans.find((plan) => plan.id === value);
      if (selectedPlan) {
        const defaultEndDate = calculateEndDate(
          formData.start_date,
          selectedPlan.defaultDays
        );
        handleChange("end_date", defaultEndDate);
      }
    }
  };

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  const selectedPlan = formData.level_id
    ? allPlans.find((plan) => plan.id === formData.level_id?.toString())
    : null;

  const canSubmit = !selectedFile || formData.profile_picture_url;

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Member</DialogTitle>
          <DialogDescription>
            Add a new gym member and optionally assign them a membership plan.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Profile Picture Upload */}
          <div className="space-y-4 border-b pb-4">
            <h4 className="font-medium">Profile Picture (Optional)</h4>

            <div className="flex flex-col items-center space-y-4">
              {/* Image Preview */}
              <div className="relative">
                {imagePreview || formData.profile_picture_url ? (
                  <div className="relative">
                    <img
                      src={imagePreview || formData.profile_picture_url}
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

              {/* File Input */}
              <div className="flex flex-col items-center space-y-2">
                <Label htmlFor="profile_picture" className="cursor-pointer">
                  <div className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                    <Upload className="h-4 w-4" />
                    <span>Choose Image</span>
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

              {/* Upload Button */}
              {selectedFile && !formData.profile_picture_url && (
                <Button
                  type="button"
                  onClick={handleImageUpload}
                  disabled={isUploadingImage}
                  size="sm"
                  className="w-full max-w-[200px]"
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

              {/* Upload Status */}
              {formData.profile_picture_url && (
                <p className="text-sm text-green-600 flex items-center">
                  <span className="mr-1">✓</span>
                  Image uploaded successfully
                </p>
              )}

              {/* Upload Error */}
              {imageUploadError && (
                <p className="text-sm text-destructive text-center">
                  {imageUploadError}
                </p>
              )}

              {/* Form Error for Image */}
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
              <Label htmlFor="email">Email *</Label>
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
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  placeholder="Enter username"
                />
                {formErrors.username && (
                  <p className="text-sm text-destructive">
                    {formErrors.username}
                  </p>
                )}
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
                <Label htmlFor="first_name">First Name *</Label>
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
                <Label htmlFor="last_name">Last Name *</Label>
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

          {/* Membership Information */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium">Membership Information (Optional)</h4>

            <div className="space-y-2">
              <Label htmlFor="membership_level">Membership Plan</Label>
              <Select
                value={formData.level_id?.toString() || "none"}
                onValueChange={handleMembershipChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select membership plan (optional)" />
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

            {formData.level_id && (
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
                        ? `Visit-based plan with ${selectedPlan.monthlyVisits} visits per billing cycle. Visits will reset monthly based on the start date.`
                        : `Time-based plan with ${selectedPlan.defaultDays} days duration. You can modify the end date below if needed.`}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      disabled
                      className="bg-muted text-muted-foreground cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground">
                      Membership starts from today
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date *</Label>
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
                        • Visits will reset automatically based on the start
                        date
                      </p>
                      <p>• Unused visits do not carry over to the next cycle</p>
                      <p>• Members can only check in once per day</p>
                      <p>
                        • Visit tracking begins immediately upon member creation
                      </p>
                    </div>
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  A QR code will be automatically generated for this member when
                  a membership is assigned.
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogChange(false)}
              disabled={isSubmitting || isUploadingImage}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isUploadingImage || !canSubmit}
              className="gradient-gym text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Member...
                </>
              ) : (
                "Add Member"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
