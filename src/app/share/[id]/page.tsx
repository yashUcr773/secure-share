"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Eye, EyeOff, Download, Copy, Check } from "lucide-react";
import { FileEncryption } from "@/lib/crypto";
import { Header } from "@/components/Header";
import { useEnhancedToast } from "@/hooks/useEnhancedToast";

export default function SharePage() {
  const params = useParams();
  const { showSuccess, showError, showWarning } = useEnhancedToast();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileContent, setFileContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);  const fetchFileMetadata = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/file/${params.id}`);
      if (response.ok) {
        const metadata = await response.json();
        setFileName(metadata.fileName);
        setIsPasswordRequired(metadata.isPasswordProtected);
      } else {
        showError("File not found or has expired", "Access Denied");
        setError("File not found or expired");
      }
    } catch (err) {
      console.error("Error fetching file metadata:", err);
      showError(err, "Failed to Load File");
      setError("Failed to load file");
    } finally {
      setIsLoading(false);
    }
  }, [params.id, showError]);

  useEffect(() => {
    if (params.id) {
      fetchFileMetadata();
    }
  }, [params.id, fetchFileMetadata]);const handleDecrypt = async () => {
    if (isPasswordRequired && !password.trim()) {
      showWarning("Password Required", "Please enter the password to decrypt this file.");
      setError("Password is required");
      return;
    }

    setIsLoading(true);
    setError("");
    
    try {
      // Get encrypted content from API
      const response = await fetch(`/api/file/${params.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: password.trim() || undefined,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          showError("Incorrect password provided", "Authentication Failed");
        } else if (response.status === 404) {
          showError("File not found or has expired", "File Not Found");
        } else {
          showError("Failed to access file content", "Access Error");
        }
        throw new Error('Failed to fetch file content');
      }
      
      const { encryptedContent, salt, iv, key } = await response.json();
      
      let decryptedContent;
      
      if (isPasswordRequired) {
        // Decrypt with password
        decryptedContent = await FileEncryption.decryptWithPassword(
          encryptedContent,
          password,
          salt,
          iv
        );
      } else {
        // Decrypt with key
        decryptedContent = await FileEncryption.decryptWithKey(
          encryptedContent,
          key,
          iv
        );
      }      
      setFileContent(decryptedContent);
      setIsDecrypted(true);
      showSuccess("File Decrypted", "File has been successfully decrypted and is ready to view.");
    } catch (err) {
      console.error('Decryption error:', err);
      if (!error) { // Only show toast if we haven't already shown one above
        showError("Failed to decrypt file. Please check your password and try again.", "Decryption Failed");
      }
      setError("Failed to decrypt file. Please check your password.");
    } finally {
      setIsLoading(false);
    }
  };
  const downloadFile = () => {
    const blob = new Blob([fileContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showSuccess("Download Started", `${fileName} has been downloaded to your device.`);
  };

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(fileContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showSuccess("Content Copied", "File content has been copied to your clipboard.");
    } catch (err) {
      console.error('Failed to copy content:', err);
      showError("Failed to copy content to clipboard", "Copy Failed");
    }
  };
  if (isLoading && !isDecrypted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Loading file...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <Header />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {!isDecrypted ? (
            <div className="max-w-md mx-auto">
              <Card>
                <CardHeader className="text-center">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>Encrypted File</CardTitle>
                  <CardDescription>
                    {fileName && `File: ${fileName}`}
                    {isPasswordRequired 
                      ? " • This file is password protected"
                      : " • This file is encrypted with a random key"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isPasswordRequired && (
                    <div className="space-y-2">
                      <Label htmlFor="password">Enter Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter the file password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setError("");
                          }}
                          onKeyPress={(e) => e.key === "Enter" && handleDecrypt()}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {error && (
                        <p className="text-sm text-destructive">{error}</p>
                      )}
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleDecrypt} 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Decrypting...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Decrypt & View File
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{fileName}</h1>
                  <p className="text-muted-foreground">File decrypted successfully</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={copyContent} variant="outline">
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button onClick={downloadFile}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="p-6">
                  <pre className="whitespace-pre-wrap font-mono text-sm bg-muted p-4 rounded-md overflow-auto max-h-96">
                    {fileContent}
                  </pre>
                </CardContent>
              </Card>

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Enjoyed using SecureShare? Create your own encrypted files!
                </p>
                <Button asChild>
                  <Link href="/upload">Create Your Own Share</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
