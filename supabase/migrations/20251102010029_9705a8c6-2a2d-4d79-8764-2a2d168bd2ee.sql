-- Tighten RLS policies: only leaders can access group data

-- Drop existing permissive policies on groups table
DROP POLICY IF EXISTS "Authenticated can read groups" ON public.groups;

-- Create leader-only policies for groups table
CREATE POLICY "Leaders can read groups"
ON public.groups
FOR SELECT
USING (public.has_role(auth.uid(), 'leader'));

-- Ensure affiliation table is leader-only for all operations
DROP POLICY IF EXISTS "Users can read their affiliations" ON public.affiliation;

CREATE POLICY "Leaders can read affiliations"
ON public.affiliation
FOR SELECT
USING (public.has_role(auth.uid(), 'leader'));

-- Favorites should only be accessible to leaders
DROP POLICY IF EXISTS "Users can read own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can insert own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON public.favorites;

CREATE POLICY "Leaders can read own favorites"
ON public.favorites
FOR SELECT
USING (
  auth.uid() = reviewer_id
  AND public.has_role(auth.uid(), 'leader')
);

CREATE POLICY "Leaders can insert own favorites"
ON public.favorites
FOR INSERT
WITH CHECK (
  auth.uid() = reviewer_id
  AND public.has_role(auth.uid(), 'leader')
);

CREATE POLICY "Leaders can delete own favorites"
ON public.favorites
FOR DELETE
USING (
  auth.uid() = reviewer_id
  AND public.has_role(auth.uid(), 'leader')
);