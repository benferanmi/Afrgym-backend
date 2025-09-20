import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  QrCode,
  Mail,
  AlertTriangle,
  TrendingUp,
  Activity,
  Pause,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { useDashboardStore } from "@/stores/dashboardStore";

// Summary Stats Component - COMPLETE
export const SummaryStatsGrid = () => {
  const { summaryStats, loading, errors, fetchSummaryStats } =
    useDashboardStore();

  React.useEffect(() => {
    fetchSummaryStats();
  }, [fetchSummaryStats]);

  if (loading.summary) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (errors.summary) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          Failed to load summary statistics.
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSummaryStats()}
            className="ml-2"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!summaryStats) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summaryStats.total_users.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">All registered users</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Members</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summaryStats.total_active_members.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Currently active memberships
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            QR Code Coverage
          </CardTitle>
          <QrCode className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summaryStats.total_users > 0
              ? Math.round(
                  (summaryStats.users_with_qr_codes /
                    summaryStats.total_users) *
                    100
                )
              : 0}
            %
          </div>
          <p className="text-xs text-muted-foreground">
            {summaryStats.users_with_qr_codes} of {summaryStats.total_users}{" "}
            users
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Health Score</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summaryStats.overall_health_score}%
          </div>
          <p className="text-xs text-muted-foreground">
            Overall gym performance
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// Daily Stats Card - COMPLETE
export const DailyStatsCard = () => {
  const { dailyStats, loading, errors, fetchDailyStats } = useDashboardStore();

  React.useEffect(() => {
    fetchDailyStats();
  }, [fetchDailyStats]);

  if (loading.daily) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-36" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-6 w-8 mx-auto mb-1" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (errors.daily) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Today's Activity
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDailyStats()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Failed to load today's stats</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!dailyStats) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Today's Activity
        </CardTitle>
        <p className="text-sm text-muted-foreground">{dailyStats.date}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {dailyStats.new_user_registrations}
            </div>
            <div className="text-xs text-muted-foreground">New Users</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {dailyStats.new_membership_assignments}
            </div>
            <div className="text-xs text-muted-foreground">New Members</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {dailyStats.qr_codes_generated}
            </div>
            <div className="text-xs text-muted-foreground">QR Codes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {dailyStats.emails_sent}
            </div>
            <div className="text-xs text-muted-foreground">Emails Sent</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Pause Stats Card - COMPLETE
export const PauseStatsCard = () => {
  const { pauseStats, loading, errors, fetchPauseStats } = useDashboardStore();

  React.useEffect(() => {
    fetchPauseStats();
  }, [fetchPauseStats]);

  if (loading.pauses) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-6 w-8 mx-auto mb-1" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (errors.pauses) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Pause Statistics
            <Button variant="outline" size="sm" onClick={() => fetchPauseStats()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Failed to load pause statistics</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!pauseStats) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pause className="h-5 w-5" />
          Pause Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {pauseStats.currently_paused}
            </div>
            <div className="text-xs text-muted-foreground">
              Currently Paused
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {pauseStats.pauses_this_month}
            </div>
            <div className="text-xs text-muted-foreground">
              Paused This Month
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {pauseStats.unpauses_this_month}
            </div>
            <div className="text-xs text-muted-foreground">
              Resumed This Month
            </div>
          </div>
          <div className="text-center">
            <div
              className={`text-2xl font-bold ${
                pauseStats.net_pauses_this_month > 0
                  ? "text-red-600"
                  : pauseStats.net_pauses_this_month < 0
                  ? "text-green-600"
                  : "text-gray-600"
              }`}
            >
              {pauseStats.net_pauses_this_month > 0 ? "+" : ""}
              {pauseStats.net_pauses_this_month}
            </div>
            <div className="text-xs text-muted-foreground">Net Change</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Membership Status Card - COMPLETE
export const MembershipStatusCard = () => {
  const { summaryStats, loading, errors, fetchSummaryStats } =
    useDashboardStore();

  if (loading.summary) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (errors.summary || !summaryStats) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Membership Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-green-500" />
            <span className="text-sm">Active Members</span>
          </div>
          <Badge variant="default">{summaryStats.total_active_members}</Badge>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserX className="h-4 w-4 text-red-500" />
            <span className="text-sm">Expired Members</span>
          </div>
          <Badge variant="destructive">
            {summaryStats.total_expired_members}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-yellow-500" />
            <span className="text-sm">Paused Members</span>
          </div>
          <Badge variant="secondary">{summaryStats.total_paused_members}</Badge>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-500" />
            <span className="text-sm">Emails (30 days)</span>
          </div>
          <Badge variant="outline">
            {summaryStats.emails_sent_last_30_days}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

// Recent Activities Card - COMPLETE
export const RecentActivitiesCard = () => {
  const { recentActivities, loading, errors, fetchRecentActivities } =
    useDashboardStore();

  React.useEffect(() => {
    fetchRecentActivities(8);
  }, [fetchRecentActivities]);

  const getActivityIcon = (type) => {
    switch (type) {
      case "user_creation":
        return <Users className="h-4 w-4 text-blue-500" />;
      case "membership_assignment":
        return <UserCheck className="h-4 w-4 text-green-500" />;
      case "membership_update":
        return <Activity className="h-4 w-4 text-orange-500" />;
      case "membership_pause":
        return <Pause className="h-4 w-4 text-yellow-500" />;
      case "qr_generation":
        return <QrCode className="h-4 w-4 text-purple-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  if (loading.activities) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (errors.activities) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Recent Activities
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchRecentActivities(8)}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load recent activities
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activities
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {recentActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent activities
            </p>
          ) : (
            recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded-lg"
              >
                <div className="mt-0.5">
                  {getActivityIcon(activity.activity_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{activity.user_name}</span>
                    <span className="text-muted-foreground ml-1">
                      - {activity.activity}
                    </span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      by {activity.admin_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(activity.date)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Expiring Memberships Card - COMPLETE
export const ExpiringMembershipsCard = () => {
  const { expiringStats, loading, errors, fetchExpiringStats } =
    useDashboardStore();

  React.useEffect(() => {
    fetchExpiringStats(7);
  }, [fetchExpiringStats]);

  if (loading.expiring) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (errors.expiring) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Membership Renewals
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchExpiringStats(7)}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Failed to load expiring stats</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!expiringStats) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle
          className={`flex items-center gap-2 ${
            expiringStats.needs_attention ? "text-red-600" : "text-green-600"
          }`}
        >
          <AlertTriangle className="h-5 w-5" />
          Membership Renewals
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
            <div>
              <div className="font-semibold text-red-800">
                Expiring in 7 days
              </div>
              <div className="text-sm text-red-600">
                Requires immediate attention
              </div>
            </div>
            <Badge variant="destructive" className="text-lg px-3">
              {expiringStats.expiring_in_7_days}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
            <div>
              <div className="font-semibold text-yellow-800">
                Expiring in 30 days
              </div>
              <div className="text-sm text-yellow-600">Should contact soon</div>
            </div>
            <Badge variant="secondary" className="text-lg px-3">
              {expiringStats.expiring_in_30_days}
            </Badge>
          </div>

          {expiringStats.urgent_renewals &&
            expiringStats.urgent_renewals.length > 0 && (
              <div className="pt-2">
                <div className="text-sm font-medium mb-2">Urgent Renewals:</div>
                <div className="space-y-1">
                  {expiringStats.urgent_renewals
                    .slice(0, 3)
                    .map((member, index) => (
                      <div
                        key={index}
                        className="text-sm text-muted-foreground flex items-center justify-between"
                      >
                        <span>{member.display_name}</span>
                        <span className="text-red-600">
                          {new Date(member.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  {expiringStats.urgent_renewals.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{expiringStats.urgent_renewals.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
};

// Growth Trends Chart - COMPLETE
export const GrowthTrendsChart = () => {
  const { growthTrends, loading, errors, fetchGrowthTrends } =
    useDashboardStore();

  React.useEffect(() => {
    fetchGrowthTrends();
  }, [fetchGrowthTrends]);

  if (loading.growth) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (errors.growth) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Growth Trends
            <Button variant="outline" size="sm" onClick={() => fetchGrowthTrends()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Failed to load growth trends</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!growthTrends.length) return null;

  const maxValue = Math.max(
    ...growthTrends.map((t) =>
      Math.max(t.new_users, t.new_memberships, t.total_activities)
    )
  );

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          6-Month Growth Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-end justify-between gap-2">
          {growthTrends.map((trend) => (
            <div
              key={trend.month}
              className="flex-1 flex flex-col items-center"
            >
              <div
                className="w-full flex flex-col gap-1 mb-2"
                style={{ height: "200px" }}
              >
                <div
                  className="bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                  style={{
                    height: `${
                      maxValue > 0 ? (trend.new_users / maxValue) * 180 : 0
                    }px`,
                    minHeight: trend.new_users > 0 ? "4px" : "0px",
                  }}
                  title={`New Users: ${trend.new_users}`}
                />
                <div
                  className="bg-green-500 transition-all duration-300 hover:bg-green-600"
                  style={{
                    height: `${
                      maxValue > 0
                        ? (trend.new_memberships / maxValue) * 180
                        : 0
                    }px`,
                    minHeight: trend.new_memberships > 0 ? "4px" : "0px",
                  }}
                  title={`New Memberships: ${trend.new_memberships}`}
                />
                <div
                  className="bg-purple-500 rounded-b transition-all duration-300 hover:bg-purple-600"
                  style={{
                    height: `${
                      maxValue > 0
                        ? (trend.total_activities / maxValue) * 180
                        : 0
                    }px`,
                    minHeight: trend.total_activities > 0 ? "4px" : "0px",
                  }}
                  title={`Total Activities: ${trend.total_activities}`}
                />
              </div>
              <div className="text-xs text-muted-foreground text-center">
                {trend.month_name}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            <span>New Users</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span>New Memberships</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-500 rounded" />
            <span>Total Activities</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
