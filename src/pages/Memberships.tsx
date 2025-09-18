import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toast } from "@/components/ui/toast";
import {
  Crown,
  DollarSign,
  Calendar,
  Plus,
  Edit,
  TrendingUp,
  Package,
  Settings,
  Save,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  useMembershipStore,
  formatCurrency,
  formatCyclePeriod,
  getMembershipStatusColor,
  calculateMembershipValue,
  getMembershipTypeByPrice,
  type MembershipPricingUpdate,
} from "@/stores/membershipStore";

export default function Memberships() {
  const {
    membershipLevels,
    statistics,
    expiringMembers,
    loading,
    error,
    fetchMemberships,
    updateMembershipPricing,
    getExpiringMemberships,
    getMembershipStatistics,
    clearError,
  } = useMembershipStore();

  const [editingPlan, setEditingPlan] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<MembershipPricingUpdate>({});
  const [showToast, setShowToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({
    show: false,
    message: "",
    type: "success",
  });
  const [expiringDays, setExpiringDays] = useState(7);
  const [expandedDescription, setExpandedDescription] = useState<number | null>(
    null
  );

  // Utility function to truncate description
  const truncateDescription = (
    text: string,
    maxLines: number = 6
  ): { truncated: string; needsTruncation: boolean } => {
    const words = text.split(" ");
    const wordsPerLine = 8; // Approximate words per line
    const maxWords = maxLines * wordsPerLine;

    if (words.length <= maxWords) {
      return { truncated: text, needsTruncation: false };
    }

    const truncated = words.slice(0, maxWords).join(" ") + "...";
    return { truncated, needsTruncation: true };
  };

  useEffect(() => {
    fetchMemberships();
    getExpiringMemberships();
  }, []);

  const handleEditPlan = (planId: number) => {
    const plan = membershipLevels.find((p) => p.id === planId);
    if (plan) {
      setEditFormData({
        initial_payment: plan.initial_payment,
        billing_amount: plan.billing_amount,
        trial_amount: plan.trial_amount,
        cycle_number: plan.cycle_number,
        cycle_period: plan.cycle_period,
        billing_limit: plan.billing_limit,
        trial_limit: plan.trial_limit,
      });
      setEditingPlan(planId);
    }
  };

  console.log("this is stat", statistics);

  const handleSaveChanges = async () => {
    if (editingPlan && editFormData) {
      try {
        await updateMembershipPricing(editingPlan, editFormData);
        setShowToast({
          show: true,
          message: "Membership plan updated successfully!",
          type: "success",
        });
        setEditingPlan(null);
        setEditFormData({});
      } catch (error) {
        setShowToast({
          show: true,
          message:
            error instanceof Error
              ? error.message
              : "Failed to update membership plan",
          type: "error",
        });
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingPlan(null);
    setEditFormData({});
  };

  const handleExpiringDaysChange = (days: number) => {
    setExpiringDays(days);
    getExpiringMemberships(days);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getPlanIcon = (plan: any) => {
    const type = getMembershipTypeByPrice(plan);
    switch (type) {
      case "basic":
        return <Package className="w-5 h-5" />;
      case "premium":
        return <TrendingUp className="w-5 h-5" />;
      case "vip":
        return <Crown className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getPlanColor = (plan: any) => {
    const type = getMembershipTypeByPrice(plan);
    switch (type) {
      case "basic":
        return "bg-blue-500";
      case "premium":
        return "bg-purple-500";
      case "vip":
        return "bg-amber-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading && membershipLevels.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading membership plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Membership Plans</h1>
          <p className="text-muted-foreground mt-2">
            Manage membership plans, pricing, and billing cycles
          </p>
        </div>
        {/* <Button disabled>
          <Plus className="w-4 h-4 mr-2" />
          New Plan (Coming Soon)
        </Button> */}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <span className="text-destructive">{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearError}
            className="ml-auto"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Total Plans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.by_level.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 break-words" />
                Active Memberships
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.active_members}
              </div>
              <p className="text-sm text-muted-foreground">
                Current subscribers
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="plans" className="w-full">
        <TabsList>
          <TabsTrigger value="plans">Membership Plans</TabsTrigger>
          <TabsTrigger value="expiring">
            Expiring Soon ({expiringMembers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {membershipLevels.map((plan) => {
              const isEditing = editingPlan === plan.id;
              const planType = getMembershipTypeByPrice(plan);

              return (
                <Card
                  key={plan.id}
                  className={`relative ${
                    planType === "premium" ? "border-primary shadow-lg" : ""
                  }`}
                >
                  {planType === "premium" && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary">Most Popular</Badge>
                    </div>
                  )}

                  <CardHeader className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div
                        className={`p-2 rounded-full ${getPlanColor(
                          plan
                        )} text-white`}
                      >
                        {getPlanIcon(plan)}
                      </div>
                    </div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <div className="text-3xl font-bold">
                      {formatCurrency(
                        plan.billing_amount || plan.initial_payment
                      )}
                      <span className="text-sm font-normal text-muted-foreground">
                        {plan.cycle_period
                          ? `/${plan.cycle_period.toLowerCase()}`
                          : ""}
                      </span>
                    </div>

                    {/* Description with truncation */}
                    <div className="text-muted-foreground">
                      {(() => {
                        const { truncated, needsTruncation } =
                          truncateDescription(plan.description || "");
                        return (
                          <div>
                            <p className="text-sm">{truncated}</p>
                            {needsTruncation && (
                              <Dialog
                                open={expandedDescription === plan.id}
                                onOpenChange={(open) =>
                                  setExpandedDescription(open ? plan.id : null)
                                }
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="p-0 h-auto text-primary"
                                  >
                                    See more
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>
                                      {plan.name} - Description
                                    </DialogTitle>
                                  </DialogHeader>
                                  <ScrollArea className="max-h-96">
                                    <p
                                      className="text-sm text-muted-foreground whitespace-pre-wrap"
                                      dangerouslySetInnerHTML={{
                                        __html: plan.description,
                                      }}
                                    ></p>
                                  </ScrollArea>
                                  <DialogFooter>
                                    <Button
                                      variant="outline"
                                      onClick={() =>
                                        setExpandedDescription(null)
                                      }
                                    >
                                      Close
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <Badge
                      variant={
                        plan.status === "active" ? "default" : "secondary"
                      }
                    >
                      {plan.status}
                    </Badge>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {!isEditing ? (
                      <>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span>Initial Payment:</span>
                            <span className="font-medium">
                              {formatCurrency(plan.initial_payment)}
                            </span>
                          </div>
                          {plan.billing_amount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Billing Amount:</span>
                              <span className="font-medium">
                                {formatCurrency(plan.billing_amount)}
                              </span>
                            </div>
                          )}
                          {plan.trial_amount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Trial Amount:</span>
                              <span className="font-medium">
                                {formatCurrency(plan.trial_amount)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span>Billing Cycle:</span>
                            <span className="font-medium">
                              {formatCyclePeriod(
                                plan.cycle_number,
                                plan.cycle_period
                              )}
                            </span>
                          </div>
                          {plan.billing_limit > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Billing Limit:</span>
                              <span className="font-medium">
                                {plan.billing_limit} cycles
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="pt-4 border-t">
                          <div className="flex justify-between text-sm font-medium">
                            <span>Total Value:</span>
                            <span>
                              {formatCurrency(calculateMembershipValue(plan))}
                            </span>
                          </div>
                        </div>

                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => handleEditPlan(plan.id)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Pricing
                        </Button>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="initial_payment">
                              Initial Payment
                            </Label>
                            <Input
                              id="initial_payment"
                              type="number"
                              value={editFormData.initial_payment || ""}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  initial_payment:
                                    parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <Label htmlFor="billing_amount">
                              Billing Amount
                            </Label>
                            <Input
                              id="billing_amount"
                              type="number"
                              value={editFormData.billing_amount || ""}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  billing_amount:
                                    parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="cycle_number">Cycle Number</Label>
                            <Input
                              id="cycle_number"
                              type="number"
                              value={editFormData.cycle_number || ""}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  cycle_number: parseInt(e.target.value) || 0,
                                })
                              }
                              placeholder="1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="cycle_period">Cycle Period</Label>
                            <Select
                              value={editFormData.cycle_period || "one-time"}
                              onValueChange={(value) =>
                                setEditFormData({
                                  ...editFormData,
                                  cycle_period:
                                    value === "one-time" ? "" : value,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select period" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="one-time">
                                  One-time
                                </SelectItem>
                                <SelectItem value="Day">Day</SelectItem>
                                <SelectItem value="Week">Week</SelectItem>
                                <SelectItem value="Month">Month</SelectItem>
                                <SelectItem value="Year">Year</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="billing_limit">Billing Limit</Label>
                            <Input
                              id="billing_limit"
                              type="number"
                              value={editFormData.billing_limit || ""}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  billing_limit: parseInt(e.target.value) || 0,
                                })
                              }
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <Label htmlFor="trial_amount">Trial Amount</Label>
                            <Input
                              id="trial_amount"
                              type="number"
                              value={editFormData.trial_amount || ""}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  trial_amount: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button
                            onClick={handleSaveChanges}
                            disabled={loading}
                            className="flex-1"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleCancelEdit}
                            className="flex-1"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="expiring">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Memberships Expiring Soon
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label htmlFor="expiring-days">Show expiring within:</Label>
                  <Select
                    value={expiringDays.toString()}
                    onValueChange={(value) =>
                      handleExpiringDaysChange(parseInt(value))
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {expiringMembers.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-4 border rounded-lg border-orange-200 bg-orange-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{member.user_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {member.user_email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive">
                        {member.days_remaining === 0
                          ? "Expires today"
                          : member.days_remaining === 1
                          ? "Expires tomorrow"
                          : `Expires in ${member.days_remaining} days`}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        {member.membership_level} Plan
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(member.expiry_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {expiringMembers.length === 0 && (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No memberships expiring in the next {expiringDays} days
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Toast Notifications */}
      {showToast.show && (
        <div
          className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            showToast.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            {showToast.type === "success" ? (
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                ✓
              </div>
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            <span>{showToast.message}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowToast({ ...showToast, show: false })}
              className="text-white hover:bg-white/20 p-1 h-auto"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
