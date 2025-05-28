import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Upload, Shield, Share2, FolderOpen, Lock, Eye } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">SecureShare</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Share Files <span className="text-primary">Securely</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Upload, encrypt, and share your files with zero-knowledge security. 
              Your data stays private with client-side encryption.
            </p>
          </div>

          {/* Quick Upload Section */}
          <div className="bg-card border rounded-lg p-8 shadow-sm">
            <h2 className="text-2xl font-semibold mb-4">Quick Share</h2>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">Drop files here or click to upload</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Text files up to 2MB • Encrypted in your browser
                </p>
              </div>
              <div className="flex gap-4 justify-center">
                <Button size="lg" className="gap-2" asChild>
                  <Link href="/upload">
                    <Upload className="h-4 w-4" />
                    Upload File
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="gap-2" asChild>
                  <Link href="/upload">
                    <Share2 className="h-4 w-4" />
                    Paste Text
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="text-center space-y-4">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Zero-Knowledge Encryption</h3>
              <p className="text-muted-foreground">
                Files are encrypted in your browser. We never see your data or passwords.
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <Share2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Easy Sharing</h3>
              <p className="text-muted-foreground">
                Generate secure links instantly. Share with anyone, anywhere.
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <FolderOpen className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Organized Storage</h3>
              <p className="text-muted-foreground">
                Create folders, organize files, and manage your shared content.
              </p>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="bg-muted/50 rounded-lg p-8 mt-16">
            <h3 className="text-2xl font-semibold mb-6">Why Choose SecureShare?</h3>
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div className="flex items-start gap-3">
                <Eye className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Password Protection</h4>
                  <p className="text-sm text-muted-foreground">Add optional passwords for extra security</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Share2 className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Public Links</h4>
                  <p className="text-sm text-muted-foreground">Share files without requiring accounts</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FolderOpen className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">File Organization</h4>
                  <p className="text-sm text-muted-foreground">Nested folders and hierarchical structure</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Client-Side Encryption</h4>
                  <p className="text-sm text-muted-foreground">AES encryption happens in your browser</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background/95 backdrop-blur">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-semibold">SecureShare</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
