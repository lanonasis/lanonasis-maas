
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export const BankStatementsCategorize = () => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DashboardCard 
          title="Transaction Categorization" 
          subtitle="Automated classification of bank transactions"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Our AI categorization engine automatically classifies transactions into standardized categories.
            </p>
            
            <div className="p-4 bg-secondary/50 rounded-md overflow-x-auto">
              <pre className="text-xs text-muted-foreground">
                <code>
{`// Request example
fetch('https://api.lanonasis.com/v1/transactions/categorize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    transactions: [
      {
        "id": "txn_12345",
        "description": "WALMART STORE #123",
        "amount": 56.78,
        "date": "2023-04-15"
      },
      // Additional transactions...
    ]
  })
})`}
                </code>
              </pre>
            </div>
            
            <div className="flex justify-end">
              <Button>
                <CreditCard className="h-4 w-4 mr-2" />
                Test Categorization
              </Button>
            </div>
          </div>
        </DashboardCard>
        
        <DashboardCard 
          title="Category Hierarchy" 
          subtitle="Standardized transaction categories"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                'Housing & Utilities',
                'Food & Dining',
                'Transportation',
                'Shopping',
                'Entertainment',
                'Health & Fitness',
                'Travel',
                'Education'
              ].map((category) => (
                <div 
                  key={category} 
                  className="p-2 bg-secondary/40 rounded-md text-sm"
                >
                  {category}
                </div>
              ))}
            </div>
            
            <p className="text-xs text-muted-foreground">
              Each main category includes multiple subcategories for detailed transaction classification.
            </p>
            
            <Button variant="outline" size="sm" className="w-full">
              Download Full Category Taxonomy
            </Button>
          </div>
        </DashboardCard>
      </div>
      
      <DashboardCard 
        title="Custom Categories" 
        subtitle="Create your own transaction categories"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Define custom categories and rules for your specific business needs.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category-name" className="mb-1 block">Category Name</Label>
              <Input id="category-name" placeholder="e.g., Business Expenses" />
            </div>
            
            <div>
              <Label htmlFor="parent-category" className="mb-1 block">Parent Category</Label>
              <Select defaultValue="">
                <SelectTrigger id="parent-category">
                  <SelectValue placeholder="Select or leave blank for top-level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Parent (Top Level)</SelectItem>
                  <SelectItem value="housing">Housing & Utilities</SelectItem>
                  <SelectItem value="food">Food & Dining</SelectItem>
                  <SelectItem value="transport">Transportation</SelectItem>
                  <SelectItem value="shopping">Shopping</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="keyword-patterns" className="mb-1 block">Keyword Patterns</Label>
            <Input id="keyword-patterns" placeholder="Enter keywords separated by commas" />
            <p className="text-xs text-muted-foreground mt-1">
              Transactions containing these keywords will be assigned to this category
            </p>
          </div>
          
          <div className="flex justify-end">
            <Button variant="outline">Add Custom Category</Button>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
};
