
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { BarChart } from "lucide-react";

export const TradeFinancing = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-2xl font-bold">Trade Financing APIs</h3>
        <p className="text-muted-foreground">
          Access trade financing solutions through our API
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardCard 
          title="Trade Financing" 
          subtitle="Integrate trade financing solutions"
          className="h-auto"
        >
          <div className="flex justify-center mt-4">
            <Button>
              <BarChart className="h-4 w-4 mr-2" />
              Explore Trade Finance APIs
            </Button>
          </div>
        </DashboardCard>
        
        <DashboardCard 
          title="Coming Soon" 
          subtitle="More trade financing features"
          className="h-auto"
        >
          <div className="text-center text-muted-foreground p-4">
            Additional trade financing features coming soon
          </div>
        </DashboardCard>
        
        <DashboardCard 
          title="Coming Soon" 
          subtitle="More trade financing features"
          className="h-auto"
        >
          <div className="text-center text-muted-foreground p-4">
            Additional trade financing features coming soon
          </div>
        </DashboardCard>
      </div>
    </div>
  );
};
