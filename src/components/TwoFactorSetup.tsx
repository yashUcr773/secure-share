'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Key, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TwoFactorSetupData {
  qrCodeUrl: string;
  secret: string;
  backupCodes: string[];
}

interface TwoFactorSetupProps {
  onSetupComplete?: () => void;
  onCancel?: () => void;
}

export function TwoFactorSetup({ onSetupComplete, onCancel }: TwoFactorSetupProps) {
  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');

  useEffect(() => {
    initializeSetup();
  }, []);

  const initializeSetup = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to initialize 2FA setup');
      }

      const data = await response.json();
      setSetupData(data);
    } catch (error) {
      setError('Failed to initialize 2FA setup. Please try again.');
      console.error('2FA setup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a 6-digit verification code');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: verificationCode,
          enable: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Verification failed');
      }

      setStep('backup');
      toast({
        title: '2FA Enabled Successfully',
        description: 'Two-factor authentication has been enabled for your account.',
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    if (!setupData?.backupCodes) return;

    const content = `SecureShare - Two-Factor Authentication Backup Codes
Generated: ${new Date().toLocaleString()}

Keep these backup codes safe. You can use them to access your account if you lose your authenticator device.
Each code can only be used once.

${setupData.backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}

Important Notes:
- Store these codes in a secure location
- Each code can only be used once
- Generate new codes if you suspect they've been compromised
- Don't share these codes with anyone`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `secureshare-backup-codes-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const finishSetup = () => {
    onSetupComplete?.();
  };

  if (isLoading && !setupData) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Setting up 2FA...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Enable Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account
        </CardDescription>
      </CardHeader>

      <CardContent>
        {step === 'setup' && setupData && (
          <Tabs defaultValue="qr" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="qr">QR Code</TabsTrigger>
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            </TabsList>

            <TabsContent value="qr" className="space-y-4">
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Scan this QR code with your authenticator app
                </p>
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <QRCodeSVG value={setupData.qrCodeUrl} size={200} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Compatible with Google Authenticator, Authy, Microsoft Authenticator, etc.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <Alert>
                <Key className="h-4 w-4" />                <AlertDescription>
                  If you can&apos;t scan the QR code, manually enter this secret key in your authenticator app:
                </AlertDescription>
              </Alert>
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-mono text-sm break-all">{setupData.secret}</p>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <h3 className="text-lg font-semibold">Verify Your Setup</h3>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code from your authenticator app to verify the setup
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-lg font-mono"
                  maxLength={6}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}

        {step === 'backup' && setupData && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <h3 className="text-lg font-semibold">2FA Enabled Successfully!</h3>
              <p className="text-sm text-muted-foreground">
                Save your backup codes in a secure location
              </p>
            </div>

            <Alert>
              <Download className="h-4 w-4" />
              <AlertDescription>
                Keep these backup codes safe. You can use them to access your account if you lose your authenticator device.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
              {setupData.backupCodes.map((code, index) => (
                <div key={index} className="font-mono text-sm text-center p-2 bg-background rounded">
                  {code}
                </div>
              ))}
            </div>

            <Button
              onClick={downloadBackupCodes}
              variant="outline"
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Backup Codes
            </Button>
          </div>
        )}

        <div className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>

          {step === 'setup' && (
            <Button
              onClick={() => setStep('verify')}
              disabled={!setupData}
            >
              Continue
            </Button>
          )}

          {step === 'verify' && (
            <Button
              onClick={verifyAndEnable}
              disabled={isLoading || verificationCode.length !== 6}
            >
              {isLoading ? 'Verifying...' : 'Verify & Enable'}
            </Button>
          )}

          {step === 'backup' && (
            <Button onClick={finishSetup}>
              Complete Setup
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
