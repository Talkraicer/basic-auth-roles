-- Ensure FK cascades are properly configured for group relationships
-- This is idempotent and will only update if constraints exist

DO $$
BEGIN
  -- Drop and recreate affiliation foreign key with CASCADE
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'affiliation_groupname_fkey' 
    AND table_name = 'affiliation'
  ) THEN
    ALTER TABLE public.affiliation DROP CONSTRAINT affiliation_groupname_fkey;
  END IF;
  
  ALTER TABLE public.affiliation
    ADD CONSTRAINT affiliation_groupname_fkey
    FOREIGN KEY (groupname) REFERENCES public.groups(groupname) ON DELETE CASCADE;

  -- Drop and recreate favorites foreign key with CASCADE
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'favorites_groupname_fkey' 
    AND table_name = 'favorites'
  ) THEN
    ALTER TABLE public.favorites DROP CONSTRAINT favorites_groupname_fkey;
  END IF;
  
  ALTER TABLE public.favorites
    ADD CONSTRAINT favorites_groupname_fkey
    FOREIGN KEY (groupname) REFERENCES public.groups(groupname) ON DELETE CASCADE;
END $$;

-- Add RLS policies to allow leaders to update and delete groups
DROP POLICY IF EXISTS "Leaders can update groups" ON public.groups;
CREATE POLICY "Leaders can update groups"
  ON public.groups
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'leader'))
  WITH CHECK (public.has_role(auth.uid(), 'leader'));

DROP POLICY IF EXISTS "Leaders can delete groups" ON public.groups;
CREATE POLICY "Leaders can delete groups"
  ON public.groups
  FOR DELETE
  USING (public.has_role(auth.uid(), 'leader'));