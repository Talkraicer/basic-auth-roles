-- 1) Allow leaders to view all profiles for member selection
CREATE POLICY "Leaders can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'leader'));

-- 2) Allow leaders to view user_roles for role filtering
CREATE POLICY "Leaders can view user_roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'leader'));

-- 3) Create convenience view of members (role='user') for autocomplete
CREATE OR REPLACE VIEW public.members AS
SELECT p.id, p.username
FROM public.profiles p
JOIN public.user_roles r ON r.user_id = p.id
WHERE r.role = 'user';

-- 4) Update feedback INSERT policy to prevent leaders from targeting themselves
DROP POLICY IF EXISTS "Users can insert feedback as themselves" ON public.feedback;

CREATE POLICY "Insert feedback with role-aware constraints"
ON public.feedback
FOR INSERT
WITH CHECK (
  auth.uid() = author_user_id
  AND (
    -- self mode: user reviewing self
    (author_role = 'user' AND target_user_id = auth.uid())
    OR
    -- leader mode: must be a leader AND target != self
    (author_role = 'leader' AND public.has_role(auth.uid(), 'leader') AND target_user_id <> auth.uid())
  )
);