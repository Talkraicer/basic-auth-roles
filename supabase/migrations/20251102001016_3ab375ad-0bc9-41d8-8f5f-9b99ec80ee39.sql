-- Create function to get group members with their average grades
CREATE OR REPLACE FUNCTION get_group_grades(p_groupname TEXT)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avg_grade NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS user_id,
    p.username,
    ROUND(AVG(f.grade)::numeric, 1) AS avg_grade
  FROM public.affiliation a
  JOIN public.profiles p ON p.id = a.evaluatee_id
  LEFT JOIN public.feedback f ON f.target_user_id = a.evaluatee_id
  WHERE a.groupname = p_groupname
  GROUP BY p.id, p.username
  ORDER BY avg_grade DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;