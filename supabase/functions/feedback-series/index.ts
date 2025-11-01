import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SeriesDataPoint {
  date: string;
  avg_grade: number;
  count: number;
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

    // GET /feedback-series?target_user_id=...&from=...&to=...
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const targetUserId = url.searchParams.get('target_user_id');
      
      if (!targetUserId) {
        return new Response(JSON.stringify({ error: 'target_user_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Default to last 90 days
      const toDate = url.searchParams.get('to') || new Date().toISOString().split('T')[0];
      const fromDate = url.searchParams.get('from') || 
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

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

      // Separate by author_role and group by date
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

      const selfReviews: SeriesDataPoint[] = Array.from(selfReviewsByDate.entries())
        .map(([date, { sum, count }]) => ({
          date,
          avg_grade: Math.round(sum / count),
          count,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const leaderReviews: SeriesDataPoint[] = Array.from(leaderReviewsByDate.entries())
        .map(([date, { sum, count }]) => ({
          date,
          avg_grade: Math.round(sum / count),
          count,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      console.log(`Fetched ${selfReviews.length} self reviews and ${leaderReviews.length} leader reviews for user ${targetUserId} (${fromDate} to ${toDate})`);
      return new Response(JSON.stringify({ self_reviews: selfReviews, leader_reviews: leaderReviews }), {
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