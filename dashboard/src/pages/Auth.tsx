
import { Layout } from "@/components/layout/Layout";
import { AuthForm } from "@/components/auth/AuthForm";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const Auth = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp, resetPassword, isLoading, user } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "forgot-password">("login");
  
  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Set mode based on URL
  useEffect(() => {
    const path = location.pathname;
    if (path.includes("register")) {
      setMode("register");
    } else if (path.includes("forgot-password")) {
      setMode("forgot-password");
    } else {
      setMode("login");
    }
  }, [location.pathname]);

  const handleSubmit = async (data: any) => {
    try {
      if (mode === "login") {
        await signIn(data.email, data.password);
      } else if (mode === "register") {
        await signUp(data.email, data.password, {
          full_name: data.name,
        });
      } else if (mode === "forgot-password") {
        await resetPassword(data.email);
        setTimeout(() => {
          navigate("/auth/login");
        }, 2000);
      }
    } catch (error) {
      console.error("Authentication error:", error);
    }
  };

  return (
    <Layout>
      <div className="flex flex-1 items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <AuthForm 
            mode={mode} 
            onSubmit={handleSubmit} 
            isLoading={isLoading} 
          />
        </div>
      </div>
    </Layout>
  );
};

export default Auth;
