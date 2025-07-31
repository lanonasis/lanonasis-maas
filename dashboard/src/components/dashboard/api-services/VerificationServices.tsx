
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { FileCheck } from "lucide-react";

export const VerificationServices = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-2xl font-bold">ID & Document Verification APIs</h3>
        <p className="text-muted-foreground">
          Verify user identities and documents with our secure API
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardCard 
          title="Identity Verification" 
          subtitle="Verify user identities using various methods"
          className="h-auto"
        >
          <div className="flex justify-center mt-4">
            <Button>
              <FileCheck className="h-4 w-4 mr-2" />
              Explore Verification APIs
            </Button>
          </div>
        </DashboardCard>
        
        <DashboardCard 
          title="Coming Soon" 
          subtitle="More verification features"
          className="h-auto"
        >
          <div className="text-center text-muted-foreground p-4">
            Additional verification features coming soon
          </div>
        </DashboardCard>
        
        <DashboardCard 
          title="Coming Soon" 
          subtitle="More verification features"
          className="h-auto"
        >
          <div className="text-center text-muted-foreground p-4">
            Additional verification features coming soon
          </div>
        </DashboardCard>
      </div>
    </div>
  );
};
