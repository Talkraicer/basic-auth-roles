-- Make job_rule nullable in feedback table
ALTER TABLE public.feedback 
ALTER COLUMN job_rule DROP NOT NULL;