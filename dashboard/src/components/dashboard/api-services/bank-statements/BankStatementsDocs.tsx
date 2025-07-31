
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Download, 
  Shield, 
  AlertCircle, 
  Bell, 
  Clock, 
  BarChart4 
} from "lucide-react";

export const BankStatementsDocs = () => {
  return (
    <div className="space-y-4">
      <DashboardCard
        title="API Documentation"
        subtitle="Implementation guides and references"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <h4 className="text-lg font-medium">Quick Start Guide</h4>
            <p className="text-sm text-muted-foreground">
              Get started with the Bank Statement API with our comprehensive guides and examples.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              {[
                { title: 'Authentication', icon: <Shield className="h-4 w-4" /> },
                { title: 'Statement Retrieval', icon: <FileText className="h-4 w-4" /> },
                { title: 'Data Analysis', icon: <BarChart4 className="h-4 w-4" /> },
                { title: 'Error Handling', icon: <AlertCircle className="h-4 w-4" /> },
                { title: 'Webhooks', icon: <Bell className="h-4 w-4" /> },
                { title: 'Rate Limits', icon: <Clock className="h-4 w-4" /> }
              ].map((item) => (
                <div key={item.title} className="flex items-center p-3 bg-secondary/30 rounded-md">
                  <div className="mr-2 text-primary">
                    {item.icon}
                  </div>
                  <span className="text-sm font-medium">{item.title}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-lg font-medium">SDKs & Libraries</h4>
            <p className="text-sm text-muted-foreground">
              Official client libraries to integrate with our Bank Statement API.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
              {['JavaScript', 'Python', 'Java', 'Ruby', 'PHP', 'Go', '.NET', 'Swift'].map((lang) => (
                <Button key={lang} variant="outline" size="sm" className="justify-start">
                  <Download className="h-3 w-3 mr-2" />
                  {lang}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="bg-muted/40 p-4 rounded-md mt-4">
            <h4 className="text-sm font-medium mb-2">Interactive API Explorer</h4>
            <p className="text-xs text-muted-foreground mb-4">
              Test endpoints directly in your browser with our interactive API Explorer.
            </p>
            <Button className="w-full">
              Open API Explorer
            </Button>
          </div>
          
          <div className="flex justify-center mt-4">
            <Button>
              View Complete API Reference
            </Button>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
};
