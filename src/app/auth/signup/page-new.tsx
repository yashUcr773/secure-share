export const dynamic = 'force-dynamic';

import { Suspense } from "react";
import dynamicImport from "next/dynamic";
import { Header } from "@/components/Header";
import { Loader2 } from "lucide-react";

const AuthenticatedSignup = dynamicImport(() => import("@/components/AuthenticatedSignup"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-4 pt-16">
      <div className="flex items-center space-x-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Loading signup form...</span>
      </div>
    </div>
  ),
});

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <div className="flex items-center justify-center pt-20">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <Header />
      <Suspense fallback={<LoadingFallback />}>
        <AuthenticatedSignup />
      </Suspense>
    </div>
  );
}
