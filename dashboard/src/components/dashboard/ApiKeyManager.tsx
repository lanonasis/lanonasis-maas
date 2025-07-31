
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, Copy, Eye, EyeOff, Check, Clock, ArrowUpDown, Shield, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export const ApiKeyManager = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("create");
  const [keyName, setKeyName] = useState("");
  const [keyService, setKeyService] = useState("all");
  const [keyExpiration, setKeyExpiration] = useState("never");
  const [customExpiration, setCustomExpiration] = useState("");
  const [rateLimit, setRateLimit] = useState(true);
  const [generatedKey, setGeneratedKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && activeTab === "manage") {
      fetchApiKeys();
    }
  }, [isOpen, activeTab]);

  const fetchApiKeys = async () => {
    if (!user) return;
    
    setIsLoadingKeys(true);
    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      setApiKeys(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch API keys",
        variant: "destructive",
      });
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedKey);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const generateApiKey = async () => {
    if (!keyName) {
      toast({
        title: "Error",
        description: "Please enter a name for your API key",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Generate a random API key
      const randomKey = Array.from(
        { length: 32 },
        () => Math.floor(Math.random() * 36).toString(36)
      ).join("");
      
      const formattedKey = `vx_${randomKey}`;
      setGeneratedKey(formattedKey);
      
      if (user) {
        const expirationDate = keyExpiration === "never" 
          ? null 
          : keyExpiration === "custom" 
            ? new Date(customExpiration).toISOString() 
            : new Date(Date.now() + parseInt(keyExpiration) * 86400000).toISOString();
        
        // Save the API key to the database
        const { error } = await supabase.from("api_keys").insert({
          name: keyName,
          key: formattedKey,
          service: keyService,
          user_id: user.id,
          expires_at: expirationDate,
          rate_limited: rateLimit,
        });
        
        if (error) throw error;
      }
      
      toast({
        title: "API Key Generated",
        description: "Your API key has been generated successfully. Make sure to copy it now.",
      });
      
      setShowKey(true);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate API key",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const revokeApiKey = async (keyId) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from("api_keys")
        .delete()
        .eq("id", keyId)
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      toast({
        title: "API Key Revoked",
        description: "The API key has been successfully revoked",
      });
      
      fetchApiKeys();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to revoke API key",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Key className="h-4 w-4 mr-2" />
          Manage API Keys
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>API Key Management</DialogTitle>
          <DialogDescription>
            Create, view and manage your API keys for accessing Lanonasis Memory Service.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="create">Create API Key</TabsTrigger>
            <TabsTrigger value="manage">Manage API Keys</TabsTrigger>
          </TabsList>
          
          <TabsContent value="create">
            {!generatedKey ? (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Key Name</Label>
                  <Input
                    id="name"
                    placeholder="My API Key"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="service">Service Access</Label>
                  <Select value={keyService} onValueChange={setKeyService}>
                    <SelectTrigger id="service">
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Services</SelectItem>
                      <SelectItem value="payment">Payment Gateways</SelectItem>
                      <SelectItem value="wallet">Wallet Service</SelectItem>
                      <SelectItem value="verification">ID Verification</SelectItem>
                      <SelectItem value="utility">Utility Payment</SelectItem>
                      <SelectItem value="trade">Trade Financing</SelectItem>
                      <SelectItem value="bank">Bank Statement API</SelectItem>
                      <SelectItem value="fraud">Fraud Monitoring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expiration">Expiration</Label>
                  <Select value={keyExpiration} onValueChange={setKeyExpiration}>
                    <SelectTrigger id="expiration">
                      <SelectValue placeholder="Select expiration time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                      <SelectItem value="custom">Custom date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {keyExpiration === "custom" && (
                  <div className="grid gap-2">
                    <Label htmlFor="custom-expiration">Custom Expiration Date</Label>
                    <Input
                      id="custom-expiration"
                      type="date"
                      value={customExpiration}
                      onChange={(e) => setCustomExpiration(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="rate-limit" 
                    checked={rateLimit} 
                    onCheckedChange={setRateLimit} 
                  />
                  <Label htmlFor="rate-limit">Enable rate limiting</Label>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <p>This API key will have access to the selected services.</p>
                  <p>Rate limits help prevent abuse of your API key.</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="api-key">Your API Key</Label>
                  <div className="relative">
                    <Input
                      id="api-key"
                      type={showKey ? "text" : "password"}
                      value={generatedKey}
                      readOnly
                      className="pr-20 font-mono"
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="p-1 text-muted-foreground hover:text-foreground"
                        aria-label={showKey ? "Hide API key" : "Show API key"}
                      >
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={copyToClipboard}
                        className="p-1 ml-1 text-muted-foreground hover:text-foreground"
                        aria-label="Copy API key"
                      >
                        {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-destructive">Important:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>This API key will only be displayed once and cannot be retrieved later.</li>
                    <li>Please copy and store it in a secure location.</li>
                    <li>If lost, you'll need to generate a new key.</li>
                  </ul>
                </div>
                
                <div className="bg-secondary/50 p-4 rounded-md">
                  <h4 className="text-sm font-medium mb-2">API Key Details</h4>
                  <div className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">Name:</span> {keyName}</p>
                    <p><span className="text-muted-foreground">Services:</span> {keyService === "all" ? "All services" : keyService}</p>
                    <p>
                      <span className="text-muted-foreground">Expires:</span> {
                        keyExpiration === "never" 
                          ? "Never" 
                          : keyExpiration === "custom" 
                            ? new Date(customExpiration).toLocaleDateString() 
                            : new Date(Date.now() + parseInt(keyExpiration) * 86400000).toLocaleDateString()
                      }
                    </p>
                    <p><span className="text-muted-foreground">Rate Limiting:</span> {rateLimit ? "Enabled" : "Disabled"}</p>
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              {!generatedKey ? (
                <Button onClick={generateApiKey} disabled={isLoading || (keyExpiration === "custom" && !customExpiration)}>
                  {isLoading ? "Generating..." : "Generate API Key"}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => {
                    setGeneratedKey("");
                    setKeyName("");
                    setKeyService("all");
                    setKeyExpiration("never");
                    setCustomExpiration("");
                    setRateLimit(true);
                    setShowKey(false);
                  }}>
                    Create Another
                  </Button>
                  <Button onClick={() => {
                    setActiveTab("manage");
                    setGeneratedKey("");
                    fetchApiKeys();
                  }}>
                    Manage Keys
                  </Button>
                </div>
              )}
            </DialogFooter>
          </TabsContent>
          
          <TabsContent value="manage">
            <div className="py-4">
              {isLoadingKeys ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">You don't have any API keys yet</p>
                  <Button onClick={() => setActiveTab("create")}>Create Your First API Key</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-2">
                    You have {apiKeys.length} API {apiKeys.length === 1 ? 'key' : 'keys'}
                  </div>
                  
                  <div className="space-y-3">
                    {apiKeys.map((key) => (
                      <div 
                        key={key.id} 
                        className={`p-4 border rounded-lg ${isExpired(key.expires_at) ? 'bg-destructive/5 border-destructive/30' : 'bg-card'}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium flex items-center">
                              {key.name}
                              {isExpired(key.expires_at) && (
                                <Badge variant="destructive" className="ml-2 text-xs">
                                  Expired
                                </Badge>
                              )}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              Access: {key.service === "all" ? "All Services" : key.service}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => revokeApiKey(key.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="text-xs text-muted-foreground grid grid-cols-2 gap-y-1">
                          <div className="flex items-center gap-1">
                            <Shield className="h-3 w-3" /> 
                            <span>ID: {key.id.substring(0, 8)}...</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> 
                            <span>Created: {formatDate(key.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> 
                            <span>Expires: {formatDate(key.expires_at)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ArrowUpDown className="h-3 w-3" /> 
                            <span>Rate Limited: {key.rate_limited ? "Yes" : "No"}</span>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
                          <div className="text-xs">
                            Last used: {key.last_used ? formatDate(key.last_used) : "Never"}
                          </div>
                          <Button variant="outline" size="sm" className="h-7 text-xs">
                            View Activity
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => setActiveTab("create")}>
                  Create New Key
                </Button>
              </div>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
