import { Layout } from "@/components/layout/Layout";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, Shield, Zap, Clock, CreditCard, UserCheck, FileText, Code } from "lucide-react";

const Index = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 pointer-events-none" />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[100px]" />
          <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-accent/10 blur-[100px]" />
        </div>
        
        <div className="container relative px-4 md:px-6">
          <div className="flex flex-col items-center text-center">
            <div className="animate-slide-down">
              <div className="inline-flex items-center rounded-full border border-border/60 bg-background/80 backdrop-blur-sm px-3 py-1 text-sm font-medium text-foreground mb-6">
                <span className="flex h-2 w-2 rounded-full bg-accent mr-2"></span>
                <span>Introducing Lanonasis</span>
              </div>
            </div>
            
            <h1 className="animate-fade-in font-bold tracking-tight text-4xl md:text-5xl lg:text-6xl mb-6 max-w-4xl bg-clip-text">
              Memory-as-a-Service Platform <br /> for AI Developers
            </h1>
            
            <p className="animate-slide-up text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-8">
              Vector-enabled memory storage, secure API key management, and MCP integration for building intelligent AI applications.
            </p>
            
            <div className="animate-slide-up flex flex-col sm:flex-row gap-4 mb-12">
              <Link to="/auth/register">
                <AnimatedButton size="lg" className="min-w-[160px]">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </AnimatedButton>
              </Link>
              <Link to="#features">
                <AnimatedButton variant="outline" size="lg" className="min-w-[160px]">
                  Learn More
                </AnimatedButton>
              </Link>
            </div>
            
            {/* Browser Frame */}
            <div className="animate-scale-in w-full max-w-5xl mx-auto rounded-lg overflow-hidden shadow-subtle-xl border border-border/60 bg-card/60 backdrop-blur-sm">
              <div className="h-12 flex items-center px-4 border-b border-border/60 bg-secondary/50">
                <div className="flex space-x-2">
                  <div className="h-3 w-3 rounded-full bg-destructive/80"></div>
                  <div className="h-3 w-3 rounded-full bg-accent/80"></div>
                  <div className="h-3 w-3 rounded-full bg-primary/80"></div>
                </div>
                <div className="mx-auto flex items-center h-6 w-64 rounded-full bg-background/70 text-xs px-3">
                  dashboard.lanonasis.com
                </div>
              </div>
              <div className="p-4 bg-gradient-to-b from-transparent to-background/5">
                <img
                  src="https://placehold.co/1200x800/f5f5f5/cccccc?text=Lanonasis+Dashboard"
                  alt="Dashboard Preview"
                  className="w-full h-auto rounded-md shadow-subtle"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-secondary/30">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Platform Services
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Complete toolkit for building intelligent applications with memory, security, and seamless integrations.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-card border border-border/60 rounded-lg p-6 transition-all duration-300 hover:shadow-subtle-md">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Memory-as-a-Service</h3>
              <p className="text-muted-foreground mb-4">
                Vector-enabled memory storage for AI agents with semantic search, bulk operations, and hierarchical organization.
              </p>
              <ul className="space-y-2">
                {["Vector storage (OpenAI 1536D)", "Semantic search", "Memory types & topics", "Bulk import/export"].map((item) => (
                  <li key={item} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-accent mr-2 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-card border border-border/60 rounded-lg p-6 transition-all duration-300 hover:shadow-subtle-md">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">API Key Management</h3>
              <p className="text-muted-foreground mb-4">
                Secure API key storage and management with MCP integration for agentic workflows without exposing secrets.
              </p>
              <ul className="space-y-2">
                {["Zero-trust key storage", "MCP protocol support", "Scoped key access", "Proxy token generation"].map((item) => (
                  <li key={item} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-accent mr-2 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-card border border-border/60 rounded-lg p-6 transition-all duration-300 hover:shadow-subtle-md">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Developer Dashboard</h3>
              <p className="text-muted-foreground mb-4">
                Interactive dashboard for managing memories, API keys, and monitoring usage with real-time analytics.
              </p>
              <ul className="space-y-2">
                {["Memory visualization", "Usage analytics", "Key management UI", "MCP integration status"].map((item) => (
                  <li key={item} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-accent mr-2 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Feature 4 */}
            <div className="bg-card border border-border/60 rounded-lg p-6 transition-all duration-300 hover:shadow-subtle-md">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">CLI & SDK Tools</h3>
              <p className="text-muted-foreground mb-4">
                Complete developer toolkit with TypeScript SDK, CLI commands, and npm packages for seamless integration.
              </p>
              <ul className="space-y-2">
                {["@lanonasis/cli (npx ready)", "@lanonasis/sdk package", "TypeScript definitions", "React hooks included"].map((item) => (
                  <li key={item} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-accent mr-2 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Feature 5 */}
            <div className="bg-card border border-border/60 rounded-lg p-6 transition-all duration-300 hover:shadow-subtle-md">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                <UserCheck className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">MCP Integration</h3>
              <p className="text-muted-foreground mb-4">
                Model Context Protocol support for AI agents with secure key access and proxy token generation.
              </p>
              <ul className="space-y-2">
                {["MCP server integration", "Proxy token system", "Zero-secret workflows", "Agent context sharing"].map((item) => (
                  <li key={item} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-accent mr-2 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Feature 6 */}
            <div className="bg-card border border-border/60 rounded-lg p-6 transition-all duration-300 hover:shadow-subtle-md">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Enterprise Features</h3>
              <p className="text-muted-foreground mb-4">
                Multi-tenant isolation, organization management, and enterprise-grade security for production use.
              </p>
              <ul className="space-y-2">
                {["Multi-tenant architecture", "Organization isolation", "Enterprise security", "SLA guarantees"].map((item) => (
                  <li key={item} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-accent mr-2 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* API Integration Section */}
      <section className="py-20">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Developer Experience
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Multiple deployment options including npm packages, CLI tools, and MCP integration for maximum flexibility.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">NPM Packages</h3>
                </div>
                <p className="text-muted-foreground">
                  Ready-to-use packages: @lanonasis/cli (global install), @lanonasis/sdk (TypeScript support), and npx commands.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">Multi-Access Integration</h3>
                </div>
                <p className="text-muted-foreground">
                  Access via remote SDK, MCP protocol, GitHub repositories, or VPS server deployment for enterprises.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">MCP Protocol Support</h3>
                </div>
                <p className="text-muted-foreground">
                  Model Context Protocol integration for AI agents with secure memory and key management capabilities.
                </p>
              </div>
              
              <div className="flex gap-4 mt-4">
                <Link to="/api-docs">
                  <Button variant="outline" size="lg">
                    API Documentation
                  </Button>
                </Link>
                <Button variant="outline" size="lg" onClick={() => window.open('https://docs.lanonasis.com', '_blank')}>
                  Platform Docs
                </Button>
              </div>
            </div>
            
            <div className="bg-secondary p-6 rounded-lg border border-border">
              <div className="text-sm font-mono overflow-x-auto">
                <pre className="text-muted-foreground">
                  <code>
{`// Example: Memory-as-a-Service with API key management
const lanonasis = require('@lanonasis/sdk');

// Initialize with your API key
const client = new lanonasis.Client({
  apiKey: 'your_api_key_here'
});

// Store and retrieve memories
async function useMemoryService() {
  try {
    // Store a memory with vector embedding
    const memory = await client.memory.store({
      content: 'User prefers dark theme and condensed layout',
      type: 'preference',
      topic: 'ui_settings',
      metadata: { userId: 'user_123' }
    });
    
    console.log('Memory stored:', memory.id);
    
    // Search similar memories
    const similar = await client.memory.search({
      query: 'user interface preferences',
      type: 'preference',
      limit: 5
    });
    
    console.log('Similar memories:', similar.results);
  } catch (error) {
    console.error('Error:', error.message);
  }
}`}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container px-4 md:px-6">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-primary to-accent p-8 md:p-12">
            <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(to_bottom,transparent,white)]"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-accent/90"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Ready to get started?</h2>
                <p className="text-white/80 max-w-md">
                  Join thousands of developers using Lanonasis Memory-as-a-Service and API Key Management to build intelligent applications.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/auth/register">
                  <AnimatedButton 
                    size="lg" 
                    className="bg-white text-primary hover:bg-white/90 min-w-[160px]"
                  >
                    Sign up free
                  </AnimatedButton>
                </Link>
                <Link to="/auth/login">
                  <AnimatedButton 
                    variant="outline" 
                    size="lg" 
                    className="border-white text-white hover:bg-white/10 min-w-[160px]"
                  >
                    Learn more
                  </AnimatedButton>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
