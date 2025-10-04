import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { X, Download, Eye, Calendar, Tag, DollarSign, User, FileText } from "lucide-react";
import { format } from "date-fns";

interface Expense {
  id: string;
  amount: number;
  currency: string;
  category: string;
  description: string | null;
  expense_date: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  receipt_url: string | null;
  employee_id: string;
  profiles: {
    full_name: string;
  };
}

interface ExpenseDetailProps {
  expenseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExpenseUpdated?: () => void;
}

const ExpenseDetail = ({ expenseId, open, onOpenChange, onExpenseUpdated }: ExpenseDetailProps) => {
  const { toast } = useToast();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (open && expenseId) {
      fetchExpense();
    }
  }, [open, expenseId]);

  const fetchExpense = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          profiles:employee_id (
            full_name
          )
        `)
        .eq('id', expenseId)
        .single();

      if (error) throw error;
      setExpense(data as Expense);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load expense details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ status })
        .eq('id', expenseId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Expense ${status} successfully.`,
      });

      // Update local state
      if (expense) {
        setExpense({ ...expense, status });
      }

      // Notify parent component
      if (onExpenseUpdated) {
        onExpenseUpdated();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update expense status.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success hover:bg-success/90">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge className="bg-warning hover:bg-warning/90">Pending</Badge>;
    }
  };

  const downloadReceipt = () => {
    if (expense?.receipt_url) {
      const { data } = supabase.storage
        .from('receipts')
        .getPublicUrl(expense.receipt_url);
      
      window.open(data.publicUrl, '_blank');
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Loading expense details...</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!expense) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Expense not found</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">The requested expense could not be found.</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Expense Details
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                {getStatusBadge(expense.status)}
                <span className="text-sm text-muted-foreground">
                  Submitted on {format(new Date(expense.created_at), 'MMM dd, yyyy')}
                </span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Expense Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-semibold">{expense.currency} {Number(expense.amount).toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-semibold">{format(new Date(expense.expense_date), 'MMM dd, yyyy')}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="font-semibold">{expense.category}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Submitted by</p>
                    <p className="font-semibold">{expense.profiles.full_name}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="font-semibold">{expense.description || "No description provided"}</p>
              </div>
            </CardContent>
          </Card>

          {expense.receipt_url && (
            <Card>
              <CardHeader>
                <CardTitle>Receipt</CardTitle>
                <CardDescription>Attached receipt for this expense</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <div className="flex-1">
                    <img
                      src={supabase.storage.from('receipts').getPublicUrl(expense.receipt_url).data.publicUrl}
                      alt="Receipt"
                      className="max-h-64 w-full object-contain rounded-lg border"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button onClick={downloadReceipt} className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Download Receipt
                    </Button>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      View Full Size
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {expense.status === 'pending' && (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => handleStatusChange('approved')} 
                className="flex-1 bg-success hover:bg-success/90"
              >
                Approve Expense
              </Button>
              <Button 
                onClick={() => handleStatusChange('rejected')} 
                variant="destructive"
                className="flex-1"
              >
                Reject Expense
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseDetail;