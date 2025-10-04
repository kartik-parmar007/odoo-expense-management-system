import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Eye, Filter, Search } from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AuthError } from "@supabase/supabase-js";
import ExpenseDetail from "./ExpenseDetail";

interface Approval {
  id: string;
  expense_id: string;
  comment: string | null;
  status: string;
  expenses: {
    id: string;
    amount: number;
    currency: string;
    category: string;
    description: string | null;
    expense_date: string;
    receipt_url: string | null;
    profiles: {
      full_name: string;
    };
  };
}

interface ApprovalsQueueProps {
  managerId: string;
  companyId: string;
}

const ApprovalsQueue: React.FC<ApprovalsQueueProps> = ({ managerId, companyId }) => {
  const { toast } = useToast();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [comments, setComments] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApprovals, setSelectedApprovals] = useState<Set<string>>(new Set());
  const [viewReceipt, setViewReceipt] = useState<Approval | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "employee">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const categories = [
    "Travel",
    "Meals",
    "Accommodation",
    "Office Supplies",
    "Software",
    "Training",
    "Other"
  ];

  const fetchApprovals = async () => {
    try {
      const { data, error } = await supabase
        .from('approvals')
        .select(`
          id,
          expense_id,
          comment,
          status
        `)
        .eq('approver_id', managerId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        // Fetch expense details for each approval
        const approvalsWithData = await Promise.all(
          data.map(async (approval) => {
            const { data: expenseData, error: expenseError } = await supabase
              .from('expenses')
              .select(`
                id,
                amount,
                currency,
                category,
                description,
                expense_date,
                receipt_url,
                profiles:employee_id (full_name)
              `)
              .eq('id', approval.expense_id)
              .single();

            if (expenseError) throw expenseError;

            return {
              ...approval,
              expenses: expenseData
            };
          })
        );

        setApprovals(approvalsWithData as Approval[]);
      }
    } catch (error) {
      console.error("Error fetching approvals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managerId]);

  const handleBulkApproval = async (status: 'approved' | 'rejected') => {
    const promises = Array.from(selectedApprovals).map((id) => {
      const approval = approvals.find((a) => a.id === id);
      if (approval) {
        return handleApproval(approval.id, approval.expense_id, status);
      }
    });

    await Promise.all(promises);
    setSelectedApprovals(new Set());
  };

  const handleApproval = async (approvalId: string, expenseId: string, status: 'approved' | 'rejected') => {
    try {
      const { error: approvalError } = await supabase
        .from('approvals')
        .update({
          status,
          comment: comments[approvalId] || null
        })
        .eq('id', approvalId);

      if (approvalError) throw approvalError;

      const { error: expenseError } = await supabase
        .from('expenses')
        .update({ status })
        .eq('id', expenseId);

      if (expenseError) throw expenseError;

      toast({
        title: "Success!",
        description: `Expense ${status} successfully`,
      });

      fetchApprovals();
    } catch (error) {
      const authError = error as AuthError;
      toast({
        title: "Error",
        description: authError.message,
        variant: "destructive",
      });
    }
  };

  const handleSort = (column: "date" | "amount" | "employee") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterCategory("all");
  };

  const viewExpenseDetail = (expenseId: string) => {
    setSelectedExpenseId(expenseId);
    setIsDetailOpen(true);
  };

  const handleExpenseUpdated = () => {
    // Refresh the approvals queue
    fetchApprovals();
  };

  // Apply filters and sorting
  const filteredApprovals = approvals.filter(approval => {
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!approval.expenses.profiles.full_name.toLowerCase().includes(term) &&
          !approval.expenses.category.toLowerCase().includes(term) &&
          !(approval.expenses.description && approval.expenses.description.toLowerCase().includes(term))) {
        return false;
      }
    }

    // Apply category filter
    if (filterCategory !== "all" && approval.expenses.category !== filterCategory) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case "date":
        comparison = new Date(a.expenses.expense_date).getTime() - new Date(b.expenses.expense_date).getTime();
        break;
      case "amount":
        comparison = a.expenses.amount - b.expenses.amount;
        break;
      case "employee":
        comparison = a.expenses.profiles.full_name.localeCompare(b.expenses.profiles.full_name);
        break;
    }
    
    return sortOrder === "asc" ? comparison : -comparison;
  });

  if (isLoading) {
    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Loading approvals...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Approvals Queue</CardTitle>
            <CardDescription>Review and approve expense requests</CardDescription>
          </div>
          {selectedApprovals.size > 0 && (
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => handleBulkApproval('approved')}
              >
                Approve ({selectedApprovals.size})
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleBulkApproval('rejected')}
              >
                Reject ({selectedApprovals.size})
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                onClick={clearFilters}
              >
                Clear
              </Button>
            </div>
          </div>

          {filteredApprovals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || filterCategory !== "all" 
                ? "No approvals match your filters." 
                : "No pending approvals"}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedApprovals(
                              new Set(filteredApprovals.map((a) => a.id))
                            );
                          } else {
                            setSelectedApprovals(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("employee")}>
                      Employee
                      {sortBy === "employee" && (
                        sortOrder === "asc" ? <span className="ml-1">↑</span> : <span className="ml-1">↓</span>
                      )}
                    </TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => handleSort("amount")}>
                      Amount
                      {sortBy === "amount" && (
                        sortOrder === "asc" ? <span className="ml-1">↑</span> : <span className="ml-1">↓</span>
                      )}
                    </TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("date")}>
                      Date
                      {sortBy === "date" && (
                        sortOrder === "asc" ? <span className="ml-1">↑</span> : <span className="ml-1">↓</span>
                      )}
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApprovals.map((approval) => (
                    <TableRow key={approval.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedApprovals.has(approval.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedApprovals);
                            if (e.target.checked) {
                              newSelected.add(approval.id);
                            } else {
                              newSelected.delete(approval.id);
                            }
                            setSelectedApprovals(newSelected);
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{approval.expenses.profiles.full_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{approval.expenses.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {approval.expenses.amount} {approval.expenses.currency}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{approval.expenses.description || '-'}</TableCell>
                      <TableCell>
                        {format(new Date(approval.expenses.expense_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => viewExpenseDetail(approval.expenses.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="default"
                            size="icon"
                            onClick={() => handleApproval(approval.id, approval.expenses.id, 'approved')}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleApproval(approval.id, approval.expenses.id, 'rejected')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <Dialog open={!!viewReceipt} onOpenChange={() => setViewReceipt(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Receipt Preview</DialogTitle>
              <DialogDescription>
                Expense submitted by {viewReceipt?.expenses.profiles.full_name}
              </DialogDescription>
            </DialogHeader>
            {viewReceipt?.expenses.receipt_url && (
              <img
                src={supabase.storage.from('receipts').getPublicUrl(viewReceipt.expenses.receipt_url).data.publicUrl}
                alt="Receipt"
                className="max-h-[600px] w-full object-contain"
              />
            )}
          </DialogContent>
        </Dialog>

        {selectedExpenseId && (
          <ExpenseDetail
            expenseId={selectedExpenseId}
            open={isDetailOpen}
            onOpenChange={setIsDetailOpen}
            onExpenseUpdated={handleExpenseUpdated}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default ApprovalsQueue;