import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { getUserProfile, UserProfile, isAdmin, isManager, isEmployee } from "@/lib/auth";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import ManagerDashboard from "@/components/dashboard/ManagerDashboard";
import EmployeeDashboard from "@/components/dashboard/EmployeeDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

// Main dashboard component that routes users to their role-specific dashboards
const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Set up authentication state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      
      // Redirect unauthenticated users to login
      if (!session?.user) {
        navigate("/auth");
      }
    });

    // Get current session and user profile
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate("/auth");
      } else {
        // Fetch user profile with roles
        const userProfile = await getUserProfile(session.user.id);
        setProfile(userProfile);
        setIsLoading(false);
      }
    });

    // Clean up subscription
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Show loading skeleton while fetching data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  // Handle missing user or profile
  if (!user || !profile) {
    return null;
  }

  // Render role-specific dashboard
  if (isAdmin(profile)) {
    return <AdminDashboard user={user} profile={profile} />;
  }

  if (isManager(profile)) {
    return <ManagerDashboard user={user} profile={profile} />;
  }

  if (isEmployee(profile)) {
    return <EmployeeDashboard user={user} profile={profile} />;
  }

  // Handle users with no assigned role
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center p-8 bg-card rounded-lg border shadow-sm max-w-md">
        <h2 className="text-2xl font-bold mb-4">Role Not Assigned</h2>
        <p className="text-muted-foreground mb-6">No role has been assigned to your account. Please contact your administrator.</p>
        <Button onClick={() => supabase.auth.signOut()} variant="outline">
          Sign Out
        </Button>
      </div>
    </div>
  );
};


export default Dashboard;