-- Allow users to view profiles of feedback authors who wrote about them
CREATE POLICY "Users can view profiles of their feedback authors"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.feedback
    WHERE feedback.author_user_id = profiles.id
    AND feedback.target_user_id = auth.uid()
  )
);