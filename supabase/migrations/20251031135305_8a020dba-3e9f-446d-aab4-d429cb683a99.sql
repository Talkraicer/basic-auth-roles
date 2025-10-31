-- Safe rename function (transactional)
CREATE OR REPLACE FUNCTION public.rename_group(_from TEXT, _to TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'leader') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF EXISTS (SELECT 1 FROM public.groups g WHERE g.groupname = _to) THEN
    RAISE EXCEPTION 'target_exists';
  END IF;

  -- Update children first
  UPDATE public.affiliation SET groupname = _to WHERE groupname = _from;
  UPDATE public.favorites SET groupname = _to WHERE groupname = _from;

  -- Update parent
  UPDATE public.groups SET groupname = _to WHERE groupname = _from;

  IF NOT FOUND THEN 
    RAISE EXCEPTION 'group_not_found'; 
  END IF;
END;
$$;

-- Aggregated listing view for member counts
CREATE OR REPLACE VIEW public.groups_overview AS
SELECT
  g.groupname,
  g.created_at,
  COALESCE(a.members_count, 0) AS members_count
FROM public.groups g
LEFT JOIN (
  SELECT groupname, COUNT(*)::int AS members_count
  FROM public.affiliation
  GROUP BY groupname
) a ON a.groupname = g.groupname;

-- Add RLS policies for leaders to update/delete groups
CREATE POLICY "Leaders can update groups"
  ON public.groups
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'leader'))
  WITH CHECK (public.has_role(auth.uid(), 'leader'));

CREATE POLICY "Leaders can delete groups"
  ON public.groups
  FOR DELETE
  USING (public.has_role(auth.uid(), 'leader'));