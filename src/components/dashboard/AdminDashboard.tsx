import { User } from "@supabase/supabase-js";
import { UserProfile } from "@/lib/auth";
import DashboardLayout from "./DashboardLayout";
import StatsCards from "./StatsCards";
import ExpensesList from "./ExpensesList";
import UsersManagement from "./UsersManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Props interface for AdminDashboard component
interface AdminDashboardProps {
  user: User;
  profile: UserProfile;
}

// Admin dashboard with tabbed interface for different sections
const AdminDashboard = ({ user, profile }: AdminDashboardProps) => {
  return (
    <DashboardLayout title="Admin Dashboard" subtitle={profile.full_name}>
      {/* Tab navigation for different admin sections */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        {/* Overview tab with stats and recent expenses */}
        <TabsContent value="overview" className="space-y-6">
          <StatsCards companyId={profile.company_id} />
          <ExpensesList companyId={profile.company_id} isAdmin={true} />
        </TabsContent>

        {/* Expenses tab with all company expenses */}
        <TabsContent value="expenses" className="space-y-6">
          <ExpensesList companyId={profile.company_id} isAdmin={true} />
        </TabsContent>

        {/* Users tab with user management */}
        <TabsContent value="users" className="space-y-6">
          <UsersManagement companyId={profile.company_id} />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};


export default AdminDashboard;