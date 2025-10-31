-- 1) Groups table
CREATE TABLE IF NOT EXISTS public.groups (
  groupname TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2) Affiliation table: connects users (evaluatees) to groups
CREATE TABLE IF NOT EXISTS public.affiliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  groupname TEXT NOT NULL REFERENCES public.groups(groupname) ON DELETE CASCADE,
  evaluatee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(groupname, evaluatee_id)
);

-- 3) Favorites table: connects reviewers to their favorite groups
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  groupname TEXT NOT NULL REFERENCES public.groups(groupname) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(reviewer_id, groupname)
);

-- Enable RLS for all
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Groups: all authenticated users can read; insert only by leaders
CREATE POLICY "Authenticated can read groups"
  ON public.groups
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Leaders can create groups"
  ON public.groups
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'leader'));

-- Affiliation: users can see groups they're part of
CREATE POLICY "Users can read their affiliations"
  ON public.affiliation
  FOR SELECT
  USING (auth.uid() = evaluatee_id);

CREATE POLICY "Leaders can manage affiliations"
  ON public.affiliation
  FOR ALL
  USING (public.has_role(auth.uid(), 'leader'))
  WITH CHECK (public.has_role(auth.uid(), 'leader'));

-- Favorites: users can manage their own favorites
CREATE POLICY "Users can read own favorites"
  ON public.favorites
  FOR SELECT
  USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can insert own favorites"
  ON public.favorites
  FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete own favorites"
  ON public.favorites
  FOR DELETE
  USING (auth.uid() = reviewer_id);