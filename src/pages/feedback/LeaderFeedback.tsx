import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!loading && (!user || user.role !== 'leader')) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .order('username');

      if (profiles) {
        setUsers(profiles);
      }
    };
    fetchUsers();
  }, []);

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
                  <Command>
                    <CommandInput placeholder="Search members..." />
                    <CommandList>
                      <CommandEmpty>No member found.</CommandEmpty>
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
