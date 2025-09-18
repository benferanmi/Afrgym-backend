import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MembershipDistribution {
  name: string;
  value: number;
  level_id: number;
}

interface MembershipBarChartProps {
  data: MembershipDistribution[];
}

export function MembershipBarChart({ data }: MembershipBarChartProps) {
  // Filter out plans with 0 members OR show all for better overview
  const chartData = data.filter((item) => item.value > 0);

  // If you want to show all plans (including 0s), use this instead:
  // const chartData = data;

  // Custom tooltip formatter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{label}</p>
          <p className="text-primary">
            Members: <span className="font-semibold">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Format label for better readability (truncate long names)
  const formatLabel = (tickItem: string) => {
    if (tickItem.length > 15) {
      return tickItem.substring(0, 15) + "...";
    }
    return tickItem;
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Membership Levels Overview</CardTitle>
        <p className="text-sm text-muted-foreground">
          Member count across different membership plans
        </p>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 80,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                tickFormatter={formatLabel}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="value"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                className="hover:opacity-80 transition-opacity"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">No Active Memberships</p>
              <p className="text-sm">
                Add members with membership plans to see the distribution
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Alternative version that shows ALL plans (including 0s) for complete overview
export function MembershipBarChartComplete({ data }: MembershipBarChartProps) {
  // Show all plans including those with 0 members
  const chartData = data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{label}</p>
          <p className="text-primary">
            Members: <span className="font-semibold">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const formatLabel = (tickItem: string) => {
    if (tickItem.length > 12) {
      return tickItem.substring(0, 12) + "...";
    }
    return tickItem;
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>All Membership Levels</CardTitle>
        <p className="text-sm text-muted-foreground">
          Complete overview of all membership plans (including empty ones)
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={500}>
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 100,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
              tickFormatter={formatLabel}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="value"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              className="hover:opacity-80 transition-opacity"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
