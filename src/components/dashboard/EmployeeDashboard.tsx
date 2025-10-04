import { User } from "@supabase/supabase-js";
import { UserProfile } from "@/lib/auth";
import DashboardLayout from "./DashboardLayout";
import StatsCards from "./StatsCards";
import ExpensesList from "./ExpensesList";
import SubmitExpense from "./SubmitExpense";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

interface EmployeeDashboardProps {
  user: User;
  profile: UserProfile;
}

const EmployeeDashboard = ({ user, profile }: EmployeeDashboardProps) => {
  const [refreshStats, setRefreshStats] = useState(0);

  const handleExpenseSubmitted = () => {
    // Trigger a refresh of the stats cards
    setRefreshStats(prev => prev + 1);
  };

  return (
    <DashboardLayout title="My Expenses" subtitle={profile.full_name}>
      <Tabs defaultValue="submit" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="submit">Submit Expense</TabsTrigger>
          <TabsTrigger value="history">My History</TabsTrigger>
        </TabsList>

        <TabsContent value="submit" className="space-y-6">
          <SubmitExpense 
            employeeId={profile.id} 
            companyId={profile.company_id} 
            onExpenseSubmitted={handleExpenseSubmitted}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <StatsCards 
            companyId={profile.company_id} 
            employeeId={profile.id} 
            key={refreshStats}
          />
          <ExpensesList companyId={profile.company_id} employeeId={profile.id} />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default EmployeeDashboard;