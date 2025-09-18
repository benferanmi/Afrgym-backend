import { create } from "zustand";

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  qrScansToday: number;
  revenueThisMonth: number;
  memberGrowth: number;
  revenueGrowth: number;
}

export interface ChartData {
  month: string;
  members: number;
  revenue: number;
}

export interface MembershipDistribution {
  name: string; // level_name from your API
  value: number; // member_count from your API
  level_id: string; // level_id from your API
}

export interface RecentActivity {
  id: number;
  type: "registration" | "scan" | "payment";
  user: string;
  time: string;
  details: string;
}

interface DashboardState {
  stats: DashboardStats;
  memberGrowthData: ChartData[];
  revenueData: ChartData[];
  membershipDistribution: MembershipDistribution[];
  recentActivities: RecentActivity[];
  loading: boolean;

  fetchDashboardData: () => Promise<void>;
}

const generateMemberGrowthData = (): ChartData[] => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  let baseMembers = 100;

  return months.map((month) => {
    baseMembers += Math.floor(Math.random() * 20) + 5;
    return {
      month,
      members: baseMembers,
      revenue: baseMembers * (Math.random() * 50 + 100), // Random revenue per member
    };
  });
};

const generateRecentActivities = (): RecentActivity[] => {
  const activities = [
    {
      type: "registration" as const,
      user: "John Smith",
      details: "Premium membership",
    },
    { type: "scan" as const, user: "Emma Johnson", details: "Gym entry" },
    {
      type: "payment" as const,
      user: "Michael Brown",
      details: "$99.99 - Monthly Premium",
    },
    {
      type: "registration" as const,
      user: "Sarah Davis",
      details: "Basic membership",
    },
    { type: "scan" as const, user: "David Wilson", details: "Gym entry" },
    {
      type: "payment" as const,
      user: "Lisa Anderson",
      details: "$49.99 - Monthly Basic",
    },
  ];

  return activities.map((activity, index) => ({
    id: index + 1,
    ...activity,
    time: new Date(Date.now() - index * 30 * 60 * 1000).toLocaleTimeString(
      "en-US",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    ),
  }));
};

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: {
    totalMembers: 1250,
    activeMembers: 1180,
    qrScansToday: 342,
    revenueThisMonth: 45780,
    memberGrowth: 12.5,
    revenueGrowth: 8.3,
  },
  memberGrowthData: generateMemberGrowthData(),
  revenueData: generateMemberGrowthData(),
  membershipDistribution: [],
  recentActivities: generateRecentActivities(),
  loading: false,

  fetchDashboardData: async () => {
    set({ loading: true });
    // Simulate API call
    setTimeout(() => {
      set({ loading: false });
    }, 1000);
  },
}));
