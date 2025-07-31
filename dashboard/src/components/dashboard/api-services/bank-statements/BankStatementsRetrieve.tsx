
import { useState } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  Upload, 
  Search,
  RefreshCw
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";

export const BankStatementsRetrieve = () => {
  const [aiAnalysisEnabled, setAiAnalysisEnabled] = useState(true);
  const [selectedFormat, setSelectedFormat] = useState("json");
  const [confidenceThreshold, setConfidenceThreshold] = useState(80);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const formatOptions = ["json", "csv", "pdf"];
  
  const handleProcessDemo = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
    }, 2500);
  };
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DashboardCard 
          title="Fetch Bank Statements" 
          subtitle="Direct API access to financial statements"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Retrieve bank statements directly through our secure API endpoints with structured data format.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="format-select">Response Format</Label>
                <div className="flex space-x-2">
                  {formatOptions.map((format) => (
                    <Toggle
                      key={format}
                      pressed={selectedFormat === format}
                      onPressedChange={() => setSelectedFormat(format)}
                      variant="outline"
                      size="sm"
                      className="capitalize"
                    >
                      {format}
                    </Toggle>
                  ))}
                </div>
              </div>
              
              <div className="p-4 bg-secondary/50 rounded-md overflow-x-auto">
                <pre className="text-xs text-muted-foreground">
                  <code>
{`// Request example
fetch('https://api.lanonasis.com/v1/bank-statements/retrieve', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    institution_id: 'ins_12345',
    account_id: 'acc_67890',
    from_date: '2023-01-01',
    to_date: '2023-12-31',
    format: '${selectedFormat}'
  })
})`}
                  </code>
                </pre>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Sample Response
              </Button>
              <Button>
                <Search className="h-4 w-4 mr-2" />
                Test API
              </Button>
            </div>
          </div>
        </DashboardCard>
        
        <DashboardCard 
          title="Upload & Process" 
          subtitle="Submit statements for processing"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Upload bank statements in PDF, CSV, or image formats for automated extraction and processing.
            </p>
            
            <div className="p-4 border-2 border-dashed border-border rounded-md text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Drag & drop files or click to upload</p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports PDF, CSV, JPG, PNG formats (max 50MB)
              </p>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="ai-analysis" 
                  checked={aiAnalysisEnabled}
                  onCheckedChange={setAiAnalysisEnabled}
                />
                <Label htmlFor="ai-analysis">Enable AI Analysis</Label>
              </div>
              
              <Button onClick={handleProcessDemo} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload & Process
                  </>
                )}
              </Button>
            </div>
          </div>
        </DashboardCard>
      </div>
      
      <DashboardCard 
        title="Data Quality Controls" 
        subtitle="Ensure high-quality statement data"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure data quality settings for your bank statement processing pipeline.
          </p>
          
          <div className="space-y-6 mt-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="confidence">ML Confidence Threshold</Label>
                <span className="text-sm">{confidenceThreshold}%</span>
              </div>
              <Slider
                id="confidence"
                defaultValue={[confidenceThreshold]}
                max={100}
                step={1}
                onValueChange={(vals) => setConfidenceThreshold(vals[0])}
              />
              <p className="text-xs text-muted-foreground">
                Only accept transaction data with confidence level above the threshold.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center space-x-2 flex-1">
                <Switch defaultChecked id="deduplication" />
                <Label htmlFor="deduplication">Deduplication</Label>
              </div>
              
              <div className="flex items-center space-x-2 flex-1">
                <Switch defaultChecked id="normalization" />
                <Label htmlFor="normalization">Data Normalization</Label>
              </div>
              
              <div className="flex items-center space-x-2 flex-1">
                <Switch defaultChecked id="validation" />
                <Label htmlFor="validation">Schema Validation</Label>
              </div>
            </div>
          </div>
        </div>
      </DashboardCard>
      
      <DashboardCard 
        title="Supported Institutions" 
        subtitle="Banks and financial services compatible with our API"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {['Chase', 'Bank of America', 'Wells Fargo', 'Citibank', 'Capital One', 'US Bank', 'PNC Bank', 'TD Bank'].map((bank) => (
            <div 
              key={bank} 
              className="p-3 bg-secondary/40 rounded flex items-center justify-center"
            >
              <span className="text-sm font-medium">{bank}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <Button variant="link" size="sm">
            View all 10,000+ supported institutions
          </Button>
        </div>
      </DashboardCard>
    </div>
  );
};
