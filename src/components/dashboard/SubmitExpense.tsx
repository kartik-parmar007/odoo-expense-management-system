import React, { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, Save, Send, Calendar, Tag, DollarSign } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface SubmitExpenseProps {
  employeeId: string;
  companyId: string;
  onExpenseSubmitted?: () => void;
}

const SubmitExpense: React.FC<SubmitExpenseProps> = ({ employeeId, companyId, onExpenseSubmitted }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDraft, setIsDraft] = useState(true);

  const categories = [
    "Travel",
    "Meals",
    "Accommodation",
    "Office Supplies",
    "Software",
    "Training",
    "Other"
  ];

  const currencies = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD"];

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image (JPEG, PNG, GIF) or PDF file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setReceipt(file);
    setReceiptPreview(URL.createObjectURL(file));
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get("amount") as string);
    const currency = formData.get("currency") as string;
    const category = formData.get("category") as string;
    const description = formData.get("description") as string;
    const expenseDate = formData.get("expense_date") as string;

    // Validation
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than zero.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (!expenseDate) {
      toast({
        title: "Missing date",
        description: "Please select an expense date.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (!category) {
      toast({
        title: "Missing category",
        description: "Please select an expense category.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      // Upload receipt if exists
      let receiptUrl = null;
      if (receipt) {
        const fileExt = receipt.name.split('.').pop();
        const fileName = `${Date.now()}_${employeeId}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(`${companyId}/${employeeId}/${fileName}`, receipt);

        if (uploadError) throw uploadError;
        receiptUrl = uploadData.path;
      }

      const expenseData = {
        employee_id: employeeId,
        company_id: companyId,
        amount: amount,
        currency: currency,
        category: category,
        description: description || null,
        expense_date: expenseDate,
        receipt_url: receiptUrl,
        status: "pending" as const
      };

      const { error } = await supabase
        .from('expenses')
        .insert([expenseData]);

      if (error) throw error;

      toast({
        title: "Success!",
        description: isDraft 
          ? "Your expense has been saved as draft."
          : "Your expense has been submitted for approval.",
      });

      // Reset form
      (e.target as HTMLFormElement).reset();
      setReceipt(null);
      setReceiptPreview(null);
      setUploadProgress(0);
      
      // Notify parent component
      if (onExpenseSubmitted) {
        onExpenseSubmitted();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while submitting your expense.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>Submit New Expense</CardTitle>
        <CardDescription>
          Upload a receipt or fill in the details manually to submit an expense
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Receipt Upload Section */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              type="file"
              id="receipt-upload"
              className="hidden"
              onChange={handleFileChange}
              accept="image/*,.pdf"
            />
            <Label
              htmlFor="receipt-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="h-8 w-8" />
              <span>Click to upload or drag and drop</span>
              <span className="text-sm text-gray-500">
                Supports images and PDF (max 5MB)
              </span>
            </Label>
            
            {receiptPreview && (
              <div className="mt-4">
                <img
                  src={receiptPreview}
                  alt="Receipt preview"
                  className="max-h-48 mx-auto rounded-lg shadow"
                />
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <Progress value={uploadProgress} className="mt-2" />
                )}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Amount *
              </Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency *</Label>
              <Select name="currency" defaultValue="USD" required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((curr) => (
                    <SelectItem key={curr} value={curr}>
                      {curr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Category *
              </Label>
              <Select name="category" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date *
              </Label>
              <Input
                id="expense_date"
                name="expense_date"
                type="date"
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Add any additional details about this expense..."
              rows={3}
            />
          </div>

          <div className="flex gap-4">
            <Button 
              type="submit" 
              className="flex-1"
              disabled={isLoading}
              onClick={() => setIsDraft(true)}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={isLoading}
              onClick={() => setIsDraft(false)}
            >
              <Send className="mr-2 h-4 w-4" />
              Submit
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default SubmitExpense;