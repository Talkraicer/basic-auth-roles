import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { groupsApi, GroupMember } from '@/lib/api/groups';
import { ConfirmDialog } from '@/components/groups/ConfirmDialog';
import { UserPicker } from '@/components/groups/UserPicker';
import { Star, Trash2, UserPlus, ArrowLeft, Edit2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Header } from '@/components/Header';

export const GroupDetail = () => {
  const { groupname } = useParams<{ groupname: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLeader, setIsLeader] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newGroupname, setNewGroupname] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  useEffect(() => {
    if (groupname) {
      checkRole();
      checkFavorite();
      loadMembers();
    }
  }, [groupname]);

  const checkRole = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    setIsLeader(data?.role === 'leader');
  };

  const checkFavorite = async () => {
    if (!user || !groupname) return;
    
    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('reviewer_id', user.id)
      .eq('groupname', decodeURIComponent(groupname))
      .maybeSingle();

    setIsFavorite(!!data);
  };

  const loadMembers = async () => {
    if (!groupname) return;
    
    setIsLoading(true);
    try {
      const data = await groupsApi.getMembers(decodeURIComponent(groupname));
      setMembers(data);
    } catch (error: any) {
      console.error('Error loading members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load group members',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!groupname) return;
    
    setIsTogglingFavorite(true);
    try {
      if (isFavorite) {
        await groupsApi.unfavorite(decodeURIComponent(groupname));
      } else {
        await groupsApi.favorite(decodeURIComponent(groupname));
      }
      setIsFavorite(!isFavorite);
      toast({
        title: isFavorite ? 'Removed from favorites' : 'Added to favorites',
      });
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast({
        title: 'Error',
        description: 'Failed to update favorite status',
        variant: 'destructive',
      });
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const handleAddMember = async () => {
    if (!groupname || !selectedUserId) return;
    
    setIsAddingMember(true);
    try {
      await groupsApi.addMember(decodeURIComponent(groupname), selectedUserId);
      toast({
        title: 'Member added',
        description: 'Successfully added member to group',
      });
      setSelectedUserId('');
      loadMembers();
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add member',
        variant: 'destructive',
      });
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (evaluatee_id: string) => {
    if (!groupname) return;
    
    try {
      await groupsApi.removeMember(decodeURIComponent(groupname), evaluatee_id);
      toast({
        title: 'Member removed',
        description: 'Successfully removed member from group',
      });
      loadMembers();
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive',
      });
    }
  };

  const handleRename = async () => {
    if (!groupname) return;
    
    const trimmed = newGroupname.trim().toLowerCase();
    
    if (!/^[a-z0-9._-]{3,40}$/.test(trimmed)) {
      toast({
        title: 'Invalid group name',
        description: 'Group name must be 3-40 characters, lowercase alphanumeric with . _ - only',
        variant: 'destructive',
      });
      return;
    }

    setIsRenaming(true);
    try {
      await groupsApi.rename(decodeURIComponent(groupname), trimmed);
      toast({
        title: 'Group renamed',
        description: `Group renamed to "${trimmed}"`,
      });
      setRenameDialogOpen(false);
      navigate(`/groups/${encodeURIComponent(trimmed)}`, { replace: true });
    } catch (error: any) {
      console.error('Error renaming group:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to rename group',
        variant: 'destructive',
      });
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDelete = async () => {
    if (!groupname) return;
    
    setIsDeleting(true);
    try {
      await groupsApi.delete(decodeURIComponent(groupname));
      toast({
        title: 'Group deleted',
        description: 'Successfully deleted group',
      });
      navigate('/groups');
    } catch (error: any) {
      console.error('Error deleting group:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete group',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!groupname) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Group not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">{decodeURIComponent(groupname)}</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleFavoriteToggle}
          disabled={isTogglingFavorite}
        >
          <Star
            className={cn(
              'h-5 w-5',
              isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
            )}
          />
        </Button>
        {isLeader && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setNewGroupname(decodeURIComponent(groupname));
              setRenameDialogOpen(true);
            }}
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Rename
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>Manage group membership</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLeader && (
            <div className="flex gap-2">
              <div className="flex-1">
                <UserPicker
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                  placeholder="Select user to add..."
                  excludeUserIds={members.map(m => m.user_id)}
                />
              </div>
              <Button
                onClick={handleAddMember}
                disabled={!selectedUserId || isAddingMember}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading members...
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No members in this group yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Added At</TableHead>
                  {isLeader && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.user_id}>
                    <TableCell>{member.username}</TableCell>
                    <TableCell>
                      {new Date(member.added_at).toLocaleDateString()}
                    </TableCell>
                    {isLeader && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.user_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {isLeader && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Permanently delete this group and all its memberships
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Group
            </Button>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Group"
        description={`This action cannot be undone. This will permanently delete the group and remove all memberships.`}
        confirmText="Delete Group"
        requireTyping={decodeURIComponent(groupname)}
        onConfirm={handleDelete}
        destructive
      />

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Group</DialogTitle>
            <DialogDescription>
              Enter a new name for this group. All references will be updated automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-groupname">New Group Name</Label>
              <Input
                id="new-groupname"
                value={newGroupname}
                onChange={(e) => setNewGroupname(e.target.value)}
                placeholder="e.g., engineering-team"
                disabled={isRenaming}
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={isRenaming}>
              {isRenaming ? 'Renaming...' : 'Rename Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </main>
    </div>
  );
};