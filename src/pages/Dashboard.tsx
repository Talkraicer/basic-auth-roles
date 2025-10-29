import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, List, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

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
