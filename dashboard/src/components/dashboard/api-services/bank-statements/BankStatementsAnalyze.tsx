
import { useState } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { BarChart4 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const BankStatementsAnalyze = () => {
  const [selectedAnalysisType, setSelectedAnalysisType] = useState("all");
  const [selectedTimeframe, setSelectedTimeframe] = useState("monthly");
  
  const analysisTypes = [
    { id: "all", name: "All Analyses" },
    { id: "spending", name: "Spending Patterns" },
    { id: "income", name: "Income Analysis" },
    { id: "cashflow", name: "Cash Flow Projection" },
    { id: "recurring", name: "Recurring Transactions" },
    { id: "risk", name: "Risk Assessment" }
  ];
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DashboardCard 
          title="Financial Analysis API" 
          subtitle="Extract insights from statement data"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Our analysis API processes statement data to extract valuable financial insights using advanced AI models.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
              <div>
                <Label htmlFor="analysis-type" className="mb-1 block">Analysis Type</Label>
                <Select 
                  value={selectedAnalysisType} 
                  onValueChange={setSelectedAnalysisType}
                >
                  <SelectTrigger id="analysis-type">
                    <SelectValue placeholder="Select analysis type" />
                  </SelectTrigger>
                  <SelectContent>
                    {analysisTypes.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="timeframe" className="mb-1 block">Timeframe</Label>
                <Select 
                  value={selectedTimeframe} 
                  onValueChange={setSelectedTimeframe}
                >
                  <SelectTrigger id="timeframe">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="p-4 bg-secondary/50 rounded-md overflow-x-auto">
              <pre className="text-xs text-muted-foreground">
                <code>
{`// Request example
fetch('https://api.lanonasis.com/v1/bank-statements/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    statement_id: 'stmt_12345',
    analysis_type: ${selectedAnalysisType === 'all' ? 
      "['spending_patterns', 'income_stability', 'cash_flow']" : 
      `['${selectedAnalysisType}']`},
    timeframe: '${selectedTimeframe}'
  })
})`}
                </code>
              </pre>
            </div>
            
            <div className="flex justify-end">
              <Button>
                <BarChart4 className="h-4 w-4 mr-2" />
                Test Analysis API
              </Button>
            </div>
          </div>
        </DashboardCard>
        
        <DashboardCard 
          title="Available Analysis Types" 
          subtitle="Financial insights provided by our API"
        >
          <div className="space-y-3">
            {[
              { name: 'Spending Patterns', desc: 'Analyze spending habits and trends over time', isNew: false },
              { name: 'Income Stability', desc: 'Evaluate regular income sources and stability', isNew: false },
              { name: 'Cash Flow', desc: 'Understand cash inflows and outflows', isNew: false },
              { name: 'Expense Categorization', desc: 'Automatic categorization of expenses', isNew: false },
              { name: 'Financial Health Score', desc: 'Overall score based on financial behaviors', isNew: false },
              { name: 'Income Prediction', desc: 'Forecast future income based on historical data', isNew: true },
              { name: 'Expense Prediction', desc: 'Predict upcoming expenses based on patterns', isNew: true },
              { name: 'Disposable Income Analysis', desc: 'Calculate true disposable income after essentials', isNew: true }
            ].map((item) => (
              <div key={item.name} className="flex items-start space-x-2">
                <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs text-primary">✓</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center">
                    <h4 className="text-sm font-medium">{item.name}</h4>
                    {item.isNew && (
                      <Badge variant="outline" className="ml-2">New</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>
      
      <DashboardCard 
        title="Advanced Configuration" 
        subtitle="Customize analysis parameters"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Analysis Parameters</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label htmlFor="anomaly-detection">Anomaly Detection Sensitivity</Label>
                <div className="w-32">
                  <Select defaultValue="medium">
                    <SelectTrigger id="anomaly-detection">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <Label htmlFor="prediction-horizon">Prediction Horizon</Label>
                <div className="w-32">
                  <Select defaultValue="6">
                    <SelectTrigger id="prediction-horizon">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 month</SelectItem>
                      <SelectItem value="3">3 months</SelectItem>
                      <SelectItem value="6">6 months</SelectItem>
                      <SelectItem value="12">12 months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch defaultChecked id="seasonal-adjustments" />
                <Label htmlFor="seasonal-adjustments">Apply Seasonal Adjustments</Label>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Output Configuration</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch defaultChecked id="charts" />
                <Label htmlFor="charts">Include Visualization Data</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch defaultChecked id="summaries" />
                <Label htmlFor="summaries">Include Text Summaries</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch defaultChecked id="recommendations" />
                <Label htmlFor="recommendations">Include Recommendations</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch id="raw-data" />
                <Label htmlFor="raw-data">Include Raw Analysis Data</Label>
              </div>
            </div>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
};
