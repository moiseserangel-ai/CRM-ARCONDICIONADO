CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.settings ("userId", email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT ("userId") DO NOTHING;
  RETURN NEW;
END;
$$;

INSERT INTO public.settings ("userId", email)
SELECT id, email
FROM auth.users
ON CONFLICT ("userId") DO NOTHING;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
