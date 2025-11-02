import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const groupname = url.searchParams.get('groupname');

    if (!groupname) {
      return new Response(JSON.stringify({ error: 'Missing groupname parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch member average grades using SQL
    const { data: memberAvgs, error: queryError } = await supabase.rpc('get_group_grades', {
      p_groupname: groupname,
    });

    if (queryError) {
      console.error('Error fetching group grades:', queryError);
      return new Response(JSON.stringify({ error: 'Failed to fetch group grades' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Count members in each bucket (exclude null grades)
    const below70 = (memberAvgs || []).filter((m: any) => m.avg_grade !== null && m.avg_grade < 70).length;
    const gte70 = (memberAvgs || []).filter((m: any) => m.avg_grade !== null && m.avg_grade >= 70).length;

    const buckets = [
      { label: 'Below 70', count: below70 },
      { label: '70 and above', count: gte70 },
    ];

    return new Response(
      JSON.stringify({
        groupname,
        buckets,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
