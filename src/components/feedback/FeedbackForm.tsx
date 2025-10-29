import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Feedback, useFeedback } from '@/hooks/useFeedback';
import { CounterpartPreview } from './CounterpartPreview';

const feedbackSchema = z.object({
  work_date: z.date(),
  grade: z.number().min(1).max(100),
  review_subject: z.string().min(1).max(50),
  notes: z.string().optional(),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface FeedbackFormProps {
  targetUserId: string;
  authorUserId: string;
  authorRole: 'user' | 'leader';
  counterpartRoleLabel: string;
  existingFeedback?: Feedback;
  onSuccess: () => void;
  onCancel?: () => void;
}

export const FeedbackForm = ({
  targetUserId,
  authorUserId,
  authorRole,
  counterpartRoleLabel,
  existingFeedback,
  onSuccess,
  onCancel,
}: FeedbackFormProps) => {
  const { createFeedback, updateFeedback, deleteFeedback, findCounterpart } = useFeedback();
  const [isLoading, setIsLoading] = useState(false);
  const [counterpart, setCounterpart] = useState<Feedback | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: existingFeedback
      ? {
          work_date: new Date(existingFeedback.work_date),
          grade: existingFeedback.grade,
          review_subject: existingFeedback.review_subject,
          notes: existingFeedback.notes || '',
        }
      : {
          work_date: new Date(),
          grade: 80,
        },
  });

  const workDate = watch('work_date');

  useEffect(() => {
    if (workDate) {
      const loadCounterpart = async () => {
        const dateStr = format(workDate, 'yyyy-MM-dd');
        const cp = await findCounterpart(targetUserId, dateStr, authorRole);
        setCounterpart(cp);
      };
      loadCounterpart();
    }
  }, [workDate, targetUserId, authorRole]);

  const handleAlign = (data: { grade: number; review_subject: string }) => {
    setValue('grade', data.grade);
    setValue('review_subject', data.review_subject);
  };

  const onSubmit = async (data: FeedbackFormData) => {
    setIsLoading(true);
    try {
      const feedbackData = {
        target_user_id: targetUserId,
        author_user_id: authorUserId,
        author_role: authorRole,
        work_date: format(data.work_date, 'yyyy-MM-dd'),
        grade: data.grade,
        review_subject: data.review_subject.trim(),
        notes: data.notes?.trim(),
      };

      if (existingFeedback) {
        await updateFeedback(existingFeedback.id, feedbackData);
      } else {
        await createFeedback(feedbackData);
      }

      onSuccess();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingFeedback) return;
    if (!confirm('Are you sure you want to delete this feedback?')) return;

    setIsLoading(true);
    try {
      await deleteFeedback(existingFeedback.id);
      onSuccess();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Work Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !workDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {workDate ? format(workDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={workDate}
                  onSelect={(date) => date && setValue('work_date', date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {errors.work_date && (
              <p className="text-sm text-destructive">{errors.work_date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="review_subject">Review Subject</Label>
            <Input
              id="review_subject"
              {...register('review_subject')}
              placeholder="Character trait or aspect"
              maxLength={50}
            />
            {errors.review_subject && (
              <p className="text-sm text-destructive">{errors.review_subject.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="grade">Grade (1-100)</Label>
            <Input
              id="grade"
              type="number"
              {...register('grade', { valueAsNumber: true })}
              min={1}
              max={100}
            />
            {errors.grade && <p className="text-sm text-destructive">{errors.grade.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Additional comments"
              rows={4}
            />
          </div>
        </div>

        <div className="space-y-4">
          <CounterpartPreview
            counterpart={counterpart}
            onAlign={handleAlign}
            roleLabel={counterpartRoleLabel}
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        {existingFeedback && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : existingFeedback ? 'Update' : 'Save Feedback'}
        </Button>
      </div>
    </form>
  );
};
