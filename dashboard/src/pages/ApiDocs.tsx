
import { Layout } from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Check, Code, CreditCard, FileText, Globe, Lock, Terminal, Users } from "lucide-react";
import { Link } from "react-router-dom";

const ApiDocs = () => {
  return (
    <Layout>
      <div className="container mx-auto py-16 px-4">
        <div className="max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-bold mb-4">API Documentation</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Comprehensive guides and references for the Lanonasis Memory Service API platform.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <Link to="/dashboard">
              <Button variant="outline" className="gap-2">
                <Users className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Button variant="outline" className="gap-2">
              <Terminal className="h-4 w-4" />
              API Reference
            </Button>
            <Button variant="outline" className="gap-2">
              <Code className="h-4 w-4" />
              SDK Documentation
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="getting-started" className="max-w-4xl mx-auto">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-8">
            <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
            <TabsTrigger value="authentication">Authentication</TabsTrigger>
            <TabsTrigger value="services">API Services</TabsTrigger>
            <TabsTrigger value="sdks">Client SDKs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="getting-started" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Quick Start Guide</CardTitle>
                <CardDescription>Get started with Lanonasis Memory Service API in minutes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-semibold">1</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Create an account</h3>
                      <p className="text-muted-foreground">Sign up for a Lanonasis account to get your API keys.</p>
                      <Link to="/auth/register">
                        <Button variant="link" className="pl-0 pt-2">
                          Create an account <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-semibold">2</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Get your API key</h3>
                      <p className="text-muted-foreground">Generate API keys from your dashboard to authenticate your requests.</p>
                      <Link to="/dashboard">
                        <Button variant="link" className="pl-0 pt-2">
                          Go to dashboard <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-semibold">3</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Make your first API call</h3>
                      <p className="text-muted-foreground">Use your API key to make authenticated requests to our endpoints.</p>
                      <div className="mt-3 p-4 bg-secondary/50 rounded-md overflow-x-auto">
                        <pre className="text-xs text-muted-foreground">
                          <code>
{`curl -X GET "https://api.lanonasis.com/v1/memories" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
                          </code>
                        </pre>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-semibold">4</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Implement in your application</h3>
                      <p className="text-muted-foreground">Use our client libraries for your preferred programming language.</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                        {['JavaScript', 'Python', 'Java', 'PHP'].map(lang => (
                          <Button key={lang} variant="outline" size="sm">
                            {lang}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="gap-2">
                  <Terminal className="h-4 w-4" />
                  Explore Full Documentation
                </Button>
              </CardFooter>
            </Card>

            <div className="grid sm:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Base URLs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium">Production</div>
                      <code className="text-sm bg-secondary py-1 px-2 rounded">https://api.lanonasis.com</code>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Sandbox</div>
                      <code className="text-sm bg-secondary py-1 px-2 rounded">https://sandbox-api.lanonasis.com</code>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-primary" />
                    API Version
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium">Current Version</div>
                      <code className="text-sm bg-secondary py-1 px-2 rounded">v1</code>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Include the version in the URL path: <code className="text-xs">/v1/resource</code>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="authentication" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Authentication</CardTitle>
                <CardDescription>Secure your API requests with authentication</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Lock className="h-5 w-5 text-primary" />
                      API Key Authentication
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      All API requests require authentication using your API key. You can generate API keys from your Lanonasis dashboard.
                    </p>
                    
                    <div className="p-4 bg-secondary/50 rounded-md overflow-x-auto mb-4">
                      <pre className="text-xs text-muted-foreground">
                        <code>
{`// Example API request with authentication header
fetch('https://api.lanonasis.com/v1/memories', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})`}
                        </code>
                      </pre>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">API Key Security Best Practices</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {[
                        'Never expose your API keys in client-side code',
                        'Use environment variables to store your API keys',
                        'Implement appropriate scopes for your API keys',
                        'Rotate your API keys periodically',
                        'Revoke compromised API keys immediately'
                      ].map((practice, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                          {practice}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Link to="/dashboard">
                  <Button variant="outline" size="sm">
                    Manage API Keys
                  </Button>
                </Link>
              </CardFooter>
            </Card>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Rate Limiting</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    API requests are limited to 100 requests per minute per API key. Rate limit headers are included in API responses.
                  </p>
                  <div className="mt-4 p-3 bg-secondary/50 rounded-md text-xs">
                    <div className="text-muted-foreground">Response Headers:</div>
                    <code>X-RateLimit-Limit: 100</code><br />
                    <code>X-RateLimit-Remaining: 95</code><br />
                    <code>X-RateLimit-Reset: 1623348000</code>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Error Handling</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    The API uses standard HTTP status codes and returns detailed error messages in JSON format.
                  </p>
                  <div className="mt-4 p-3 bg-secondary/50 rounded-md text-xs">
                    <code>{`{
  "error": {
    "code": "authentication_error",
    "message": "Invalid API key provided",
    "status": 401
  }
}`}</code>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="services" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Payment Gateways
                  </CardTitle>
                  <CardDescription>Process payments with multiple payment providers</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      Credit card processing with major providers
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      Alternative payment methods (ACH, wire transfers)
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      Currency conversion and international payments
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm">View API Reference</Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Bank Statements API
                  </CardTitle>
                  <CardDescription>Retrieve and analyze bank statements</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      Connect to 10,000+ financial institutions
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      AI-powered transaction categorization
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      Financial health analytics and insights
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm">View API Reference</Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    ID Verification
                  </CardTitle>
                  <CardDescription>KYC and document verification</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      Document verification and authentication
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      Biometric verification (face matching)
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      Address verification and validation
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm">View API Reference</Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    Fraud Monitoring
                  </CardTitle>
                  <CardDescription>Real-time fraud detection</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      Transaction risk scoring and analysis
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      Behavior pattern recognition
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      Real-time alerts and notifications
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm">View API Reference</Button>
                </CardFooter>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Service Limits and Pricing</CardTitle>
                <CardDescription>Request limits and pricing tiers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Service</th>
                        <th className="text-left py-3 px-4">Free Tier</th>
                        <th className="text-left py-3 px-4">Standard Tier</th>
                        <th className="text-left py-3 px-4">Enterprise Tier</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-3 px-4">Payment Processing</td>
                        <td className="py-3 px-4">100 / month</td>
                        <td className="py-3 px-4">10,000 / month</td>
                        <td className="py-3 px-4">Unlimited</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4">Bank Statements</td>
                        <td className="py-3 px-4">50 / month</td>
                        <td className="py-3 px-4">5,000 / month</td>
                        <td className="py-3 px-4">Unlimited</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4">ID Verification</td>
                        <td className="py-3 px-4">25 / month</td>
                        <td className="py-3 px-4">2,500 / month</td>
                        <td className="py-3 px-4">Unlimited</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4">Fraud Monitoring</td>
                        <td className="py-3 px-4">1,000 / month</td>
                        <td className="py-3 px-4">100,000 / month</td>
                        <td className="py-3 px-4">Unlimited</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline">View Complete Pricing</Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="sdks" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Client Libraries</CardTitle>
                <CardDescription>Official SDKs for various programming languages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { name: 'JavaScript', version: 'v1.5.2', icon: <div className="text-yellow-500 font-bold">JS</div> },
                    { name: 'Python', version: 'v1.4.0', icon: <div className="text-blue-500 font-bold">PY</div> },
                    { name: 'Java', version: 'v1.3.1', icon: <div className="text-red-500 font-bold">JV</div> },
                    { name: 'PHP', version: 'v1.2.0', icon: <div className="text-purple-500 font-bold">PHP</div> },
                    { name: 'Ruby', version: 'v1.1.3', icon: <div className="text-red-600 font-bold">RB</div> },
                    { name: 'Go', version: 'v1.0.1', icon: <div className="text-cyan-500 font-bold">GO</div> }
                  ].map((sdk) => (
                    <div key={sdk.name} className="flex items-center p-4 bg-secondary/30 rounded-lg">
                      <div className="h-10 w-10 rounded-md bg-background flex items-center justify-center mr-4">
                        {sdk.icon}
                      </div>
                      <div>
                        <h4 className="font-medium">{sdk.name}</h4>
                        <p className="text-xs text-muted-foreground">{sdk.version}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Card className="border border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">JavaScript SDK Example</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-secondary/50 rounded-md overflow-x-auto">
                      <pre className="text-xs text-muted-foreground">
                        <code>
{`// Install the package
npm install @lanonasis/memory-sdk

// Initialize and use the SDK
const Lanonasis = require('@lanonasis/memory-sdk');
const client = new Lanonasis.Client({
  apiKey: 'your_api_key_here',
  environment: 'production' // or 'sandbox'
});

// Make API calls
async function fetchBankStatement() {
  try {
    const statement = await client.bankStatements.retrieve({
      accountId: 'account_123',
      fromDate: '2023-01-01',
      toDate: '2023-12-31'
    });
    
    console.log(statement);
    
    // Analyze the statement
    const analysis = await client.bankStatements.analyze({
      statementId: statement.id
    });
    
    console.log(analysis);
  } catch (error) {
    console.error('Error:', error.message);
  }
}`}
                        </code>
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
              <CardFooter>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm">SDK Documentation</Button>
                  <Button variant="outline" size="sm">GitHub Repository</Button>
                </div>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>API Wrappers</CardTitle>
                <CardDescription>Community-maintained libraries and integrations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    In addition to our official SDKs, the community has built several frameworks, plugins, and integrations to help you integrate Lanonasis into your tech stack.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { name: 'React Hook', desc: 'React hooks for Lanonasis Memory API' },
                      { name: 'WordPress Plugin', desc: 'WP integration for e-commerce sites' },
                      { name: 'Laravel Package', desc: 'Native Laravel integration' },
                      { name: 'Django App', desc: 'Django integration for Python apps' }
                    ].map((wrapper) => (
                      <div key={wrapper.name} className="p-4 border rounded-lg">
                        <h4 className="font-medium">{wrapper.name}</h4>
                        <p className="text-xs text-muted-foreground">{wrapper.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ApiDocs;
