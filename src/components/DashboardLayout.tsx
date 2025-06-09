"use client";

import { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import dynamic from "next/dynamic";

interface DashboardLayoutProps {
  children: ReactNode;
}

// Create a client-only component that uses useAuth
const AuthenticatedDashboard = dynamic(
  () => import("./AuthenticatedDashboard"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    ),
  }
);

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <AuthenticatedDashboard>{children}</AuthenticatedDashboard>
        </main>
      </div>
    </div>
  );
}
