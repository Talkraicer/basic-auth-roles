import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { FeedbackForm } from '@/components/feedback/FeedbackForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserOption {
  id: string;
  username: string;
}

const LeaderFeedback = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'leader')) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const fetchUsers = useCallback(async (query: string = '') => {
    if (!user) return;
    
    setIsSearching(true);
    try {
      let queryBuilder = supabase
        .from('members')
        .select('id, username')
        .neq('id', user.id) // Exclude current user (leader)
        .order('username');

      // Apply search filter if query exists
      if (query.trim()) {
        queryBuilder = queryBuilder.ilike('username', `%${query}%`);
      }

      const { data: members, error } = await queryBuilder.limit(20);

      if (error) throw error;

      setUsers(members || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    } finally {
      setIsSearching(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchUsers]);

  if (loading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Leader Feedback</CardTitle>
            <CardDescription>
              Provide feedback for team members. You can view and align with their self-assessment
              if they've already submitted feedback for the same date.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Select Team Member</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                  >
                    {selectedUserId
                      ? users.find((u) => u.id === selectedUserId)?.username
                      : 'Select team member...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Search members..." 
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {isSearching ? 'Searching...' : 'No users found.'}
                      </CommandEmpty>
                      <CommandGroup>
                        {users.map((u) => (
                          <CommandItem
                            key={u.id}
                            value={u.username}
                            onSelect={() => {
                              setSelectedUserId(u.id);
                              setOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedUserId === u.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {u.username}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {selectedUserId && (
              <FeedbackForm
                key={selectedUserId}
                targetUserId={selectedUserId}
                authorUserId={user.id}
                authorRole="leader"
                counterpartRoleLabel="Self"
                onSuccess={() => navigate('/feedback/list')}
                onCancel={() => navigate('/feedback/list')}
              />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default LeaderFeedback;
