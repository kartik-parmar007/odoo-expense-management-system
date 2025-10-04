-- Update handle_new_user function to check if user is being added by admin
-- If company_id is in metadata, use that instead of creating new company
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_company_id UUID;
  target_role app_role;
BEGIN
  -- Check if company_id is provided in metadata (user added by admin)
  IF NEW.raw_user_meta_data->>'company_id' IS NOT NULL THEN
    target_company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;
    target_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'employee');
  ELSE
    -- First signup - create new company
    INSERT INTO public.companies (name, currency)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'),
      COALESCE(NEW.raw_user_meta_data->>'currency', 'USD')
    )
    RETURNING id INTO target_company_id;
    
    target_role := 'admin';
  END IF;

  -- Create profile for the user
  INSERT INTO public.profiles (id, company_id, full_name, email)
  VALUES (
    NEW.id,
    target_company_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  );

  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, target_role);

  RETURN NEW;
END;
$$;