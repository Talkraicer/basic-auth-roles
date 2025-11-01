import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DataPoint {
  date: string;
  self_avg: number | null;
  leader_avg: number | null;
  count_self: number;
  count_leader: number;
}

interface ReviewsChartProps {
  data: DataPoint[];
  isLoading: boolean;
}

const ReviewsChart = ({ data, isLoading }: ReviewsChartProps) => {
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

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Review Trends Over Time</CardTitle>
          <CardDescription>Average grades by review type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No review data available for the selected period.
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="font-medium mb-2">{data.date}</p>
        {data.self_avg !== null && (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-[hsl(var(--chart-1))]" />
            <span>Self Reviews: {data.self_avg} ({data.count_self} review{data.count_self !== 1 ? 's' : ''})</span>
          </div>
        )}
        {data.leader_avg !== null && (
          <div className="flex items-center gap-2 text-sm mt-1">
            <div className="w-3 h-3 rounded-full bg-[hsl(var(--chart-2))]" />
            <span>Leader Reviews: {data.leader_avg} ({data.count_leader} review{data.count_leader !== 1 ? 's' : ''})</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Trends Over Time</CardTitle>
        <CardDescription>Average grades by review type</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              domain={[0, 100]}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="self_avg"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              name="Self Reviews"
              dot={{ fill: 'hsl(var(--chart-1))', r: 4 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="leader_avg"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              name="Leader Reviews"
              dot={{ fill: 'hsl(var(--chart-2))', r: 4 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export { ReviewsChart };