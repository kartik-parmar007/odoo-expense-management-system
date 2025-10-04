-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'employee');

-- Create enum for expense status
CREATE TYPE public.expense_status AS ENUM ('pending', 'approved', 'rejected');

-- Create enum for approval status
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Create companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (security best practice)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  category TEXT NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL,
  receipt_url TEXT,
  status public.expense_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create approvals table
CREATE TABLE public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE NOT NULL,
  approver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status public.approval_status NOT NULL DEFAULT 'pending',
  comment TEXT,
  sequence_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create approval_rules table
CREATE TABLE public.approval_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  rule_type TEXT NOT NULL, -- 'percentage', 'specific', 'hybrid'
  threshold DECIMAL(5, 2), -- for percentage rules
  sequence_order INTEGER NOT NULL,
  required_approver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_rules ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
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
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer function to get user's company
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.profiles
  WHERE id = _user_id
$$;

-- RLS Policies for companies
CREATE POLICY "Users can view their own company"
  ON public.companies FOR SELECT
  USING (id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can update their company"
  ON public.companies FOR UPDATE
  USING (
    id = public.get_user_company_id(auth.uid()) AND
    public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in their company"
  ON public.profiles FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admins can insert profiles in their company"
  ON public.profiles FOR INSERT
  WITH CHECK (
    company_id = public.get_user_company_id(auth.uid()) AND
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update profiles in their company"
  ON public.profiles FOR UPDATE
  USING (
    company_id = public.get_user_company_id(auth.uid()) AND
    public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view roles in their company"
  ON public.user_roles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') AND
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Admins can manage roles in their company"
  ON public.user_roles FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') AND
    user_id IN (
      SELECT id FROM public.profiles 
      WHERE company_id = public.get_user_company_id(auth.uid())
    )
  );

-- RLS Policies for expenses
CREATE POLICY "Users can view expenses in their company"
  ON public.expenses FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Employees can create their own expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Employees can update their pending expenses"
  ON public.expenses FOR UPDATE
  USING (employee_id = auth.uid() AND status = 'pending');

-- RLS Policies for approvals
CREATE POLICY "Users can view approvals in their company"
  ON public.approvals FOR SELECT
  USING (
    expense_id IN (
      SELECT id FROM public.expenses 
      WHERE company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Managers can create approvals"
  ON public.approvals FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'manager') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Approvers can update their approvals"
  ON public.approvals FOR UPDATE
  USING (approver_id = auth.uid() AND status = 'pending');

-- RLS Policies for approval_rules
CREATE POLICY "Users can view approval rules in their company"
  ON public.approval_rules FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage approval rules"
  ON public.approval_rules FOR ALL
  USING (
    company_id = public.get_user_company_id(auth.uid()) AND
    public.has_role(auth.uid(), 'admin')
  );

-- Trigger function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_approvals_updated_at
  BEFORE UPDATE ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id UUID;
BEGIN
  -- Create a new company
  INSERT INTO public.companies (name, currency)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'),
    COALESCE(NEW.raw_user_meta_data->>'currency', 'USD')
  )
  RETURNING id INTO new_company_id;

  -- Create profile for the user
  INSERT INTO public.profiles (id, company_id, full_name, email)
  VALUES (
    NEW.id,
    new_company_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Admin User'),
    NEW.email
  );

  -- Assign admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');

  RETURN NEW;
END;
$$;

-- Trigger to auto-create company and admin on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();