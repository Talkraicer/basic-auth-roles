-- Allow leaders to view feedback for all users with role='user'
CREATE POLICY "Leaders can view feedback for users"
ON public.feedback
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'leader'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = feedback.target_user_id
    AND user_roles.role = 'user'::app_role
  )
);