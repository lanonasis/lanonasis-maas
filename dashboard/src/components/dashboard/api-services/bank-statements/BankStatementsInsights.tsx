
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { 
  LineChart, 
  BarChart4,
  PieChart,
  ExternalLink
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const BankStatementsInsights = () => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DashboardCard 
          title="Financial Insights Engine" 
          subtitle="Advanced analytics for financial data"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Our Financial Insights Engine provides deeper analysis beyond basic categorization, using machine learning
              to detect patterns and make predictions.
            </p>
            
            <div className="p-4 bg-secondary/50 rounded-md overflow-x-auto">
              <pre className="text-xs text-muted-foreground">
                <code>
{`// Request example
fetch('https://api.lanonasis.com/v1/insights/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    statement_id: 'stmt_12345',
    insight_types: [
      'spending_anomalies',
      'cashflow_forecast',
      'savings_opportunities',
      'financial_health'
    ],
    timeframe: 'six_months'
  })
})`}
                </code>
              </pre>
            </div>
            
            <div className="flex justify-end">
              <Button>
                <LineChart className="h-4 w-4 mr-2" />
                Generate Insights
              </Button>
            </div>
          </div>
        </DashboardCard>
        
        <DashboardCard 
          title="Insight Types" 
          subtitle="Available financial insights"
        >
          <div className="space-y-4">
            <div className="space-y-3">
              {[
                { name: 'Spending Anomalies', desc: 'Detect unusual spending patterns and outliers' },
                { name: 'Cash Flow Forecast', desc: 'Predict future cash flow based on historical patterns' },
                { name: 'Savings Opportunities', desc: 'Identify potential areas to reduce expenses' },
                { name: 'Financial Health', desc: 'Comprehensive assessment of financial well-being' },
                { name: 'Budget Adherence', desc: 'Evaluate adherence to budget categories and limits' },
                { name: 'Recurring Services', desc: 'Identify and track recurring subscription services' }
              ].map((insight) => (
                <div key={insight.name} className="flex items-start space-x-2">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs text-primary">✓</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">{insight.name}</h4>
                    <p className="text-xs text-muted-foreground">{insight.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>
      </div>
      
      <DashboardCard 
        title="Interactive Financial Reports" 
        subtitle="Generate rich, interactive reports for your users"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Create branded financial reports with interactive charts and visualizations that your users can explore.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
            <div className="flex flex-col items-center p-4 bg-muted/40 rounded-lg">
              <BarChart4 className="h-8 w-8 text-primary mb-2" />
              <h4 className="text-sm font-medium text-center">Income vs. Expense Report</h4>
              <Badge className="mt-2">Interactive</Badge>
            </div>
            
            <div className="flex flex-col items-center p-4 bg-muted/40 rounded-lg">
              <PieChart className="h-8 w-8 text-primary mb-2" />
              <h4 className="text-sm font-medium text-center">Spending Distribution</h4>
              <Badge className="mt-2">Interactive</Badge>
            </div>
            
            <div className="flex flex-col items-center p-4 bg-muted/40 rounded-lg">
              <LineChart className="h-8 w-8 text-primary mb-2" />
              <h4 className="text-sm font-medium text-center">Financial Trends</h4>
              <Badge className="mt-2">Interactive</Badge>
            </div>
          </div>
          
          <div className="p-4 border rounded-md">
            <h4 className="text-sm font-medium mb-2">Customization Options</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch id="branding" defaultChecked />
                <Label htmlFor="branding">Custom Branding</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="white-label" defaultChecked />
                <Label htmlFor="white-label">White Label Reports</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="embed" defaultChecked />
                <Label htmlFor="embed">Embeddable Widgets</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="pdf-export" defaultChecked />
                <Label htmlFor="pdf-export">PDF Export</Label>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              View Demo Report
            </Button>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
};
