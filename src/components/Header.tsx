"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Shield } from "lucide-react";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Create a client-only component that uses useAuth
const AuthenticatedHeader = dynamic(() => import('./AuthenticatedHeader'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center gap-4">
      <div className="w-20 h-9 bg-muted animate-pulse rounded"></div>
    </div>
  )
}) as React.ComponentType<{ isAuthPage: boolean; pathname: string }>;

export function Header() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAuthPage = pathname?.startsWith('/auth');

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Shield className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">SecureShare</span>
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-4">
          {/* Theme Toggle - Always visible */}
          <ThemeToggle />
          
          {/* Auth-dependent navigation */}
          {mounted ? (
            <AuthenticatedHeader isAuthPage={isAuthPage} pathname={pathname} />
          ) : (
            <div className="w-20 h-9 bg-muted animate-pulse rounded"></div>
          )}
        </div>
      </div>
    </header>
  );
}
