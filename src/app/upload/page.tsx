"use client";

export const dynamic = 'force-dynamic';

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Lock, Eye, EyeOff, Copy, Check } from "lucide-react";
import { FileEncryption } from "@/lib/crypto";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useCSRF } from "@/hooks/useCSRF";
import { useEnhancedToast } from "@/hooks/useEnhancedToast";
import { validateFileSize, validateFileType } from "@/lib/errors";
import { config } from "@/lib/config";

export default function UploadPage() {
  const { csrfFetch } = useCSRF();
  const { showError, fileUploadSuccess, fileUploadError, fileCopySuccess } = useEnhancedToast();
  const [file, setFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      setFile(files[0]);
      // Read file content for text files
      const reader = new FileReader();
      reader.onload = (e) => {
        setTextContent(e.target?.result as string || "");
      };
      reader.readAsText(files[0]);
    }
  }, []);
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      try {
        // Validate file size and type
        validateFileSize(selectedFile, config.maxFileSize);
        validateFileType(selectedFile, ['.txt', '.md', '.json', '.csv', '.xml', '.log']);
        
        setFile(selectedFile);
        // Read file content for text files
        const reader = new FileReader();
        reader.onload = (e) => {
          setTextContent(e.target?.result as string || "");
        };
        reader.onerror = () => {
          showError("Failed to read file content");
        };
        reader.readAsText(selectedFile);
      } catch (error) {
        showError(error);
      }
    }
  };
  const handleUpload = async () => {
    if (!textContent.trim()) return;
    
    setIsUploading(true);
    
    try {
      let encryptionResult;
      
      if (password.trim()) {
        // Encrypt with password
        encryptionResult = await FileEncryption.encryptWithPassword(textContent, password);
      } else {
        // Encrypt with random key
        encryptionResult = await FileEncryption.encryptWithRandomKey(textContent);
      }
        // Upload to API
      const response = await csrfFetch('/api/upload', {
        method: 'POST',
        body: JSON.stringify({
          encryptedContent: encryptionResult.encryptedContent,
          salt: 'salt' in encryptionResult ? encryptionResult.salt : null,
          iv: encryptionResult.iv,
          key: 'key' in encryptionResult ? encryptionResult.key : null,
          shareId: encryptionResult.shareId,
          fileName: file?.name || 'pasted-text.txt',
          fileSize: new Blob([textContent]).size,
          isPasswordProtected: !!password.trim(),
        }),
      });
      
      const result = await response.json();      if (result.success) {
        setShareLink(result.shareUrl);
        fileUploadSuccess(file?.name || 'pasted-text.txt');
      } else {
        console.error('Upload failed:', result.error);
        fileUploadError(result.error || "An error occurred while uploading your file.", file?.name);
      }
    } catch (error) {
      console.error('Encryption/upload error:', error);
      fileUploadError(error, file?.name);
    } finally {
      setIsUploading(false);
    }
  };  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      fileCopySuccess();
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      showError(error, "Copy failed");
    }
  };

  const resetForm = () => {
    setFile(null);
    setTextContent("");
    setPassword("");
    setShareLink("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  if (shareLink) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <div className="bg-green-100 dark:bg-green-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold">File Shared Successfully!</h1>
            <p className="text-muted-foreground">
              Your file has been encrypted and uploaded. Share this link with anyone.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Your Share Link</CardTitle>
              <CardDescription>
                This link will allow others to access your encrypted file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input value={shareLink} readOnly />
                <Button onClick={copyToClipboard} variant="outline">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex gap-4 justify-center">
                <Button onClick={resetForm} variant="outline">
                  Share Another File
                </Button>
                <Button asChild>
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Upload & Share</h1>
          <p className="text-muted-foreground">
            Encrypt your files locally and share them securely
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select File or Paste Text</CardTitle>
            <CardDescription>
              Files are encrypted in your browser before upload
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                isDragging 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">
                {file ? file.name : "Drop files here or click to upload"}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Text files up to 2MB • Encrypted in your browser
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".txt,.md,.json,.csv,.xml,.log"
                onChange={handleFileSelect}
              />
            </div>

            {/* Text Content Area */}
            <div className="space-y-2">
              <Label htmlFor="content">Or paste your text content</Label>
              <textarea
                id="content"
                className="w-full h-32 px-3 py-2 border border-input bg-background rounded-md text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Paste your text here..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
              />
            </div>

            {/* Password Protection */}
            <div className="space-y-2">
              <Label htmlFor="password">Password Protection (Optional)</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter a password to encrypt the file"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              <p className="text-xs text-muted-foreground">
                If no password is provided, a random encryption key will be generated
              </p>
            </div>

            {/* Upload Button */}
            <Button 
              onClick={handleUpload} 
              className="w-full" 
              size="lg"
              disabled={(!file && !textContent.trim()) || isUploading}
            >
              {isUploading ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Encrypting & Uploading...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Encrypt & Share
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
