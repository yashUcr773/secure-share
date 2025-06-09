"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Shield, CheckCircle, XCircle, Mail, Loader2 } from "lucide-react";
import { useCSRF } from "@/hooks/useCSRF";

function VerifyEmailContent() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error' | 'expired'>('pending');
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");  const [canResend, setCanResend] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);
  const verificationAttemptedRef = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { csrfFetch, isLoading: csrfLoading } = useCSRF();
  const token = searchParams.get('token');
  const isFromSignup = searchParams.get('signup') === 'true';
  const emailParam = searchParams.get('email');
  // Set email from URL parameter if coming from signup
  useEffect(() => {
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [emailParam]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCooldown]);  
  const verifyEmailWithToken = useCallback(async (verificationToken: string) => {
    // Prevent multiple calls using ref
    if (isVerifying || verificationAttemptedRef.current) {
      return;
    }
    
    verificationAttemptedRef.current = true;
    setIsVerifying(true);
    setError("");

    try {
      const response = await csrfFetch('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await response.json();

      if (response.ok) {
        setVerificationStatus('success');
        setMessage(data.message || 'Email verified successfully!');
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/auth/login?verified=true');
        }, 3000);
      } else {
        setVerificationStatus('error');
        if (data.error?.includes('expired')) {
          setVerificationStatus('expired');
        }
        setError(data.error || 'Email verification failed');
        // Reset ref on error so user can retry
        verificationAttemptedRef.current = false;
      }
    } catch (err) {
      console.error("Email verification error:", err);
      setVerificationStatus('error');
      setError("An unexpected error occurred");
      // Reset ref on error so user can retry
      verificationAttemptedRef.current = false;
    } finally {
      setIsVerifying(false);
    }
  }, [csrfFetch, router, isVerifying]);
    // Auto-verify if token is provided in URL, but wait for CSRF to be ready
  useEffect(() => {
    if (token && !csrfLoading && !verificationAttemptedRef.current) {
      verifyEmailWithToken(token);
    }
  }, [token, csrfLoading, verifyEmailWithToken]);
  const handleManualVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const verificationToken = formData.get('token') as string;
    
    if (!verificationToken) {
      setError("Please enter a verification token");
      return;
    }

    // Reset ref for manual verification
    verificationAttemptedRef.current = false;
    await verifyEmailWithToken(verificationToken);
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setIsResending(true);
    setError("");

    try {
      const response = await csrfFetch('/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'Verification email sent successfully!');
        setCanResend(false);
        setResendCooldown(60); // 60 second cooldown
      } else {
        setError(data.error || 'Failed to resend verification email');
      }
    } catch (err) {
      console.error("Resend verification error:", err);
      setError("An unexpected error occurred");
    } finally {
      setIsResending(false);
    }
  };
  const renderVerificationStatus = () => {
    if (csrfLoading) {
      return (
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <h3 className="text-lg font-semibold">Initializing...</h3>
          <p className="text-muted-foreground">Preparing verification system...</p>
        </div>
      );
    }

    if (isVerifying) {
      return (
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <h3 className="text-lg font-semibold">Verifying your email...</h3>
          <p className="text-muted-foreground">Please wait while we verify your email address.</p>
        </div>
      );
    }

    if (verificationStatus === 'success') {
      return (
        <div className="text-center space-y-4">
          <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
          <h3 className="text-lg font-semibold text-green-700">Email Verified Successfully!</h3>
          <p className="text-muted-foreground">{message}</p>
          <p className="text-sm text-muted-foreground">Redirecting to login page...</p>
        </div>
      );
    }

    if (verificationStatus === 'error' || verificationStatus === 'expired') {
      return (
        <div className="text-center space-y-4">
          <XCircle className="h-12 w-12 mx-auto text-red-500" />
          <h3 className="text-lg font-semibold text-red-700">
            {verificationStatus === 'expired' ? 'Verification Link Expired' : 'Verification Failed'}
          </h3>
          <p className="text-red-600">{error}</p>
          {verificationStatus === 'expired' && (            <p className="text-muted-foreground">
              Don&apos;t worry! You can request a new verification email below.
            </p>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <Header />
      <div className="flex items-center justify-center p-4 pt-16">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">SecureShare</span>
            </div>            <CardTitle className="text-2xl">
              {isFromSignup ? 'Welcome to SecureShare!' : 'Email Verification'}
            </CardTitle>
            <CardDescription>
              {token ? 
                "We're verifying your email address..." : 
                isFromSignup ?
                  "We've sent a verification email to complete your account setup" :
                  "Verify your email to complete your account setup"
              }
            </CardDescription>
          </CardHeader>          <CardContent className="space-y-6">
            {/* Signup Success Message */}
            {isFromSignup && verificationStatus === 'pending' && !token && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">Account Created Successfully!</span>
                </div>                <p className="text-sm text-green-700 mb-2">
                  Your account has been created. We&apos;ve sent a verification email to:
                </p>
                <p className="text-sm font-medium text-green-800">{email}</p>
                <p className="text-sm text-green-700 mt-2">
                  Please check your email and click the verification link to activate your account.
                </p>
              </div>
            )}

            {/* Verification Status */}
            {renderVerificationStatus()}

            {/* Manual Token Entry (if no token in URL or verification failed) */}
            {(!token || verificationStatus === 'error') && verificationStatus !== 'success' && (
              <>
                <div className="border-t pt-6">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Enter Verification Token
                  </h4>
                  <form onSubmit={handleManualVerification} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="token">Verification Token</Label>
                      <Input
                        id="token"
                        name="token"
                        type="text"
                        placeholder="Enter your verification token"
                        required
                        disabled={isVerifying}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isVerifying}>
                      {isVerifying ? "Verifying..." : "Verify Email"}
                    </Button>
                  </form>
                </div>
              </>
            )}

            {/* Resend Verification */}
            {(verificationStatus === 'expired' || verificationStatus === 'error' || (!token && verificationStatus === 'pending')) && (
              <div className="border-t pt-6">
                <h4 className="font-semibold mb-4">Resend Verification Email</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isResending}
                    />
                  </div>
                  <Button 
                    onClick={handleResendVerification} 
                    className="w-full" 
                    disabled={isResending || !canResend}
                    variant="outline"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : canResend ? (
                      "Resend Verification Email"
                    ) : (
                      `Resend in ${resendCooldown}s`
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Messages */}            {error && verificationStatus !== 'error' && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
            {message && verificationStatus !== 'success' && (
              <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
                {message}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center space-y-2">
              <Link href="/auth/login" className="text-sm text-primary hover:underline">
                Back to Login
              </Link>
              <p className="text-sm text-muted-foreground">
                Need help? <Link href="/contact" className="text-primary hover:underline">Contact Support</Link>
              </p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

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

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
