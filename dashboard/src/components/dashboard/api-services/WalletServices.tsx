
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

export const WalletServices = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-2xl font-bold">Wallet Service APIs</h3>
        <p className="text-muted-foreground">
          Integrate digital wallet functionality into your application
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardCard 
          title="Wallet Management" 
          subtitle="Create and manage digital wallets for your users"
          className="h-auto"
        >
          <div className="flex justify-center mt-4">
            <Button>
              <Wallet className="h-4 w-4 mr-2" />
              Explore Wallet APIs
            </Button>
          </div>
        </DashboardCard>
        
        <DashboardCard 
          title="Coming Soon" 
          subtitle="More advanced wallet features"
          className="h-auto"
        >
          <div className="text-center text-muted-foreground p-4">
            Additional wallet service features coming soon
          </div>
        </DashboardCard>
        
        <DashboardCard 
          title="Coming Soon" 
          subtitle="More advanced wallet features"
          className="h-auto"
        >
          <div className="text-center text-muted-foreground p-4">
            Additional wallet service features coming soon
          </div>
        </DashboardCard>
      </div>
    </div>
  );
};
