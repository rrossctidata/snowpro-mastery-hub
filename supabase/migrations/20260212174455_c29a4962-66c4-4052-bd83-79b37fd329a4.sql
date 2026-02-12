
-- Create a public view without correct_answers for client-side use
CREATE VIEW public.questions_public AS
SELECT id, domain, question_type, question_text, options, explanation, created_at
FROM public.questions;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.questions_public TO authenticated;
GRANT SELECT ON public.questions_public TO anon;

-- Remove the old SELECT policy that exposed correct_answers to all users
DROP POLICY "Questions are readable by authenticated users" ON public.questions;

-- Create function to get correct answers ONLY for completed test review
CREATE OR REPLACE FUNCTION public.get_test_review(p_attempt_id uuid)
RETURNS TABLE(question_id uuid, correct_answers text[], explanation text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow if the attempt belongs to the current user and is completed
  IF NOT EXISTS (
    SELECT 1 FROM test_attempts 
    WHERE id = p_attempt_id 
    AND user_id = auth.uid() 
    AND completed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Not authorized or test not completed';
  END IF;
  
  RETURN QUERY
  SELECT q.id, q.correct_answers, q.explanation
  FROM questions q
  INNER JOIN test_answers ta ON ta.question_id = q.id
  WHERE ta.attempt_id = p_attempt_id;
END;
$$;
