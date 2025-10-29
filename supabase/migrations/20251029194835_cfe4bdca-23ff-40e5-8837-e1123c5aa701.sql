-- Fix security definer view by making it security invoker
-- This ensures RLS policies are enforced for the querying user
DROP VIEW IF EXISTS public.members;

CREATE VIEW public.members
WITH (security_invoker = true) AS
SELECT p.id, p.username
FROM public.profiles p
JOIN public.user_roles r ON r.user_id = p.id
WHERE r.role = 'user';