"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ViewModeProvider } from "@/contexts/ViewModeContext";
import { Toaster } from "@/components/ui/toaster";

interface ClientProvidersProps {
  children: ReactNode;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ViewModeProvider>
          {children}
          <Toaster />
        </ViewModeProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
