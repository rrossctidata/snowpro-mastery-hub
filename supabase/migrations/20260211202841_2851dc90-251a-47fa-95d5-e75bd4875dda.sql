
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Create questions table (public read, admin write later)
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('single', 'multi')),
  options JSONB NOT NULL, -- array of {id, text}
  correct_answers TEXT[] NOT NULL, -- array of option ids
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Questions are readable by authenticated users"
  ON public.questions FOR SELECT
  TO authenticated
  USING (true);

-- Create test_attempts table
CREATE TABLE public.test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('practice', 'study')),
  score INTEGER, -- scaled 0-1000
  total_questions INTEGER NOT NULL DEFAULT 100,
  correct_count INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  time_remaining_seconds INTEGER,
  domain_scores JSONB, -- {domain: {correct, total}}
  is_pass BOOLEAN
);

ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own test attempts"
  ON public.test_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own test attempts"
  ON public.test_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own test attempts"
  ON public.test_attempts FOR UPDATE
  USING (auth.uid() = user_id);

-- Create test_answers table
CREATE TABLE public.test_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES public.test_attempts(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  user_answers TEXT[] NOT NULL DEFAULT '{}',
  is_correct BOOLEAN,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  answered_at TIMESTAMPTZ
);

ALTER TABLE public.test_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own test answers"
  ON public.test_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.test_attempts
      WHERE test_attempts.id = test_answers.attempt_id
      AND test_attempts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own test answers"
  ON public.test_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.test_attempts
      WHERE test_attempts.id = test_answers.attempt_id
      AND test_attempts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own test answers"
  ON public.test_answers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.test_attempts
      WHERE test_attempts.id = test_answers.attempt_id
      AND test_attempts.user_id = auth.uid()
    )
  );

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
