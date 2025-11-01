import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { groupsApi, Group } from '@/lib/api/groups';
import { NewGroupModal } from '@/components/groups/NewGroupModal';
import { GroupCard } from '@/components/groups/GroupCard';
import { Plus, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';

export const GroupsList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLeader, setIsLeader] = useState(false);
  const [newGroupModalOpen, setNewGroupModalOpen] = useState(false);
  const [togglingFavorites, setTogglingFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkRole();
    loadGroups();
  }, []);

  useEffect(() => {
    // Client-side filtering
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      setFilteredGroups(groups.filter(g => g.groupname.toLowerCase().includes(query)));
    } else {
      setFilteredGroups(groups);
    }
  }, [searchQuery, groups]);

  const checkRole = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    setIsLeader(data?.role === 'leader');
  };

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const data = await groupsApi.list();
      setGroups(data);
      setFilteredGroups(data);
    } catch (error: any) {
      console.error('Error loading groups:', error);
      toast({
        title: 'Error',
        description: 'Failed to load groups',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFavoriteToggle = async (groupname: string, isFavorite: boolean) => {
    setTogglingFavorites(prev => new Set(prev).add(groupname));
    
    try {
      if (isFavorite) {
        await groupsApi.unfavorite(groupname);
      } else {
        await groupsApi.favorite(groupname);
      }
      
      // Update local state
      setGroups(prev => prev.map(g => 
        g.groupname === groupname ? { ...g, is_favorite: !isFavorite } : g
      ));
      
      toast({
        title: isFavorite ? 'Removed from favorites' : 'Added to favorites',
        description: `Group "${groupname}" ${isFavorite ? 'removed from' : 'added to'} your favorites`,
      });
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast({
        title: 'Error',
        description: 'Failed to update favorite status',
        variant: 'destructive',
      });
    } finally {
      setTogglingFavorites(prev => {
        const next = new Set(prev);
        next.delete(groupname);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Loading groups...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Groups</CardTitle>
              <CardDescription>Manage team groups and memberships</CardDescription>
            </div>
            {isLeader && (
              <Button onClick={() => setNewGroupModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Group
              </Button>
            )}
          </div>
          <div className="pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No groups found matching your search' : 'No groups yet'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGroups.map((group) => (
                <GroupCard
                  key={group.groupname}
                  groupname={group.groupname}
                  membersCount={group.members_count}
                  isFavorite={group.is_favorite}
                  onFavoriteToggle={() => handleFavoriteToggle(group.groupname, group.is_favorite)}
                  isToggling={togglingFavorites.has(group.groupname)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <NewGroupModal
        open={newGroupModalOpen}
        onOpenChange={setNewGroupModalOpen}
        onSuccess={loadGroups}
      />
      </main>
    </div>
  );
};