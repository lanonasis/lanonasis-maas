import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Copy, 
  Download, 
  Settings, 
  Play, 
  Square, 
  ExternalLink,
  Server,
  Code,
  Globe,
  Database,
  Search,
  Paintbrush,
  GitBranch,
  CreditCard,
  Brain,
  Monitor
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import mcpServers from "@/config/mcp-servers.json";

// Icon mapping for different MCP servers
const serverIcons: Record<string, React.ComponentType<any>> = {
  'hostinger-api': Server,
  'Context7': Database,
  '@21st-dev/magic': Code,
  'perplexity-ask': Search,
  'github-mcp-server': GitBranch,
  'supabase-mcp-server': Database,
  'stripe': CreditCard,
  'sequential-thinking': Brain,
  'browserbase': Globe,
  'browserbase2': Globe,
  'playwright': Monitor,
  'brave-search': Search,
  'puppeteer': Monitor,
  'picsart': Paintbrush,
  'lanonasis': Brain
};

const MCPServerManager: React.FC = () => {
  const { toast } = useToast();
  const [activeServers, setActiveServers] = useState<Set<string>>(new Set());

  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: `${description} copied to clipboard`,
    });
  };

  const downloadConfig = () => {
    const configStr = JSON.stringify(mcpServers, null, 2);
    const blob = new Blob([configStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'claude_desktop_config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Config Downloaded",
      description: "MCP servers configuration downloaded successfully",
    });
  };

  const copyFullConfig = () => {
    const configStr = JSON.stringify(mcpServers, null, 2);
    copyToClipboard(configStr, "Full MCP configuration");
  };

  const copyServerConfig = (serverName: string, config: any) => {
    const serverConfig = { [serverName]: config };
    const configStr = JSON.stringify(serverConfig, null, 2);
    copyToClipboard(configStr, `${serverName} configuration`);
  };

  const toggleServer = (serverName: string) => {
    const newActiveServers = new Set(activeServers);
    if (newActiveServers.has(serverName)) {
      newActiveServers.delete(serverName);
    } else {
      newActiveServers.add(serverName);
    }
    setActiveServers(newActiveServers);
  };

  const getServerDescription = (serverName: string): string => {
    const descriptions: Record<string, string> = {
      'hostinger-api': 'Hostinger hosting management and domain operations',
      'Context7': 'Upstash Context7 for intelligent context management',
      '@21st-dev/magic': '21st.dev Magic API for advanced development tools',
      'perplexity-ask': 'Perplexity AI search and question answering',
      'github-mcp-server': 'GitHub repository management and version control',
      'supabase-mcp-server': 'Supabase database and authentication services',
      'stripe': 'Stripe payment processing and financial operations',
      'sequential-thinking': 'Sequential thinking and reasoning capabilities',
      'browserbase': 'Browser automation and web scraping services',
      'browserbase2': 'Advanced browser automation with stealth mode',
      'playwright': 'Playwright browser automation and testing',
      'brave-search': 'Brave Search API for web search results',
      'puppeteer': 'Puppeteer browser automation and PDF generation',
      'picsart': 'Picsart image generation and editing API',
      'lanonasis': 'Your Lanonasis Memory as a Service platform'
    };
    return descriptions[serverName] || 'MCP server for extended functionality';
  };

  const servers = Object.entries(mcpServers.mcpServers);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">MCP Server Manager</h2>
          <p className="text-muted-foreground">
            Manage your Model Context Protocol servers and configurations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyFullConfig}>
            <Copy className="h-4 w-4 mr-2" />
            Copy All
          </Button>
          <Button onClick={downloadConfig}>
            <Download className="h-4 w-4 mr-2" />
            Download Config
          </Button>
        </div>
      </div>

      <Tabs defaultValue="servers" className="w-full">
        <TabsList>
          <TabsTrigger value="servers">All Servers ({servers.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({activeServers.size})</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="servers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {servers.map(([serverName, config]) => {
              const IconComponent = serverIcons[serverName] || Server;
              const isActive = activeServers.has(serverName);
              
              return (
                <Card key={serverName} className={`transition-all hover:shadow-md ${isActive ? 'ring-2 ring-primary' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{serverName}</CardTitle>
                      </div>
                      <Badge variant={isActive ? 'default' : 'secondary'}>
                        {isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm">
                      {getServerDescription(serverName)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Code className="h-4 w-4" />
                      <span>{config.command}</span>
                      {config.args && (
                        <Badge variant="outline" className="text-xs">
                          {config.args.length} args
                        </Badge>
                      )}
                    </div>
                    
                    {config.env && Object.keys(config.env).length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Settings className="h-4 w-4" />
                        <span>{Object.keys(config.env).length} env vars</span>
                      </div>
                    )}
                    
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant={isActive ? "destructive" : "default"}
                        onClick={() => toggleServer(serverName)}
                        className="flex-1"
                      >
                        {isActive ? (
                          <>
                            <Square className="h-3 w-3 mr-1" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-1" />
                            Start
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyServerConfig(serverName, config)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {activeServers.size === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Server className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Servers</h3>
                <p className="text-muted-foreground text-center">
                  Start some MCP servers from the "All Servers" tab to see them here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from(activeServers).map(serverName => {
                const config = mcpServers.mcpServers[serverName as keyof typeof mcpServers.mcpServers];
                const IconComponent = serverIcons[serverName] || Server;
                
                return (
                  <Card key={serverName} className="ring-2 ring-primary">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{serverName}</CardTitle>
                        <Badge>Running</Badge>
                      </div>
                      <CardDescription>
                        {getServerDescription(serverName)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => toggleServer(serverName)}
                        className="w-full"
                      >
                        <Square className="h-3 w-3 mr-1" />
                        Stop Server
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Claude Desktop Configuration</CardTitle>
              <CardDescription>
                Copy this configuration to your Claude Desktop settings file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Configuration File Location:</span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => copyToClipboard(
                      "~/Library/Application Support/Claude/claude_desktop_config.json", 
                      "Config file path"
                    )}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Path
                  </Button>
                </div>
                <code className="text-xs text-muted-foreground">
                  ~/Library/Application Support/Claude/claude_desktop_config.json
                </code>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={copyFullConfig} className="flex-1">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Configuration
                </Button>
                <Button variant="outline" onClick={downloadConfig}>
                  <Download className="h-4 w-4 mr-2" />
                  Download File
                </Button>
              </div>

              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Setup Instructions:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Copy the configuration above</li>
                  <li>Open Claude Desktop settings</li>
                  <li>Paste the configuration in the MCP servers section</li>
                  <li>Restart Claude Desktop to apply changes</li>
                  <li>Your servers will appear in the available connectors</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MCPServerManager;