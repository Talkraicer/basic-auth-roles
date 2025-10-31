import { useState, useEffect, useCallback } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  username: string;
}

interface UserPickerProps {
  value: string;
  onValueChange: (userId: string) => void;
  placeholder?: string;
  excludeUserIds?: string[];
}

export const UserPicker = ({ value, onValueChange, placeholder = 'Select user...', excludeUserIds = [] }: UserPickerProps) => {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const fetchUsers = useCallback(async (query: string) => {
    setIsSearching(true);
    try {
      let queryBuilder = supabase
        .from('members')
        .select('id, username')
        .order('username', { ascending: true })
        .limit(20);

      if (query) {
        queryBuilder = queryBuilder.ilike('username', `%${query}%`);
      }

      if (excludeUserIds.length > 0) {
        queryBuilder = queryBuilder.not('id', 'in', `(${excludeUserIds.join(',')})`);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      setUsers((data || []) as User[]);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsSearching(false);
    }
  }, [excludeUserIds]);

  useEffect(() => {
    if (open) {
      fetchUsers(searchQuery);
    }
  }, [open, searchQuery, fetchUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (open) {
        fetchUsers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, open, fetchUsers]);

  const selectedUser = users.find(u => u.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedUser ? selectedUser.username : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search users..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {isSearching ? 'Searching...' : 'No users found.'}
            </CommandEmpty>
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.id}
                  onSelect={() => {
                    onValueChange(user.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === user.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {user.username}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};