import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface FeedbackGradeChartProps {
  targetUserId: string;
  targetUsername: string;
}

interface ChartDataPoint {
  date: string;
  selfGrade: number | null;
  leaderGrade: number | null;
}

export const FeedbackGradeChart = ({ targetUserId, targetUsername }: FeedbackGradeChartProps) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const { data, error } = await supabase
          .from('feedback')
          .select('review_subject')
          .eq('target_user_id', targetUserId);

        if (error) throw error;

        const uniqueSubjects = Array.from(new Set(data?.map(f => f.review_subject) || []));
        setSubjects(uniqueSubjects);
        
        // Auto-select first subject
        if (uniqueSubjects.length > 0 && !selectedSubject) {
          setSelectedSubject(uniqueSubjects[0]);
        }
      } catch (error) {
        console.error('Failed to fetch subjects:', error);
        setSubjects([]);
      }
    };

    fetchSubjects();
  }, [targetUserId]);

  useEffect(() => {
    if (!selectedSubject) return;

    const fetchFeedbackData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('feedback')
          .select('work_date, grade, author_role, review_subject')
          .eq('target_user_id', targetUserId)
          .eq('review_subject', selectedSubject)
          .order('work_date', { ascending: true });

        if (error) throw error;

        // Group by date and separate self vs leader grades
        const dateMap = new Map<string, ChartDataPoint>();
        
        data?.forEach((feedback) => {
          const dateKey = feedback.work_date;
          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, {
              date: format(new Date(dateKey), 'MMM dd'),
              selfGrade: null,
              leaderGrade: null,
            });
          }
          
          const point = dateMap.get(dateKey)!;
          if (feedback.author_role === 'user') {
            point.selfGrade = feedback.grade;
          } else if (feedback.author_role === 'leader') {
            point.leaderGrade = feedback.grade;
          }
        });

        setChartData(Array.from(dateMap.values()));
      } catch (error) {
        console.error('Failed to fetch feedback data:', error);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbackData();
  }, [targetUserId, selectedSubject]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feedback Grades Over Time</CardTitle>
          <CardDescription>Loading chart data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (subjects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feedback Grades Over Time</CardTitle>
          <CardDescription>No feedback data available for {targetUsername}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const chartConfig = {
    selfGrade: {
      label: 'Self Assessment',
      color: 'hsl(var(--chart-1))',
    },
    leaderGrade: {
      label: 'Leader Feedback',
      color: 'hsl(var(--chart-2))',
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feedback Grades Over Time</CardTitle>
        <CardDescription>
          Comparing self-assessment and leader feedback for {targetUsername}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Review Subject</Label>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Select a subject" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {subjects.map((subject) => (
                <SelectItem key={subject} value={subject}>
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No feedback data for this subject yet.</p>
        ) : (
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--foreground))' }}
              />
              <YAxis 
                domain={[0, 5]} 
                ticks={[0, 1, 2, 3, 4, 5]}
                className="text-xs"
                tick={{ fill: 'hsl(var(--foreground))' }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="selfGrade"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--chart-1))' }}
                connectNulls
                name="Self Assessment"
              />
              <Line
                type="monotone"
                dataKey="leaderGrade"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--chart-2))' }}
                connectNulls
                name="Leader Feedback"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};
