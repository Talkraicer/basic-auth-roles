import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface GroupCardProps {
  groupname: string;
  membersCount: number;
  isFavorite: boolean;
  onFavoriteToggle: () => void;
  isToggling?: boolean;
}

export const GroupCard = ({ groupname, membersCount, isFavorite, onFavoriteToggle, isToggling }: GroupCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{groupname}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-2">
              <Users className="h-4 w-4" />
              {membersCount} {membersCount === 1 ? 'member' : 'members'}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              onFavoriteToggle();
            }}
            disabled={isToggling}
          >
            <Star
              className={cn(
                'h-5 w-5',
                isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
              )}
            />
          </Button>
        </div>
        <div className="pt-4">
          <Link to={`/groups/${encodeURIComponent(groupname)}`}>
            <Button variant="outline" size="sm" className="w-full">
              Manage
            </Button>
          </Link>
        </div>
      </CardHeader>
    </Card>
  );
};