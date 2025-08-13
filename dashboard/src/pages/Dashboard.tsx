
import { Layout } from "@/components/layout/Layout";
import { ApiDashboard } from "@/components/dashboard/ApiDashboard";
import MCPServerManager from "@/components/mcp/MCPServerManager";
import { UserProfile } from "@/components/dashboard/UserProfile";
import { Button } from "@/components/ui/button";
import { Home, Sun, Moon, Laptop } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

const Dashboard = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();

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
        
        <div className="space-y-8">
          <UserProfile />
          <ApiDashboard />
          <MCPServerManager />
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
