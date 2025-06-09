"use client";

import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface AuthenticatedDashboardProps {
  children: ReactNode;
}

export default function AuthenticatedDashboard({ children }: AuthenticatedDashboardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Debug logging
  console.log("🔐 AuthenticatedDashboard - loading:", loading, "user:", !!user);

  useEffect(() => {
    console.log("🔐 AuthenticatedDashboard useEffect - loading:", loading, "user:", !!user);
    if (!loading && !user) {
      console.log("🔐 Redirecting to login...");
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  if (loading) {
    console.log("🔐 Showing loading state");
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    console.log("🔐 Showing access denied");
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Please log in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  console.log("🔐 Rendering children");
  return <>{children}</>;
}
