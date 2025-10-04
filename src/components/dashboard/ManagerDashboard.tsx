import { User } from "@supabase/supabase-js";
import { UserProfile } from "@/lib/auth";
import DashboardLayout from "./DashboardLayout";
import StatsCards from "./StatsCards";
import ApprovalsQueue from "./ApprovalsQueue";
import ExpensesList from "./ExpensesList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

interface ManagerDashboardProps {
  user: User;
  profile: UserProfile;
}

const ManagerDashboard = ({ user, profile }: ManagerDashboardProps) => {
  const [refreshStats, setRefreshStats] = useState(0);

  const handleExpenseUpdated = () => {
    // Trigger a refresh of the stats cards
    setRefreshStats(prev => prev + 1);
  };

  return (
    <DashboardLayout title="Manager Dashboard" subtitle={profile.full_name}>
      <Tabs defaultValue="approvals" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
          <TabsTrigger value="expenses">Team Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="approvals" className="space-y-6">
          <StatsCards 
            companyId={profile.company_id} 
            managerId={profile.id} 
            key={refreshStats}
          />
          <ApprovalsQueue 
            managerId={profile.id} 
            companyId={profile.company_id} 
          />
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <ExpensesList companyId={profile.company_id} managerId={profile.id} />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default ManagerDashboard;