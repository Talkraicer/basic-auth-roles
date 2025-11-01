import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { MessageSquare, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserSelect } from '@/components/dashboard/UserSelect';
import { ReviewsChart } from '@/components/dashboard/ReviewsChart';
import { supabase } from '@/integrations/supabase/client';

interface SeriesDataPoint {
  date: string;
  avg_grade: number;
  count: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [chartData, setChartData] = useState<SeriesDataPoint[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);

  useEffect(() => {
    if (selectedUserId) {
      loadChartData();
    }
  }, [selectedUserId]);

  const loadChartData = async () => {
    if (!selectedUserId) return;
    
    setIsLoadingChart(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        `feedback-series?target_user_id=${selectedUserId}`,
        { method: 'GET' }
      );

      if (error) throw error;
      setChartData(data || []);
    } catch (error) {
      console.error('Error loading chart data:', error);
      setChartData([]);
    } finally {
      setIsLoadingChart(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold">Dashboard</h2>
            <p className="text-muted-foreground mt-2">
              Welcome back, {user?.username}!
            </p>
          </div>
          
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Review Trends</CardTitle>
                <CardDescription>View feedback grades over time</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="user-select">Select User</Label>
                  <UserSelect value={selectedUserId} onValueChange={setSelectedUserId} />
                </div>
              </CardContent>
            </Card>

            {selectedUserId && (
              <ReviewsChart data={chartData} isLoading={isLoadingChart} />
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Your Role</CardTitle>
                <CardDescription>Current user role</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold capitalize">{user?.role}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>New Feedback</CardTitle>
                <CardDescription>
                  {user?.role === 'user' 
                    ? 'Record your self-feedback' 
                    : 'Provide feedback for team members'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => navigate(user?.role === 'user' ? '/feedback/self' : '/feedback/leader')}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Create Feedback
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feedback History</CardTitle>
                <CardDescription>View and manage all feedback entries</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => navigate('/feedback/list')}
                >
                  <List className="mr-2 h-4 w-4" />
                  View All
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
