-- Create user_roles table for secure role management
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursive RLS issues)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policy for user_roles: users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Remove role column from profiles (it's now in user_roles)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Create feedback table
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_role public.app_role NOT NULL,
  work_date DATE NOT NULL,
  job_rule TEXT NOT NULL CHECK (length(job_rule) BETWEEN 1 AND 100),
  grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 100),
  review_subject TEXT NOT NULL CHECK (length(review_subject) BETWEEN 1 AND 50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(author_user_id, target_user_id, work_date, job_rule)
);

-- Enable RLS on feedback
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies for feedback
CREATE POLICY "Users can view feedback where they are target or author"
ON public.feedback
FOR SELECT
USING (
  auth.uid() = target_user_id OR 
  auth.uid() = author_user_id
);

CREATE POLICY "Users can insert feedback as themselves"
ON public.feedback
FOR INSERT
WITH CHECK (
  auth.uid() = author_user_id AND
  (
    (author_role = 'user' AND target_user_id = auth.uid()) OR
    (author_role = 'leader' AND public.has_role(auth.uid(), 'leader'))
  )
);

CREATE POLICY "Users can update their own feedback"
ON public.feedback
FOR UPDATE
USING (auth.uid() = author_user_id)
WITH CHECK (auth.uid() = author_user_id);

CREATE POLICY "Users can delete their own feedback"
ON public.feedback
FOR DELETE
USING (auth.uid() = author_user_id);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_feedback_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_feedback_updated_at
BEFORE UPDATE ON public.feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_feedback_updated_at();

-- Create index for common queries
CREATE INDEX idx_feedback_target_date ON public.feedback(target_user_id, work_date);
CREATE INDEX idx_feedback_author_date ON public.feedback(author_user_id, work_date);