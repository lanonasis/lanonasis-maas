import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  // TODO: TEMPORARY - Auth guards disabled for testing dashboard routes
  // Remove this and uncomment the auth logic below when Core Gateway auth is ready
  
  return <>{children}</>;

  /* 
  // COMMENTED OUT FOR TESTING - Re-enable when auth is ready
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      // Store the attempted route for redirect after login
      const redirectPath = location.pathname + location.search;
      if (redirectPath !== '/dashboard') {
        localStorage.setItem('redirectAfterLogin', redirectPath);
      }
      navigate('/auth/login', { replace: true });
    }
  }, [user, isLoading, navigate, location]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div role="status" className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
  */
};