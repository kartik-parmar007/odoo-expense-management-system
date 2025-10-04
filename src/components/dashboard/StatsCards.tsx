import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Clock, CheckCircle, XCircle, TrendingUp } from "lucide-react";

interface StatsCardsProps {
  companyId: string;
  employeeId?: string;
  managerId?: string;
}

const StatsCards = ({ companyId, employeeId, managerId }: StatsCardsProps) => {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    count: 0
  });
  const [previousStats, setPreviousStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    count: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      let query = supabase
        .from('expenses')
        .select('amount, status', { count: 'exact' })
        .eq('company_id', companyId);

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error, count } = await query;

      if (data && !error) {
        // Store previous stats for comparison
        setPreviousStats({ ...stats });
        
        const total = data.reduce((sum, exp) => sum + Number(exp.amount), 0);
        const pending = data.filter(exp => exp.status === 'pending').reduce((sum, exp) => sum + Number(exp.amount), 0);
        const approved = data.filter(exp => exp.status === 'approved').reduce((sum, exp) => sum + Number(exp.amount), 0);
        const rejected = data.filter(exp => exp.status === 'rejected').reduce((sum, exp) => sum + Number(exp.amount), 0);

        setStats({ total, pending, approved, rejected, count: count || 0 });
      }
      setIsLoading(false);
    };

    fetchStats();

    // Set up real-time subscription
    const channel = supabase
      .channel('expenses-stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, employeeId, managerId]);

  // Calculate percentage changes
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const cards = [
    {
      title: "Total Expenses",
      value: `$${stats.total.toFixed(2)}`,
      change: calculateChange(stats.total, previousStats.total),
      icon: DollarSign,
      color: "text-primary",
      bgColor: "bg-primary/10",
      description: `${stats.count} expenses`
    },
    {
      title: "Pending",
      value: `$${stats.pending.toFixed(2)}`,
      change: calculateChange(stats.pending, previousStats.pending),
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
      description: "Awaiting approval"
    },
    {
      title: "Approved",
      value: `$${stats.approved.toFixed(2)}`,
      change: calculateChange(stats.approved, previousStats.approved),
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
      description: "Successfully approved"
    },
    {
      title: "Rejected",
      value: `$${stats.rejected.toFixed(2)}`,
      change: calculateChange(stats.rejected, previousStats.rejected),
      icon: XCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      description: "Requests rejected"
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-2 h-32 animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isPositive = card.change >= 0;
        const changeText = card.change !== 0 ? `${isPositive ? '+' : ''}${card.change}%` : "No change";
        
        return (
          <Card key={card.title} className="border-2 hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              {card.change !== 0 && (
                <div className={`flex items-center mt-2 text-xs ${isPositive ? 'text-success' : 'text-destructive'}`}>
                  <TrendingUp className={`h-3 w-3 mr-1 ${isPositive ? '' : 'rotate-180'}`} />
                  {changeText} from last update
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default StatsCards;