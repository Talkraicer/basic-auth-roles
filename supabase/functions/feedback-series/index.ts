import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SeriesDataPoint {
  date: string;
  self_avg: number | null;
  leader_avg: number | null;
  count_self: number;
  count_leader: number;
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

    // Attempt to read auth header but rely on RLS for access control
    // We intentionally skip explicit supabase.auth.getUser() to avoid 401s when
    // the client token is missing/expired. RLS will enforce permissions.
    // const { data: { user }, error: userError } = await supabase.auth.getUser();
    // if (userError || !user) {
    //   console.error('Auth error:', userError);
    //   return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    //     status: 401,
    //     headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    //   });
    // }

    // GET/POST /feedback-series with payload: { target_user_id, from?, to? }
    if (req.method === 'GET' || req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const targetUserId = body.target_user_id;
      
      if (!targetUserId) {
        return new Response(JSON.stringify({ error: 'target_user_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Default to last 90 days
      const toDate = body.to || new Date().toISOString().split('T')[0];
      const fromDate = body.from || 
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      console.log(`Fetching feedback for user ${targetUserId} from ${fromDate} to ${toDate}`);

      // Fetch feedback data - RLS will enforce access control
      const { data: feedbacks, error: fetchError } = await supabase
        .from('feedback')
        .select('work_date, grade, author_role')
        .eq('target_user_id', targetUserId)
        .gte('work_date', fromDate)
        .lte('work_date', toDate)
        .order('work_date', { ascending: true });

      if (fetchError) {
        console.error('Error fetching feedback:', fetchError);
        return new Response(JSON.stringify({ error: fetchError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Fetched ${feedbacks?.length || 0} total feedback records`);

      // Group by date and author_role
      const selfReviewsByDate = new Map<string, { sum: number; count: number }>();
      const leaderReviewsByDate = new Map<string, { sum: number; count: number }>();
      
      for (const feedback of feedbacks || []) {
        const dateStr = feedback.work_date;
        const targetMap = feedback.author_role === 'user' ? selfReviewsByDate : leaderReviewsByDate;
        
        if (!targetMap.has(dateStr)) {
          targetMap.set(dateStr, { sum: 0, count: 0 });
        }
        const group = targetMap.get(dateStr)!;
        group.sum += feedback.grade;
        group.count += 1;
      }

      console.log(`Grouped into ${selfReviewsByDate.size} self-review dates and ${leaderReviewsByDate.size} leader-review dates`);

      // Merge into single series with all unique dates
      const allDates = new Set([
        ...Array.from(selfReviewsByDate.keys()),
        ...Array.from(leaderReviewsByDate.keys())
      ]);

      const series = Array.from(allDates).map(date => {
        const self = selfReviewsByDate.get(date);
        const leader = leaderReviewsByDate.get(date);
        
        return {
          date,
          self_avg: self ? Math.round(self.sum / self.count) : null,
          leader_avg: leader ? Math.round(leader.sum / leader.count) : null,
          count_self: self?.count || 0,
          count_leader: leader?.count || 0,
        };
      }).sort((a, b) => a.date.localeCompare(b.date));

      console.log(`Returning ${series.length} merged data points`);
      return new Response(JSON.stringify({ series }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
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