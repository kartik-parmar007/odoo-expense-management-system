import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileText, Search, Filter, SortAsc, SortDesc, Eye } from "lucide-react";
import { format } from "date-fns";
import ExpenseDetail from "./ExpenseDetail";

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
  profiles: {
    full_name: string;
  };
}

interface ExpensesListProps {
  companyId: string;
  employeeId?: string;
  managerId?: string;
  isAdmin?: boolean;
}

const ExpensesList = ({ companyId, employeeId, managerId, isAdmin }: ExpensesListProps) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "category">("date");
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

  const statuses = [
    { value: "all", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" }
  ];

  useEffect(() => {
    const fetchExpenses = async () => {
      let query = supabase
        .from('expenses')
        .select(`
          *,
          profiles:employee_id (
            full_name
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error } = await query;

      if (data && !error) {
        setExpenses(data as Expense[]);
      }
      setIsLoading(false);
    };

    fetchExpenses();

    // Set up real-time subscription
    const channel = supabase
      .channel('expenses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          // Refresh expenses when there are changes
          fetchExpenses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, employeeId, managerId]);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...expenses];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(expense => 
        expense.profiles.full_name.toLowerCase().includes(term) ||
        expense.category.toLowerCase().includes(term) ||
        (expense.description && expense.description.toLowerCase().includes(term)) ||
        expense.currency.toLowerCase().includes(term)
      );
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      result = result.filter(expense => expense.category === categoryFilter);
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter(expense => expense.status === statusFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "date":
          comparison = new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime();
          break;
        case "amount":
          comparison = a.amount - b.amount;
          break;
        case "category":
          comparison = a.category.localeCompare(b.category);
          break;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });

    setFilteredExpenses(result);
  }, [expenses, searchTerm, categoryFilter, statusFilter, sortBy, sortOrder]);

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

  const handleSort = (column: "date" | "amount" | "category") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setStatusFilter("all");
  };

  const viewExpenseDetail = (expenseId: string) => {
    setSelectedExpenseId(expenseId);
    setIsDetailOpen(true);
  };

  const handleExpenseUpdated = () => {
    // Refresh the expenses list
    const fetchExpenses = async () => {
      let query = supabase
        .from('expenses')
        .select(`
          *,
          profiles:employee_id (
            full_name
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error } = await query;

      if (data && !error) {
        setExpenses(data as Expense[]);
      }
    };

    fetchExpenses();
  };

  if (isLoading) {
    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Loading expenses...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>Expenses</CardTitle>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full sm:w-40"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map(status => (
                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="hidden sm:flex"
            >
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium">No expenses found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchTerm || categoryFilter !== "all" || statusFilter !== "all" 
                ? "No expenses match your filters. Try adjusting your search or filters." 
                : "Get started by submitting a new expense."}
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {isAdmin && <TableHead>Employee</TableHead>}
                  <TableHead className="cursor-pointer" onClick={() => handleSort("date")}>
                    <div className="flex items-center">
                      Date
                      {sortBy === "date" && (
                        sortOrder === "asc" ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("category")}>
                    <div className="flex items-center">
                      Category
                      {sortBy === "category" && (
                        sortOrder === "asc" ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("amount")}>
                    <div className="flex items-center justify-end">
                      Amount
                      {sortBy === "amount" && (
                        sortOrder === "asc" ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id} className="hover:bg-muted/50">
                    {isAdmin && <TableCell className="font-medium">{expense.profiles.full_name}</TableCell>}
                    <TableCell>{format(new Date(expense.expense_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{expense.category}</TableCell>
                    <TableCell className="max-w-xs truncate">{expense.description || '-'}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {expense.currency} {Number(expense.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>{getStatusBadge(expense.status)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => viewExpenseDetail(expense.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <div className="p-4 border-t flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Showing {filteredExpenses.length} of {expenses.length} expenses
              </div>
              <div className="text-sm text-muted-foreground">
                Sorted by {sortBy} ({sortOrder})
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {selectedExpenseId && (
        <ExpenseDetail
          expenseId={selectedExpenseId}
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          onExpenseUpdated={handleExpenseUpdated}
        />
      )}
    </Card>
  );
};

export default ExpensesList;