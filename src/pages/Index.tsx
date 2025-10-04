import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Receipt, CheckCircle, Users, TrendingUp } from "lucide-react";

// Landing page component for the application
const Index = () => {
  const navigate = useNavigate();

  // Check if user is already authenticated
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Redirect authenticated users to dashboard
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header with navigation */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Receipt Ace Hub</h1>
            </div>
            <Button onClick={() => navigate("/auth")}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero section */}
        <div className="text-center space-y-8 mb-16">
          <div className="inline-block">
            <div className="p-4 bg-primary/10 rounded-2xl mb-6">
              <Receipt className="h-16 w-16 text-primary mx-auto" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-foreground leading-tight">
            Streamline Your Expense
            <br />
            <span className="text-primary">Management Process</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A complete expense management system with multi-level approvals, role-based access, and real-time tracking
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")}>
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          </div>
        </div>

        {/* Features section */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="p-6 bg-card border rounded-xl hover:shadow-lg transition-shadow duration-300">
            <div className="p-3 bg-success/10 rounded-xl w-fit mb-4">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Smart Approvals</h3>
            <p className="text-muted-foreground">
              Multi-level approval workflows with customizable rules and automatic routing
            </p>
          </div>

          <div className="p-6 bg-card border rounded-xl hover:shadow-lg transition-shadow duration-300">
            <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Role-Based Access</h3>
            <p className="text-muted-foreground">
              Separate dashboards for admins, managers, and employees with appropriate permissions
            </p>
          </div>

          <div className="p-6 bg-card border rounded-xl hover:shadow-lg transition-shadow duration-300">
            <div className="p-3 bg-accent/10 rounded-xl w-fit mb-4">
              <TrendingUp className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Real-Time Tracking</h3>
            <p className="text-muted-foreground">
              Track expense status in real-time with instant notifications and updates
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} Receipt Ace Hub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};


export default Index;
