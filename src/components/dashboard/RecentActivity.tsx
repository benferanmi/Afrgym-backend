import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, QrCode, CreditCard } from "lucide-react";
import { RecentActivity as Activity } from "@/stores/dashboardStore";

interface RecentActivityProps {
  activities: Activity[];
}

const activityIcons = {
  registration: UserPlus,
  scan: QrCode,
  payment: CreditCard,
};

const activityColors = {
  registration: "bg-green-100 text-green-800",
  scan: "bg-blue-100 text-blue-800",
  payment: "bg-yellow-100 text-yellow-800",
};

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity) => {
          const Icon = activityIcons[activity.type];
          return (
            <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-full bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{activity.user}</p>
                <p className="text-sm text-muted-foreground">{activity.details}</p>
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="capitalize">
                  {activity.type}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}