import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Loader2, AlertCircle } from "lucide-react";
import { GymUser, UpdateUserPayload, useUsersStore } from "@/stores/usersStore";

interface EditMemberDialogProps {
  user: GymUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const membershipPlans = {
  withTrainer: [
    {
      id: "9",
      name: "Daily (with trainer)",
      description: "Daily access with personal trainer",
      defaultDays: 1, // 1 day
    },
    {
      id: "8",
      name: "Weekly (with trainer)",
      description: "Weekly plan with personal trainer",
      defaultDays: 7, // 1 week
    },
    {
      id: "3",
      name: "Bi-weekly (with trainer)",
      description: "Bi-weekly plan with personal trainer",
      defaultDays: 14, // 2 weeks
    },
    {
      id: "12",
      name: "3 Times a Week (with trainer)",
      description: "3 times per week with personal trainer",
      defaultDays: 21, // 1 month
    },
    {
      id: "10",
      name: "Monthly (with trainer)",
      description: "Monthly plan with personal trainer",
      defaultDays: 30, // 1 month
    },
    {
      id: "11",
      name: "3 Month (with trainer)",
      description: "3 Month plan with personal trainer",
      defaultDays: 90, // 1 month
    },
    // {
    //   id: "trainer_6months",
    //   name: "6 Months (with trainer)",
    //   description: "6-month plan with personal trainer",
    //   defaultDays: 180, // 6 months
    // },
    // {
    //   id: "trainer_yearly",
    //   name: "1 Year (with trainer)",
    //   description: "Yearly plan with personal trainer",
    //   defaultDays: 365, // 1 year
    // },
  ],
  withoutTrainer: [
    {
      id: "1",
      name: "Daily",
      description: "Daily gym access",
      defaultDays: 1, // 1 day
    },
    {
      id: "2",
      name: "Weekly",
      description: "Weekly gym access",
      defaultDays: 7, // 1 week
    },
    {
      id: "3",
      name: "Bi-weekly",
      description: "Bi-weekly gym access",
      defaultDays: 14, // 2 weeks
    },
    {
      id: "solo_3times",
      name: "3 Times a Week",
      description: "3 times per week gym access",
      defaultDays: 21, // 3 weeks
    },
    {
      id: "4",
      name: "Monthly",
      description: "Monthly gym access",
      defaultDays: 30, // 1 month
    },
    {
      id: "5",
      name: "3 Month",
      description: "3 Month gym access",
      defaultDays: 90, // 3 month
    },
    {
      id: "6",
      name: "6 Months",
      description: "6-month gym access",
      defaultDays: 180, // 6 months
    },
    {
      id: "7",
      name: "1 Year",
      description: "Yearly gym access",
      defaultDays: 365, // 1 year
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
  const { updateUser, loading, error, clearError } = useUsersStore();

  const [formData, setFormData] = useState<UpdateUserPayload>({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    level_id: undefined,
    start_date: "",
    end_date: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when user changes or dialog opens
  useEffect(() => {
    if (user && open) {
      setFormData({
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        level_id: user.membership.level_id
          ? parseInt(user.membership.level_id)
          : undefined,
        start_date: user.membership.start_date
          ? user.membership.start_date.split(" ")[0]
          : "",
        end_date: user.membership.expiry_date
          ? user.membership.expiry_date.split(" ")[0]
          : "",
      });
      setFormErrors({});
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

    // If membership level is selected, validate dates
    if (formData.level_id) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !validateForm()) return;

    setIsSubmitting(true);

    try {
      // Only send fields that have changed
      const updatePayload: UpdateUserPayload = {};

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

      // Handle membership changes
      const currentLevelId = user.membership.level_id
        ? parseInt(user.membership.level_id)
        : undefined;
      const currentStartDate = user.membership.start_date
        ? user.membership.start_date.split(" ")[0]
        : "";
      const currentEndDate = user.membership.expiry_date
        ? user.membership.expiry_date.split(" ")[0]
        : "";

      if (formData.level_id !== currentLevelId) {
        updatePayload.level_id = formData.level_id;
      }
      if (formData.start_date !== currentStartDate) {
        updatePayload.start_date = formData.start_date;
      }
      if (formData.end_date !== currentEndDate) {
        updatePayload.end_date = formData.end_date;
      }

      await updateUser(user.id, updatePayload);

      // Close dialog and notify success
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to update user:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate end date based on start date and days to add
  const calculateEndDate = (startDate: string, daysToAdd: number) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + daysToAdd);
    return end.toISOString().split("T")[0];
  };

  const handleMembershipChange = (value: string) => {
    if (value === "none") {
      handleChange("level_id", undefined);
      handleChange("end_date", "");
    } else {
      handleChange("level_id", value);

      // Find the selected plan and calculate default end date
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

  // Get selected plan info for display
  const selectedPlan = formData.level_id
    ? allPlans.find((plan) => plan.id === formData.level_id?.toString())
    : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = (field: keyof UpdateUserPayload, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
          <DialogDescription>
            Update member information and membership details for{" "}
            {user.display_name}.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
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

          {/* membership information */}
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
                        <span>{plan.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Default: {plan.defaultDays} days
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
                        <span>{plan.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Default: {plan.defaultDays} days
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
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>Selected Plan:</strong> {selectedPlan.name}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Default duration: {selectedPlan.defaultDays} days. You can
                      modify the end date below if needed.
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
                      Auto-calculated based on plan. You can modify if needed.
                    </p>
                  </div>
                </div>

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
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gradient-gym text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Member"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
