
import { Layout } from "@/components/layout/Layout";
import { ApiDashboard } from "@/components/dashboard/ApiDashboard";
import MCPServerManager from "@/components/mcp/MCPServerManager";
import { UserProfile } from "@/components/dashboard/UserProfile";
import { WorkflowOrchestrator } from "@/components/orchestrator/WorkflowOrchestrator";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  Sun, 
  Moon, 
  Laptop, 
  User, 
  Key, 
  Zap, 
  Settings,
  Database,
  Upload,
  Eye
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

const Dashboard = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab based on route
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/api-keys')) return 'api-keys';
    if (path.includes('/orchestrator')) return 'orchestrator';
    if (path.includes('/memory-visualizer')) return 'memory-visualizer';
    if (path.includes('/extensions')) return 'extensions';
    if (path.includes('/upload')) return 'upload';
    return 'overview';
  };

  const handleTabChange = (value: string) => {
    if (value === 'overview') {
      navigate('/dashboard');
    } else {
      navigate(`/dashboard/${value}`);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <a href="https://www.lanonasis.com">
              <Home className="h-4 w-4" />
              Return to Homepage
            </a>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Theme settings"
              >
                {resolvedTheme === "dark" ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="h-4 w-4 mr-2" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="h-4 w-4 mr-2" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Laptop className="h-4 w-4 mr-2" />
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="orchestrator" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Orchestrator
              <Badge variant="secondary" className="text-xs">New</Badge>
            </TabsTrigger>
            <TabsTrigger value="memory-visualizer" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Memory
            </TabsTrigger>
            <TabsTrigger value="extensions" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              MCP
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <UserProfile />
            <ApiDashboard />
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <h3 className="text-lg font-semibold">Welcome to Your Dashboard</h3>
                  <p className="text-gray-600">
                    Manage your API keys, configure MCP servers, and orchestrate intelligent workflows.
                  </p>
                  <div className="flex justify-center gap-4">
                    <Button onClick={() => handleTabChange('orchestrator')} className="gap-2">
                      <Zap className="h-4 w-4" />
                      Try AI Orchestrator
                    </Button>
                    <Button onClick={() => handleTabChange('api-keys')} variant="outline" className="gap-2">
                      <Key className="h-4 w-4" />
                      Manage API Keys
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api-keys">
            <ApiDashboard />
          </TabsContent>

          <TabsContent value="orchestrator">
            <WorkflowOrchestrator />
          </TabsContent>

          <TabsContent value="memory-visualizer">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <Database className="h-12 w-12 mx-auto text-blue-500" />
                  <h3 className="text-lg font-semibold">Memory Visualizer</h3>
                  <p className="text-gray-600">
                    Visualize and explore your organizational memory and knowledge base.
                  </p>
                  <Badge variant="outline">Coming Soon</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="extensions">
            <MCPServerManager />
          </TabsContent>

          <TabsContent value="upload">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <Upload className="h-12 w-12 mx-auto text-green-500" />
                  <h3 className="text-lg font-semibold">File Upload</h3>
                  <p className="text-gray-600">
                    Upload documents and files to your memory service.
                  </p>
                  <Badge variant="outline">Coming Soon</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Dashboard;
