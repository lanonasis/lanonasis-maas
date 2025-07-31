
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";

export const UtilityPayments = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-2xl font-bold">Utility Payment APIs</h3>
        <p className="text-muted-foreground">
          Enable utility bill payments through your application
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardCard 
          title="Utility Payments" 
          subtitle="Process utility bill payments seamlessly"
          className="h-auto"
        >
          <div className="flex justify-center mt-4">
            <Button>
              <Lightbulb className="h-4 w-4 mr-2" />
              Explore Utility APIs
            </Button>
          </div>
        </DashboardCard>
        
        <DashboardCard 
          title="Coming Soon" 
          subtitle="More utility payment features"
          className="h-auto"
        >
          <div className="text-center text-muted-foreground p-4">
            Additional utility payment features coming soon
          </div>
        </DashboardCard>
        
        <DashboardCard 
          title="Coming Soon" 
          subtitle="More utility payment features"
          className="h-auto"
        >
          <div className="text-center text-muted-foreground p-4">
            Additional utility payment features coming soon
          </div>
        </DashboardCard>
      </div>
    </div>
  );
};
