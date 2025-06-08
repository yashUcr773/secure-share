"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Shield, Mail, Loader2, CheckCircle } from "lucide-react";
import { useCSRF } from "@/hooks/useCSRF";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const { csrfFetch } = useCSRF();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      const response = await csrfFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setCanResend(false);
        
        // Start cooldown timer
        let countdown = 60;
        setResendCooldown(countdown);
        
        const timer = setInterval(() => {
          countdown--;
          setResendCooldown(countdown);
          
          if (countdown <= 0) {
            clearInterval(timer);
            setCanResend(true);
          }
        }, 1000);
      } else {
        setError(data.error || 'Failed to send reset email');
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      const response = await csrfFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setCanResend(false);
        
        // Start cooldown timer
        let countdown = 60;
        setResendCooldown(countdown);
        
        const timer = setInterval(() => {
          countdown--;
          setResendCooldown(countdown);
          
          if (countdown <= 0) {
            clearInterval(timer);
            setCanResend(true);
          }
        }, 1000);
      } else {
        setError(data.error || 'Failed to resend reset email');
      }
    } catch (err) {
      console.error("Resend reset email error:", err);
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <Header />
        <div className="flex items-center justify-center p-4 pt-16">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Shield className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold">SecureShare</span>
              </div>
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle className="text-2xl">Check Your Email</CardTitle>            <CardDescription>
              We&apos;ve sent password reset instructions to your email address
            </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">Email Sent!</span>
                </div>                <p className="text-sm text-green-700">
                  If an account with the email <strong>{email}</strong> exists, 
                  we&apos;ve sent a password reset link to your inbox.
                </p>
              </div>

              <div className="space-y-3 text-sm text-muted-foreground">
                <p>• Check your email inbox and spam folder</p>
                <p>• Click the reset link in the email</p>
                <p>• The link will expire in 1 hour for security</p>
                <p>• If you don&apos;t see the email, you can request another one below</p>
              </div>

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button 
                onClick={handleResend} 
                variant="outline" 
                className="w-full"
                disabled={isLoading || !canResend}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : canResend ? (
                  "Resend Reset Email"
                ) : (
                  `Resend in ${resendCooldown}s`
                )}
              </Button>
              
              <div className="text-center space-y-2">
                <Link href="/auth/login" className="text-sm text-primary hover:underline">
                  Back to Login
                </Link>
                <p className="text-sm text-muted-foreground">
                  Remember your password? <Link href="/auth/login" className="text-primary hover:underline">Sign in</Link>
                </p>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <Header />
      <div className="flex items-center justify-center p-4 pt-16">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">SecureShare</span>
            </div>
            <CardTitle className="text-2xl">Forgot Password?</CardTitle>            <CardDescription>
              Enter your email address and we&apos;ll send you a link to reset your password
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">                  <strong>Security Note:</strong> For your protection, we&apos;ll only send reset instructions 
                  if this email is associated with an active account.
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Reset Email...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Reset Email
                  </>
                )}
              </Button>
              
              <div className="text-center space-y-2">
                <Link href="/auth/login" className="text-sm text-primary hover:underline">
                  Back to Login
                </Link>
                <p className="text-sm text-muted-foreground">
                  Don&apos;t have an account? <Link href="/auth/signup" className="text-primary hover:underline">Sign up</Link>
                </p>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
