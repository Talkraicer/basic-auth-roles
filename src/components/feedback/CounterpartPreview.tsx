import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy } from 'lucide-react';
import { Feedback } from '@/hooks/useFeedback';

interface CounterpartPreviewProps {
  counterpart: Feedback | null;
  onAlign: (data: { grade: number; review_subject: string }) => void;
  roleLabel: string;
}

export const CounterpartPreview = ({
  counterpart,
  onAlign,
  roleLabel,
}: CounterpartPreviewProps) => {
  if (!counterpart) {
    return (
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">{roleLabel} Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No {roleLabel.toLowerCase()} feedback found for this date.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{roleLabel} Feedback Found</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onAlign({
              grade: counterpart.grade,
              review_subject: counterpart.review_subject,
            })
          }
        >
          <Copy className="mr-2 h-3 w-3" />
          Align to {roleLabel}
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <span className="text-xs font-medium text-muted-foreground">Review Subject:</span>
          <p className="text-sm">{counterpart.review_subject}</p>
        </div>

        <div>
          <span className="text-xs font-medium text-muted-foreground">Grade:</span>
          <p className="text-sm">
            <Badge variant={counterpart.grade >= 70 ? 'default' : 'secondary'}>
              {counterpart.grade}/100
            </Badge>
          </p>
        </div>

        {counterpart.notes && (
          <div>
            <span className="text-xs font-medium text-muted-foreground">Notes:</span>
            <p className="text-sm text-muted-foreground line-clamp-3">{counterpart.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
