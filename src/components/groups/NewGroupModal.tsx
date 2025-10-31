import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { groupsApi } from '@/lib/api/groups';

interface NewGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const NewGroupModal = ({ open, onOpenChange, onSuccess }: NewGroupModalProps) => {
  const [groupname, setGroupname] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmed = groupname.trim().toLowerCase();
    
    if (!/^[a-z0-9._-]{3,40}$/.test(trimmed)) {
      toast({
        title: 'Invalid group name',
        description: 'Group name must be 3-40 characters, lowercase alphanumeric with . _ - only',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await groupsApi.create(trimmed);
      toast({
        title: 'Group created',
        description: `Group "${trimmed}" has been created successfully`,
      });
      setGroupname('');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create group',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogDescription>
            Create a new group to organize team members. Group names must be 3-40 characters, lowercase alphanumeric with . _ - only.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="groupname">Group Name</Label>
              <Input
                id="groupname"
                value={groupname}
                onChange={(e) => setGroupname(e.target.value)}
                placeholder="e.g., engineering-team"
                disabled={isSubmitting}
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Group'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};