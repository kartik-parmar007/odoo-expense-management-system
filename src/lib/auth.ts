import { supabase } from "@/integrations/supabase/client";

// Define user roles for the application
export type UserRole = 'admin' | 'manager' | 'employee';

// User profile interface with all required fields
export interface UserProfile {
  id: string;
  company_id: string;
  manager_id: string | null;
  full_name: string;
  email: string;
  roles: UserRole[];
}

/**
 * Fetch user profile with associated roles from the database
 * @param userId - The ID of the user to fetch
 * @returns UserProfile object or null if not found
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  // Fetch user profile data
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  // Return null if profile not found or error occurred
  if (profileError || !profile) return null;

  // Fetch user roles
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  // Return profile with roles
  return {
    ...profile,
    roles: roles?.map(r => r.role as UserRole) || []
  };
};

/**
 * Check if a user has a specific role
 * @param profile - User profile to check
 * @param role - Role to check for
 * @returns Boolean indicating if user has the role
 */
export const hasRole = (profile: UserProfile | null, role: UserRole): boolean => {
  return profile?.roles?.includes(role) || false;
};

/**
 * Check if user is an administrator
 * @param profile - User profile to check
 * @returns Boolean indicating if user is admin
 */
export const isAdmin = (profile: UserProfile | null): boolean => {
  return hasRole(profile, 'admin');
};

/**
 * Check if user is a manager
 * @param profile - User profile to check
 * @returns Boolean indicating if user is manager
 */
export const isManager = (profile: UserProfile | null): boolean => {
  return hasRole(profile, 'manager');
};

/**
 * Check if user is an employee
 * @param profile - User profile to check
 * @returns Boolean indicating if user is employee
 */
export const isEmployee = (profile: UserProfile | null): boolean => {
  return hasRole(profile, 'employee');
};