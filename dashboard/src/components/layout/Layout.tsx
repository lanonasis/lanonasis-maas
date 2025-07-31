
import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith("/dashboard");
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main
        className={cn(
          "flex-1 flex flex-col",
          !isDashboard && "pt-24" // Add padding-top for non-dashboard pages to account for fixed header
        )}
      >
        {children}
      </main>
      {!isDashboard && <Footer />}
    </div>
  );
};
