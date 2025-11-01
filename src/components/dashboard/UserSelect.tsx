import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  username: string;
}

interface UserSelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export const UserSelect = ({ value, onValueChange }: UserSelectProps) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isLeader = user?.role === 'leader';

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      if (isLeader) {
        // Leaders can see all users with 'user' role
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'user');

        if (userRoles && userRoles.length > 0) {
          const userIds = userRoles.map(ur => ur.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', userIds)
            .order('username');

          setUsers(profiles || []);
        }
      } else {
        // Regular users only see themselves
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username')
          .eq('id', user?.id)
          .single();

        if (profile) {
          setUsers([profile]);
          onValueChange(profile.id); // Auto-select for users
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Loading users..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={!isLeader}>
      <SelectTrigger>
        <SelectValue placeholder="Select a user..." />
      </SelectTrigger>
      <SelectContent>
        {users.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.username}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};