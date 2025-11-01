import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DataPoint {
  date: string;
  avg_grade: number;
  count: number;
}

interface ReviewsChartProps {
  selfData: DataPoint[];
  leaderData: DataPoint[];
  isLoading: boolean;
}

export const ReviewsChart = ({ selfData, leaderData, isLoading }: ReviewsChartProps) => {
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

  const hasNoData = (!selfData || selfData.length === 0) && (!leaderData || leaderData.length === 0);
  
  if (hasNoData) {
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

  // Merge dates from both datasets for proper X-axis
  const allDates = Array.from(
    new Set([
      ...(selfData || []).map(d => d.date),
      ...(leaderData || []).map(d => d.date)
    ])
  ).sort();

  // Create a complete dataset with all dates
  const mergedData = allDates.map(date => {
    const selfPoint = selfData?.find(d => d.date === date);
    const leaderPoint = leaderData?.find(d => d.date === date);
    return {
      date,
      self_avg_grade: selfPoint?.avg_grade,
      self_count: selfPoint?.count,
      leader_avg_grade: leaderPoint?.avg_grade,
      leader_count: leaderPoint?.count,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Grades Over Time</CardTitle>
        <CardDescription>Average grade by date (last 90 days)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mergedData}>
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
                      <p className="text-sm font-semibold mb-2">{data.date}</p>
                      {data.self_avg_grade !== undefined && (
                        <div className="mb-1">
                          <p className="text-sm font-medium" style={{ color: '#4287f5' }}>Self Reviews</p>
                          <p className="text-xs text-muted-foreground">
                            Grade: {data.self_avg_grade} ({data.self_count} review{data.self_count !== 1 ? 's' : ''})
                          </p>
                        </div>
                      )}
                      {data.leader_avg_grade !== undefined && (
                        <div>
                          <p className="text-sm font-medium" style={{ color: '#e34234' }}>Leader Reviews</p>
                          <p className="text-xs text-muted-foreground">
                            Grade: {data.leader_avg_grade} ({data.leader_count} review{data.leader_count !== 1 ? 's' : ''})
                          </p>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            {selfData && selfData.length > 0 && (
              <Line 
                type="monotone" 
                dataKey="self_avg_grade" 
                name="Self Reviews"
                stroke="#4287f5" 
                strokeWidth={2}
                dot={{ fill: '#4287f5', r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            )}
            {leaderData && leaderData.length > 0 && (
              <Line 
                type="monotone" 
                dataKey="leader_avg_grade" 
                name="Leader Reviews"
                stroke="#e34234" 
                strokeWidth={2}
                dot={{ fill: '#e34234', r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};