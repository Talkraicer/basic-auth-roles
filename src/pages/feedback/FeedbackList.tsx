import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { FeedbackTable } from '@/components/feedback/FeedbackTable';
import { useFeedback, FeedbackWithAuthor } from '@/hooks/useFeedback';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FeedbackForm } from '@/components/feedback/FeedbackForm';

const FeedbackList = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { feedbacks, loading, fetchFeedbacks, deleteFeedback } = useFeedback();
  const [filterDate, setFilterDate] = useState<Date | undefined>();
  const [editingFeedback, setEditingFeedback] = useState<FeedbackWithAuthor | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadFeedbacks();
    }
  }, [user, filterDate]);

  const loadFeedbacks = () => {
    fetchFeedbacks(
      filterDate ? { work_date: format(filterDate, 'yyyy-MM-dd') } : undefined
    );
  };

  const handleEdit = (feedback: FeedbackWithAuthor) => {
    setEditingFeedback(feedback);
  };

  const handleDelete = async (id: string) => {
    await deleteFeedback(id);
    loadFeedbacks();
  };

  const handleEditSuccess = () => {
    setEditingFeedback(null);
    loadFeedbacks();
  };

  if (authLoading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Feedback History</CardTitle>
                <CardDescription>
                  View and manage all feedback entries. You can only edit or delete your own
                  entries.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {user.role === 'user' && (
                  <Button onClick={() => navigate('/feedback/self')}>
                    Add Self Feedback
                  </Button>
                )}
                {user.role === 'leader' && (
                  <Button onClick={() => navigate('/feedback/leader')}>
                    Add Leader Feedback
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-end gap-4">
              <div className="space-y-2">
                <Label>Filter by Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-[240px] justify-start text-left font-normal',
                        !filterDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filterDate ? format(filterDate, 'PPP') : 'All dates'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filterDate}
                      onSelect={setFilterDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {filterDate && (
                <Button variant="outline" onClick={() => setFilterDate(undefined)}>
                  Clear Filter
                </Button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <FeedbackTable
                feedbacks={feedbacks}
                currentUserId={user.id}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={editingFeedback !== null} onOpenChange={() => setEditingFeedback(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Feedback</DialogTitle>
          </DialogHeader>
          {editingFeedback && (
            <FeedbackForm
              targetUserId={editingFeedback.target_user_id}
              authorUserId={editingFeedback.author_user_id}
              authorRole={editingFeedback.author_role}
              counterpartRoleLabel={editingFeedback.author_role === 'user' ? 'Leader' : 'Self'}
              existingFeedback={editingFeedback}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditingFeedback(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeedbackList;
