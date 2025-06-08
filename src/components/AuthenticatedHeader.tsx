"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogOut, User, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AuthenticatedHeaderProps {
  isAuthPage: boolean;
  pathname: string;
}

export default function AuthenticatedHeader({ isAuthPage, pathname }: AuthenticatedHeaderProps) {
  const { user, logout, loading } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return <div className="w-20 h-9 bg-muted animate-pulse rounded"></div>;
  }

  if (user) {
    return (
      <>
        {!pathname?.startsWith('/dashboard') && (
          <Button variant="ghost" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        )}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-muted">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{user.email}</span>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </>
    );
  }

  if (!isAuthPage) {
    return (
      <>
        <Button variant="ghost" asChild>
          <Link href="/auth/login">Login</Link>
        </Button>
        <Button asChild>
          <Link href="/auth/signup">Sign Up</Link>
        </Button>
      </>
    );
  }

  return null;
}
