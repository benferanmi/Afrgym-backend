// Updated interface
export interface MembershipDistribution {
  name: string;
  value: number;
  level_id: number;
}

// Updated chart component
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "@/components/ui/chart-simple";

interface MembershipDistributionChartProps {
  data: MembershipDistribution[];
}

// Generate colors for the chart
const generateColors = (count: number) => {
  const colors = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7300",
    "#00ff00",
    "#ff00ff",
    "#00ffff",
    "#ff0000",
    "#0000ff",
    "#ffff00",
    "#ff8080",
    "#80ff80",
    "#8080ff",
    "#ffcc99",
    "#cc99ff",
  ];

  return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
};

export function MembershipDistributionChart({
  data,
}: MembershipDistributionChartProps) {
  // Filter out plans with 0 members for cleaner chart
  const chartData = data.filter((item) => item.value > 0);
  const colors = generateColors(chartData.length);

  // Custom label function to show percentage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderLabel = (entry: any) => {
    const total = chartData.reduce((sum, item) => sum + item.value, 0);
    const percent = ((entry.value / total) * 100).toFixed(1);
    return `${percent}%`;
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Membership Distribution</CardTitle>
        <p className="text-sm text-muted-foreground">
          Distribution of members across different membership plans
        </p>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number, name: string) => [
                  `${value} members`,
                  name,
                ]}
              />
              <Legend
                formatter={(value) => (
                  <span style={{ color: "hsl(var(--foreground))" }}>
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
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
