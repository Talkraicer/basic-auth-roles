import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    
    // Expected: /group-members/:groupname or /group-members/:groupname/:evaluatee_id
    if (pathParts.length < 2) {
      return new Response(JSON.stringify({ error: 'Invalid path' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const groupname = decodeURIComponent(pathParts[1]);

    // GET /group-members/:groupname - List members
    if (req.method === 'GET' && pathParts.length === 2) {
      const { data: affiliations, error: affiliationsError } = await supabase
        .from('affiliation')
        .select('evaluatee_id, created_at')
        .eq('groupname', groupname)
        .order('created_at', { ascending: false });

      if (affiliationsError) {
        console.error('Error fetching affiliations:', affiliationsError);
        return new Response(JSON.stringify({ error: affiliationsError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!affiliations || affiliations.length === 0) {
        console.log(`No members found for group "${groupname}"`);
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch usernames for all evaluatees
      const userIds = affiliations.map(a => a.evaluatee_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return new Response(JSON.stringify({ error: profilesError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const profileMap = new Map((profiles || []).map(p => [p.id, p.username]));

      const members = affiliations.map(a => ({
        user_id: a.evaluatee_id,
        username: profileMap.get(a.evaluatee_id) || 'Unknown',
        added_at: a.created_at,
      }));

      console.log(`Fetched ${members.length} members for group "${groupname}"`);
      return new Response(JSON.stringify(members), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /group-members/:groupname - Add member (leaders only)
    if (req.method === 'POST' && pathParts.length === 2) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!roleData || roleData.role !== 'leader') {
        console.warn(`Non-leader ${user.id} attempted to add member to group`);
        return new Response(JSON.stringify({ error: 'Forbidden: Only leaders can add members' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { evaluatee_id } = body;

      if (!evaluatee_id) {
        return new Response(JSON.stringify({ error: 'evaluatee_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: insertError } = await supabase
        .from('affiliation')
        .insert({ groupname, evaluatee_id });

      if (insertError) {
        console.error('Error adding member:', insertError);
        if (insertError.code === '23505') {
          return new Response(JSON.stringify({ error: 'Member already in group' }), {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`User ${evaluatee_id} added to group "${groupname}" by leader ${user.id}`);
      return new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE /group-members/:groupname/:evaluatee_id - Remove member (leaders only)
    if (req.method === 'DELETE' && pathParts.length === 3) {
      const evaluatee_id = pathParts[2];

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!roleData || roleData.role !== 'leader') {
        console.warn(`Non-leader ${user.id} attempted to remove member from group`);
        return new Response(JSON.stringify({ error: 'Forbidden: Only leaders can remove members' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: deleteError } = await supabase
        .from('affiliation')
        .delete()
        .eq('groupname', groupname)
        .eq('evaluatee_id', evaluatee_id);

      if (deleteError) {
        console.error('Error removing member:', deleteError);
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`User ${evaluatee_id} removed from group "${groupname}" by leader ${user.id}`);
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