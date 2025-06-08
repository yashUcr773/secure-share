'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, AlertCircle, Key } from 'lucide-react';

interface TwoFactorVerificationProps {
  onVerificationSuccess: () => void;
  onCancel?: () => void;
}

export function TwoFactorVerification({ onVerificationSuccess, onCancel }: TwoFactorVerificationProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('totp');

  const handleVerification = async () => {
    const code = activeTab === 'totp' ? verificationCode : backupCode;
    
    if (!code) {
      setError('Please enter a verification code');
      return;
    }

    if (activeTab === 'totp' && code.length !== 6) {
      setError('Please enter a 6-digit verification code');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/auth/2fa/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: code,
          isBackupCode: activeTab === 'backup',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Verification failed');
      }

      onVerificationSuccess();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerification();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          Please enter your verification code to continue
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="totp">Authenticator App</TabsTrigger>
            <TabsTrigger value="backup">Backup Code</TabsTrigger>
          </TabsList>

          <TabsContent value="totp" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="totp-code">Enter 6-digit code</Label>
              <Input
                id="totp-code"
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyPress={handleKeyPress}
                className="text-center text-lg font-mono tracking-widest"
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus
              />
              <p className="text-xs text-muted-foreground text-center">
                Open your authenticator app and enter the current code
              </p>
            </div>
          </TabsContent>

          <TabsContent value="backup" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="backup-code" className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                Enter backup code
              </Label>
              <Input
                id="backup-code"
                type="text"
                placeholder="xxxxxxxx"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.replace(/\s/g, ''))}
                onKeyPress={handleKeyPress}
                className="text-center font-mono"
                autoComplete="one-time-code"
              />
              <p className="text-xs text-muted-foreground text-center">
                Use one of your saved backup codes
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 mt-6">
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleVerification}
            disabled={isLoading || (!verificationCode && !backupCode)}
            className="flex-1"
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </Button>
        </div>

        <div className="mt-4 text-center">          <p className="text-xs text-muted-foreground">
            Having trouble? Contact support if you&apos;ve lost access to your authenticator device.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
