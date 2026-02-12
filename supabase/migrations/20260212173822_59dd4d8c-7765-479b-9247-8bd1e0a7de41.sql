
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  display_name_value TEXT;
BEGIN
  display_name_value := COALESCE(
    SUBSTRING(NEW.raw_user_meta_data->>'display_name', 1, 100),
    SUBSTRING(NEW.email, 1, 100)
  );
  
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, display_name_value);
  
  RETURN NEW;
END;
$$;
