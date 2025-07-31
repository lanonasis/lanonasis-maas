
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export const FraudMonitoring = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-2xl font-bold">Fraud Monitoring APIs</h3>
        <p className="text-muted-foreground">
          Monitor and prevent fraudulent transactions with our API
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardCard 
          title="Fraud Monitoring" 
          subtitle="Detect and prevent fraudulent transactions"
          className="h-auto"
        >
          <div className="flex justify-center mt-4">
            <Button>
              <ShieldAlert className="h-4 w-4 mr-2" />
              Explore Fraud Monitoring APIs
            </Button>
          </div>
        </DashboardCard>
        
        <DashboardCard 
          title="Coming Soon" 
          subtitle="More fraud monitoring features"
          className="h-auto"
        >
          <div className="text-center text-muted-foreground p-4">
            Additional fraud monitoring features coming soon
          </div>
        </DashboardCard>
        
        <DashboardCard 
          title="Coming Soon" 
          subtitle="More fraud monitoring features"
          className="h-auto"
        >
          <div className="text-center text-muted-foreground p-4">
            Additional fraud monitoring features coming soon
          </div>
        </DashboardCard>
      </div>
    </div>
  );
};
