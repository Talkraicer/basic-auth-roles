import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GroupWithFavorite {
  groupname: string;
  members_count: number;
  created_at: string;
  is_favorite: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // GET /groups - List all groups with member counts and favorites
    if (req.method === 'GET' && pathParts.length === 1) {
      const search = url.searchParams.get('search') || '';
      
      let query = supabase
        .from('groups_overview')
        .select('groupname, members_count, created_at')
        .order('groupname', { ascending: true })
        .limit(50);

      if (search) {
        query = query.ilike('groupname', `%${search}%`);
      }

      const { data: groups, error: groupsError } = await query;

      if (groupsError) {
        console.error('Error fetching groups:', groupsError);
        return new Response(JSON.stringify({ error: groupsError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check which groups are favorited by this user
      const { data: favorites } = await supabase
        .from('favorites')
        .select('groupname')
        .eq('reviewer_id', user.id);

      const favoriteSet = new Set((favorites || []).map(f => f.groupname));

      const groupsWithFavorites: GroupWithFavorite[] = (groups || []).map(g => ({
        ...g,
        is_favorite: favoriteSet.has(g.groupname),
      }));

      console.log(`Fetched ${groupsWithFavorites.length} groups for user ${user.id}`);
      return new Response(JSON.stringify(groupsWithFavorites), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /groups - Create a new group (leaders only)
    if (req.method === 'POST' && pathParts.length === 1) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!roleData || roleData.role !== 'leader') {
        console.warn(`Non-leader ${user.id} attempted to create group`);
        return new Response(JSON.stringify({ error: 'Forbidden: Only leaders can create groups' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      let { groupname } = body;

      if (!groupname || typeof groupname !== 'string') {
        return new Response(JSON.stringify({ error: 'groupname is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      groupname = groupname.trim().toLowerCase();

      if (!/^[a-z0-9._-]{3,40}$/.test(groupname)) {
        return new Response(JSON.stringify({ error: 'groupname must be 3-40 characters, lowercase alphanumeric with . _ - only' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: insertError } = await supabase
        .from('groups')
        .insert({ groupname });

      if (insertError) {
        console.error('Error creating group:', insertError);
        if (insertError.code === '23505') {
          return new Response(JSON.stringify({ error: 'Group name already exists' }), {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Group "${groupname}" created by leader ${user.id}`);
      return new Response(JSON.stringify({ ok: true, groupname }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PATCH /groups/rename - Rename a group (leaders only)
    if (req.method === 'PATCH' && pathParts.length === 2 && pathParts[1] === 'rename') {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!roleData || roleData.role !== 'leader') {
        console.warn(`Non-leader ${user.id} attempted to rename group`);
        return new Response(JSON.stringify({ error: 'Forbidden: Only leaders can rename groups' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      let { from_groupname, to_groupname } = body;

      if (!from_groupname || !to_groupname) {
        return new Response(JSON.stringify({ error: 'from_groupname and to_groupname are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      from_groupname = from_groupname.trim().toLowerCase();
      to_groupname = to_groupname.trim().toLowerCase();

      if (from_groupname === to_groupname) {
        return new Response(JSON.stringify({ error: 'New name must be different' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!/^[a-z0-9._-]{3,40}$/.test(to_groupname)) {
        return new Response(JSON.stringify({ error: 'groupname must be 3-40 characters, lowercase alphanumeric with . _ - only' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: renameError } = await supabase.rpc('rename_group', {
        _from: from_groupname,
        _to: to_groupname,
      });

      if (renameError) {
        console.error('Error renaming group:', renameError);
        if (renameError.message.includes('target_exists')) {
          return new Response(JSON.stringify({ error: 'Target group name already exists' }), {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (renameError.message.includes('group_not_found')) {
          return new Response(JSON.stringify({ error: 'Group not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ error: renameError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Group "${from_groupname}" renamed to "${to_groupname}" by leader ${user.id}`);
      return new Response(JSON.stringify({ ok: true, groupname: to_groupname }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE /groups/:groupname - Delete a group (leaders only)
    if (req.method === 'DELETE' && pathParts.length === 2) {
      const groupname = pathParts[1];

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!roleData || roleData.role !== 'leader') {
        console.warn(`Non-leader ${user.id} attempted to delete group`);
        return new Response(JSON.stringify({ error: 'Forbidden: Only leaders can delete groups' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: deleteError } = await supabase
        .from('groups')
        .delete()
        .eq('groupname', groupname);

      if (deleteError) {
        console.error('Error deleting group:', deleteError);
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Group "${groupname}" deleted by leader ${user.id}`);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});