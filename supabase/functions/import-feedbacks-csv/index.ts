import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';
import { parse } from 'https://deno.land/std@0.224.0/csv/parse.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CSVRow {
  user_username: string;
  author_username: string;
  author_role: string;
  work_date: string;
  job_rule: string;
  grade: string;
  review_subject: string;
  notes: string;
}

interface ImportError {
  row: number;
  reason: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Check if user is a leader
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roleData, error: roleError } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'leader' });

    if (roleError || !roleData) {
      console.error('Role check error:', roleError);
      return new Response(JSON.stringify({ error: 'Access denied: Leaders only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const csvText = await file.text();
    const rows = parse(csvText, { skipFirstRow: true, columns: [
      'user_username',
      'author_username',
      'author_role',
      'work_date',
      'job_rule',
      'grade',
      'review_subject',
      'notes',
    ] }) as CSVRow[];

    console.log(`Processing ${rows.length} rows from CSV`);

    let imported = 0;
    const errors: ImportError[] = [];

    // Fetch all profiles upfront for username resolution
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username');

    const usernameToId = new Map(
      profiles?.map(p => [p.username.toLowerCase().trim(), p.id]) || []
    );

    // Fetch all user roles upfront
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('user_id, role');

    const userIdToRole = new Map(
      userRoles?.map(r => [r.user_id, r.role]) || []
    );

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // +2 because: +1 for 0-index, +1 for header row
      const row = rows[i];

      try {
        // Trim all fields
        const userUsername = row.user_username?.trim();
        let authorUsername = row.author_username?.trim();
        const authorRole = row.author_role?.trim().toLowerCase();
        const workDate = row.work_date?.trim();
        let jobRule = row.job_rule?.trim() || 'other';
        const gradeStr = row.grade?.trim();
        const reviewSubject = row.review_subject?.trim() || '';
        const notes = row.notes?.trim() || '';

        // Validate required fields
        if (!userUsername) {
          errors.push({ row: rowNum, reason: 'Missing user_username' });
          continue;
        }

        if (!authorRole || !['user', 'leader'].includes(authorRole)) {
          errors.push({ row: rowNum, reason: 'Invalid author_role (must be "user" or "leader")' });
          continue;
        }

        if (!workDate) {
          errors.push({ row: rowNum, reason: 'Missing work_date' });
          continue;
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(workDate)) {
          errors.push({ row: rowNum, reason: 'Invalid date format (expected YYYY-MM-DD)' });
          continue;
        }

        // Validate grade
        if (!gradeStr) {
          errors.push({ row: rowNum, reason: 'Missing grade' });
          continue;
        }

        const grade = parseInt(gradeStr);
        if (isNaN(grade) || grade < 1 || grade > 100) {
          errors.push({ row: rowNum, reason: 'Grade must be an integer between 1 and 100' });
          continue;
        }

        // Resolve user_username to target_user_id
        const targetUserId = usernameToId.get(userUsername.toLowerCase());
        if (!targetUserId) {
          errors.push({ row: rowNum, reason: `Unknown user_username: ${userUsername}` });
          continue;
        }

        // Handle author_username based on author_role
        let authorUserId: string;
        if (authorRole === 'user') {
          // If author_role is 'user', author_username can be blank → defaults to target user
          if (!authorUsername) {
            authorUserId = targetUserId;
          } else {
            const resolvedAuthorId = usernameToId.get(authorUsername.toLowerCase());
            if (!resolvedAuthorId) {
              errors.push({ row: rowNum, reason: `Unknown author_username: ${authorUsername}` });
              continue;
            }
            authorUserId = resolvedAuthorId;
          }
        } else {
          // author_role is 'leader'
          if (!authorUsername) {
            errors.push({ row: rowNum, reason: 'author_username is required when author_role is "leader"' });
            continue;
          }

          const resolvedAuthorId = usernameToId.get(authorUsername.toLowerCase());
          if (!resolvedAuthorId) {
            errors.push({ row: rowNum, reason: `Unknown author_username: ${authorUsername}` });
            continue;
          }

          // Verify that the author is actually a leader
          const authorRoleInDb = userIdToRole.get(resolvedAuthorId);
          if (authorRoleInDb !== 'leader') {
            errors.push({ row: rowNum, reason: `User ${authorUsername} is not a leader` });
            continue;
          }

          authorUserId = resolvedAuthorId;
        }

        // Normalize job_rule
        if (!jobRule || jobRule === '') {
          jobRule = 'other';
        }

        // Check for duplicate (author_user_id, target_user_id, work_date, job_rule)
        const { data: existing } = await supabase
          .from('feedback')
          .select('id')
          .eq('author_user_id', authorUserId)
          .eq('target_user_id', targetUserId)
          .eq('work_date', workDate)
          .eq('job_rule', jobRule)
          .single();

        if (existing) {
          errors.push({ 
            row: rowNum, 
            reason: `Duplicate feedback for (author, target, date, job_rule)` 
          });
          continue;
        }

        // Insert the feedback
        const { error: insertError } = await supabase
          .from('feedback')
          .insert({
            target_user_id: targetUserId,
            author_user_id: authorUserId,
            author_role: authorRole,
            work_date: workDate,
            job_rule: jobRule,
            grade: grade,
            review_subject: reviewSubject,
            notes: notes,
          });

        if (insertError) {
          console.error(`Error inserting row ${rowNum}:`, insertError);
          errors.push({ 
            row: rowNum, 
            reason: `Database error: ${insertError.message}` 
          });
          continue;
        }

        imported++;
        console.log(`Successfully imported row ${rowNum}`);
      } catch (error) {
        console.error(`Error processing row ${rowNum}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ 
          row: rowNum, 
          reason: `Processing error: ${errorMessage}` 
        });
      }
    }

    const response = {
      summary: {
        total_rows: rows.length,
        imported,
        skipped: rows.length - imported,
      },
      errors,
    };

    console.log('Import complete:', response.summary);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Import error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
