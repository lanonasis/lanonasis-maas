
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  BarChart4, 
  CreditCard,
  CalendarDays,
  PieChart,
  LineChart,
  DollarSign
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TabNavProps } from "./types";

export const BankStatementsOverview = ({ setActiveTab }: TabNavProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardCard 
          title="Statement Retrieval" 
          subtitle="Access bank statements through our API"
          className="h-auto"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Fetch bank statements from over 10,000+ financial institutions globally with standardized data format.
            </p>
            <div className="flex justify-center mt-4">
              <Button onClick={() => setActiveTab("retrieve")}>
                <FileText className="h-4 w-4 mr-2" />
                Explore Retrieval API
              </Button>
            </div>
          </div>
        </DashboardCard>
        
        <DashboardCard 
          title="Statement Analysis" 
          subtitle="AI-powered financial insights"
          className="h-auto"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Advanced analysis of income, expenses, and spending patterns with machine learning categorization.
            </p>
            <div className="flex justify-center mt-4">
              <Button onClick={() => setActiveTab("analyze")}>
                <BarChart4 className="h-4 w-4 mr-2" />
                Explore Analysis API
              </Button>
            </div>
          </div>
        </DashboardCard>
        
        <DashboardCard 
          title="Transaction Categorization" 
          subtitle="Automatic categorization API"
          className="h-auto"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Automatically categorize transactions into standardized groups with machine learning models.
            </p>
            <div className="flex justify-center mt-4">
              <Button onClick={() => setActiveTab("categorize")}>
                <CreditCard className="h-4 w-4 mr-2" />
                Explore Categorization
              </Button>
            </div>
          </div>
        </DashboardCard>
      </div>
      
      <DashboardCard 
        title="New Financial Insights Engine" 
        subtitle="Powered by advanced machine learning"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-4">
              Our new Financial Insights Engine provides deeper analysis of financial data with predictive modeling
              and anomaly detection capabilities.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 my-6">
              <div className="flex flex-col items-center p-4 bg-muted/40 rounded-lg">
                <PieChart className="h-8 w-8 text-primary mb-2" />
                <h4 className="font-medium text-sm">Category Analysis</h4>
                <Badge variant="outline" className="mt-2">New</Badge>
              </div>
              
              <div className="flex flex-col items-center p-4 bg-muted/40 rounded-lg">
                <LineChart className="h-8 w-8 text-primary mb-2" />
                <h4 className="font-medium text-sm">Trend Prediction</h4>
                <Badge variant="outline" className="mt-2">New</Badge>
              </div>
              
              <div className="flex flex-col items-center p-4 bg-muted/40 rounded-lg">
                <CalendarDays className="h-8 w-8 text-primary mb-2" />
                <h4 className="font-medium text-sm">Recurring Detection</h4>
                <Badge variant="outline" className="mt-2">New</Badge>
              </div>
              
              <div className="flex flex-col items-center p-4 bg-muted/40 rounded-lg">
                <DollarSign className="h-8 w-8 text-primary mb-2" />
                <h4 className="font-medium text-sm">Financial Health</h4>
                <Badge variant="outline" className="mt-2">New</Badge>
              </div>
            </div>
            
            <Button className="w-full mt-2" onClick={() => setActiveTab("insights")}>
              Explore Financial Insights
            </Button>
          </div>
        </div>
      </DashboardCard>
      
      <DashboardCard 
        title="Integration Status" 
        subtitle="Bank statement API integration metrics"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">API Integration Completeness</span>
              <span className="text-sm font-medium">85%</span>
            </div>
            <Progress value={85} />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Supported Institutions</span>
              <span className="text-sm font-medium">10,000+</span>
            </div>
            <Progress value={90} />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Data Accuracy</span>
              <span className="text-sm font-medium">99.2%</span>
            </div>
            <Progress value={99} />
          </div>
        </div>
      </DashboardCard>
    </div>
  );
};
