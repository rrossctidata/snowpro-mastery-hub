
-- Drop the existing SECURITY DEFINER view
DROP VIEW IF EXISTS public.questions_public;

-- Add a SELECT RLS policy on the questions table for authenticated users
CREATE POLICY "Authenticated users can read questions"
ON public.questions
FOR SELECT
USING (auth.role() = 'authenticated');

-- Revoke SELECT on the sensitive column from non-superuser roles
REVOKE SELECT (correct_answers) ON public.questions FROM anon, authenticated;

-- Recreate the view WITHOUT security_definer (defaults to security_invoker)
CREATE VIEW public.questions_public
WITH (security_invoker = true)
AS SELECT id, question_text, domain, options, question_type, explanation, created_at
FROM public.questions;
