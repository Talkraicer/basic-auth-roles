import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DataPoint {
  date: string;
  avg_grade: number;
  count: number;
}

interface ReviewsChartProps {
  data: DataPoint[];
  isLoading: boolean;
}

export const ReviewsChart = ({ data, isLoading }: ReviewsChartProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Review Grades Over Time</CardTitle>
          <CardDescription>Average grade by date</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Loading chart data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Review Grades Over Time</CardTitle>
          <CardDescription>Average grade by date</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No reviews for selected period.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Grades Over Time</CardTitle>
        <CardDescription>Average grade by date (last 90 days)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
            />
            <YAxis domain={[0, 100]} className="text-xs" />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                      <p className="text-sm font-semibold">{data.date}</p>
                      <p className="text-sm text-muted-foreground">
                        Avg Grade: <span className="font-medium text-foreground">{data.avg_grade}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Reviews: <span className="font-medium text-foreground">{data.count}</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line 
              type="monotone" 
              dataKey="avg_grade" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};