import { useState } from 'react';
import { format } from 'date-fns';
import { Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FeedbackWithAuthor } from '@/hooks/useFeedback';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface FeedbackTableProps {
  feedbacks: FeedbackWithAuthor[];
  currentUserId: string;
  onEdit: (feedback: FeedbackWithAuthor) => void;
  onDelete: (id: string) => void;
}

export const FeedbackTable = ({
  feedbacks,
  currentUserId,
  onEdit,
  onDelete,
}: FeedbackTableProps) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  if (feedbacks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No feedback entries found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Job/Rule</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feedbacks.map((feedback) => (
              <TableRow key={feedback.id}>
                <TableCell className="font-medium">
                  {format(new Date(feedback.work_date), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>{feedback.job_rule}</TableCell>
                <TableCell>{feedback.target_username || 'Unknown'}</TableCell>
                <TableCell>{feedback.author_username || 'Unknown'}</TableCell>
                <TableCell>
                  <Badge variant={feedback.author_role === 'leader' ? 'default' : 'secondary'}>
                    {feedback.author_role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={feedback.grade >= 70 ? 'default' : 'secondary'}>
                    {feedback.grade}/100
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[150px] truncate">
                  {feedback.review_subject}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">
                  {feedback.notes || '-'}
                </TableCell>
                <TableCell className="text-right">
                  {feedback.author_user_id === currentUserId && (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(feedback)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteId(feedback.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feedback</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this feedback? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
