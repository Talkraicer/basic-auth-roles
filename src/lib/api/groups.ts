import { supabase } from "@/integrations/supabase/client";

export interface Group {
  groupname: string;
  members_count: number;
  created_at: string;
  is_favorite: boolean;
}

export interface GroupMember {
  user_id: string;
  username: string;
  added_at: string;
}

export const groupsApi = {
  async list(search?: string): Promise<Group[]> {
    const { data, error } = await supabase.functions.invoke('groups', {
      method: 'GET',
      body: null,
    });

    if (error) throw error;
    
    let groups = data as Group[];
    
    // Client-side filtering if search is provided
    if (search) {
      const searchLower = search.toLowerCase();
      groups = groups.filter(g => g.groupname.toLowerCase().includes(searchLower));
    }
    
    return groups;
  },

  async create(groupname: string): Promise<{ ok: boolean; groupname: string }> {
    const { data, error } = await supabase.functions.invoke('groups', {
      method: 'POST',
      body: { groupname },
    });

    if (error) throw error;
    return data;
  },

  async rename(from_groupname: string, to_groupname: string): Promise<{ ok: boolean; groupname: string }> {
    const { data, error } = await supabase.functions.invoke('groups', {
      method: 'PATCH',
      body: { from_groupname, to_groupname },
    });

    if (error) throw error;
    return data;
  },

  async delete(groupname: string): Promise<{ ok: boolean }> {
    const { data, error } = await supabase.functions.invoke('groups', {
      method: 'DELETE',
      body: { groupname },
    });

    if (error) throw error;
    return data;
  },

  async getMembers(groupname: string): Promise<GroupMember[]> {
    const { data, error } = await supabase.functions.invoke('group-members', {
      method: 'GET',
      body: { groupname },
    });

    if (error) throw error;
    return data as GroupMember[];
  },

  async addMember(groupname: string, evaluatee_id: string): Promise<{ ok: boolean }> {
    const { data, error } = await supabase.functions.invoke('group-members', {
      method: 'POST',
      body: { groupname, evaluatee_id },
    });

    if (error) throw error;
    return data;
  },

  async removeMember(groupname: string, evaluatee_id: string): Promise<{ ok: boolean }> {
    const { data, error } = await supabase.functions.invoke('group-members', {
      method: 'DELETE',
      body: { groupname, evaluatee_id },
    });

    if (error) throw error;
    return data;
  },

  async favorite(groupname: string): Promise<{ ok: boolean; favorited: boolean }> {
    const { data, error } = await supabase.functions.invoke('group-favorites', {
      method: 'POST',
      body: { groupname },
    });

    if (error) throw error;
    return data;
  },

  async unfavorite(groupname: string): Promise<{ ok: boolean; favorited: boolean }> {
    const { data, error } = await supabase.functions.invoke('group-favorites', {
      method: 'DELETE',
      body: { groupname },
    });

    if (error) throw error;
    return data;
  },
};