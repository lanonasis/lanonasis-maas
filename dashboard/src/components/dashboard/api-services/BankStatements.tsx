
import { useState } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { FileText, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import all tab content components
import { BankStatementsOverview } from "./bank-statements/BankStatementsOverview";
import { BankStatementsRetrieve } from "./bank-statements/BankStatementsRetrieve";
import { BankStatementsAnalyze } from "./bank-statements/BankStatementsAnalyze";
import { BankStatementsCategorize } from "./bank-statements/BankStatementsCategorize";
import { BankStatementsInsights } from "./bank-statements/BankStatementsInsights";
import { BankStatementsDocs } from "./bank-statements/BankStatementsDocs";

export const BankStatements = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-2xl font-bold">Bank Statement APIs</h3>
        <p className="text-muted-foreground">
          Retrieve, analyze, and categorize transactions with our powerful Bank Statement APIs
        </p>
      </div>
      
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="retrieve">Retrieve</TabsTrigger>
          <TabsTrigger value="analyze">Analysis</TabsTrigger>
          <TabsTrigger value="categorize">Categorization</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="docs">Documentation</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <BankStatementsOverview setActiveTab={setActiveTab} />
        </TabsContent>
        
        <TabsContent value="retrieve">
          <BankStatementsRetrieve />
        </TabsContent>
        
        <TabsContent value="analyze">
          <BankStatementsAnalyze />
        </TabsContent>
        
        <TabsContent value="categorize">
          <BankStatementsCategorize />
        </TabsContent>
        
        <TabsContent value="insights">
          <BankStatementsInsights />
        </TabsContent>
        
        <TabsContent value="docs">
          <BankStatementsDocs />
        </TabsContent>
      </Tabs>
    </div>
  );
};
