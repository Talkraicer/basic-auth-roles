import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface GroupMemberGrade {
  user_id: string;
  username: string;
  avg_grade: number | null;
}

interface GroupGradesPieProps {
  groupname: string;
}

export function GroupGradesPie({ groupname }: GroupGradesPieProps) {
  const [members, setMembers] = useState<GroupMemberGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGroupGrades();
  }, [groupname]);

  const loadGroupGrades = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.functions.invoke(
        `group-grades?groupname=${encodeURIComponent(groupname)}`,
        {
          method: 'GET',
        }
      );

      if (fetchError) {
        throw fetchError;
      }

      setMembers(data.members || []);
    } catch (err) {
      console.error('Error loading group grades:', err);
      setError('Failed to load group grades');
    } finally {
      setLoading(false);
    }
  };

  const getColor = (avgGrade: number | null) => {
    if (avgGrade === null || avgGrade === 0) return '#94a3b8'; // gray for no data
    return avgGrade < 70 ? '#ef4444' : '#22c55e'; // red or green
  };

  const chartData = members.map((member) => ({
    name: member.username,
    value: member.avg_grade ?? 0,
    avg_grade: member.avg_grade,
  }));

  const hasData = members.length > 0;
  const hasFeedbackData = members.some((m) => m.avg_grade !== null);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Group Average Grades</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Group Average Grades</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Group Average Grades</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No members in this group.</p>
        </CardContent>
      </Card>
    );
  }

  if (!hasFeedbackData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Group Average Grades</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No feedback data yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Group Average Grades</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              label={({ name, avg_grade }) => `${name} (${avg_grade ?? 0})`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.avg_grade)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string, props: any) => [
                `${props.payload.avg_grade ?? 0}`,
                'Avg Grade',
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
