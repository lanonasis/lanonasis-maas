
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import ApiDocs from "./pages/ApiDocs";
import ApiAnalytics from "./pages/ApiAnalytics";
import OAuthAuthorize from "./pages/OAuthAuthorize";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={<Auth />} />
              <Route path="/auth/*" element={<Auth />} />
              <Route path="/auth/login" element={<Auth />} />
              <Route path="/auth/register" element={<Auth />} />
              <Route path="/auth/forgot-password" element={<Auth />} />
              <Route path="/auth/callback" element={<Auth />} />
              <Route path="/landing" element={<Index />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/memory-visualizer" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/api-keys" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/orchestrator" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/extensions" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/upload" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/api-docs" element={<ApiDocs />} />
              <Route path="/docs" element={<ApiDocs />} />
              <Route path="/api-analytics" element={<ApiAnalytics />} />
              <Route path="/mcp/connect" element={<Index />} />
              <Route path="/oauth/authorize" element={<OAuthAuthorize />} />
              <Route path="/device" element={<OAuthAuthorize />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
