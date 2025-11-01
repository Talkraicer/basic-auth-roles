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

      console.log(`Fetching self reviews for user ${targetUserId} from ${fromDate} to ${toDate}`);

      // Fetch self reviews (author_role = 'user') - RLS will enforce access control
      const { data: feedbacks, error: fetchError } = await supabase
        .from('feedback')
        .select('work_date, grade')
        .eq('target_user_id', targetUserId)
        .eq('author_role', 'user')
        .gte('work_date', fromDate)
        .lte('work_date', toDate)
        .order('work_date', { ascending: true });

      if (fetchError) {
        console.error('Error fetching self reviews:', fetchError);
        return new Response(JSON.stringify({ error: fetchError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Fetched ${feedbacks?.length || 0} self review records`);

      // Group by date and calculate average
      const reviewsByDate = new Map<string, { sum: number; count: number }>();
      
      for (const feedback of feedbacks || []) {
        const dateStr = feedback.work_date;
        
        if (!reviewsByDate.has(dateStr)) {
          reviewsByDate.set(dateStr, { sum: 0, count: 0 });
        }
        const group = reviewsByDate.get(dateStr)!;
        group.sum += feedback.grade;
        group.count += 1;
      }

      console.log(`Grouped into ${reviewsByDate.size} unique dates`);

      const series: SeriesDataPoint[] = Array.from(reviewsByDate.entries()).map(([date, group]) => ({
        date,
        avg_grade: Math.round(group.sum / group.count),
        count: group.count,
      })).sort((a, b) => a.date.localeCompare(b.date));

      console.log(`Returning ${series.length} data points`);
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
