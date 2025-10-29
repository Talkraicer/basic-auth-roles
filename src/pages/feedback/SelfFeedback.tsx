import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { FeedbackForm } from '@/components/feedback/FeedbackForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const SelfFeedback = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'user')) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Self Feedback</CardTitle>
            <CardDescription>
              Record your feedback for the work you've done. If a leader has already submitted
              feedback for the same date, you can view and align with their assessment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FeedbackForm
              targetUserId={user.id}
              authorUserId={user.id}
              authorRole="user"
              counterpartRoleLabel="Leader"
              onSuccess={() => navigate('/feedback/list')}
              onCancel={() => navigate('/feedback/list')}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SelfFeedback;
