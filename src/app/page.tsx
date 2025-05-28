"use client";

import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Shield, Share2, FolderOpen, Lock, Eye, CheckCircle, Star, Users, Zap, Clock, Globe } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <Header />

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="space-y-6">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                Share Files <span className="text-primary">Securely</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Upload, encrypt, and share your files with zero-knowledge security. 
                Your data stays private with client-side encryption.
              </p>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>256-bit AES Encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Zero-Knowledge Architecture</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Open Source</span>
              </div>
            </div>
          </div>

          {/* Get Started Section */}
          <div className="bg-card border rounded-lg p-8 shadow-sm">
            <h2 className="text-2xl font-semibold mb-4">Get Started Today</h2>
            <p className="text-muted-foreground mb-6">
              Join thousands of users who trust SecureShare for their file sharing needs. 
              Start with our free plan and upgrade as you grow.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="gap-2" asChild>
                <Link href="/auth/signup">
                  <Shield className="h-4 w-4" />
                  Start Free Trial
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="gap-2" asChild>
                <Link href="/auth/login">
                  <Lock className="h-4 w-4" />
                  Login
                </Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Free plan includes 100MB storage • No credit card required
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="text-center space-y-4 p-6 rounded-lg bg-card border">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Zero-Knowledge Encryption</h3>
              <p className="text-muted-foreground">
                Files are encrypted in your browser with AES-256. We never see your data, passwords, or encryption keys.
              </p>
            </div>
            
            <div className="text-center space-y-4 p-6 rounded-lg bg-card border">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Instant Sharing</h3>
              <p className="text-muted-foreground">
                Generate secure sharing links instantly. No waiting, no complex setup. Just upload and share.
              </p>
            </div>
            
            <div className="text-center space-y-4 p-6 rounded-lg bg-card border">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <Globe className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Universal Access</h3>
              <p className="text-muted-foreground">
                Share with anyone, anywhere. No accounts required for recipients. Works on all devices and browsers.
              </p>
            </div>
          </div>

          {/* Additional Features */}
          <div className="grid md:grid-cols-2 gap-8 mt-12">
            <div className="text-center space-y-4 p-6 rounded-lg bg-muted/50">
              <FolderOpen className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-lg font-semibold">Smart Organization</h3>
              <p className="text-muted-foreground">
                Create folders, tag files, and organize your content with an intuitive interface.
              </p>
            </div>
            
            <div className="text-center space-y-4 p-6 rounded-lg bg-muted/50">
              <Clock className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-lg font-semibold">Time Controls</h3>
              <p className="text-muted-foreground">
                Set expiration dates and download limits to maintain control over your shared content.
              </p>
            </div>
          </div>

          {/* Security Highlights */}
          <div className="bg-muted/50 rounded-lg p-8 mt-16">
            <h3 className="text-2xl font-semibold mb-6 text-center">Enterprise-Grade Security</h3>
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div className="flex items-start gap-3">
                <Eye className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Password Protection</h4>
                  <p className="text-sm text-muted-foreground">Add optional passwords for extra security layers</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Share2 className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Secure Public Links</h4>
                  <p className="text-sm text-muted-foreground">Share files without requiring accounts or logins</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">No Data Mining</h4>
                  <p className="text-sm text-muted-foreground">We can&apos;t see your files, so we can&apos;t use your data</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">End-to-End Encryption</h4>
                  <p className="text-sm text-muted-foreground">AES-256 encryption happens entirely in your browser</p>
                </div>
              </div>
            </div>
          </div>

          {/* Testimonials */}
          <div className="mt-16">
            <h3 className="text-2xl font-semibold mb-8 text-center">Trusted by Professionals</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">
                    &quot;SecureShare has revolutionized how we share sensitive documents with clients. 
                    The zero-knowledge encryption gives us confidence that our data is truly secure.&quot;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Sarah Chen</p>
                      <p className="text-sm text-muted-foreground">Legal Director, TechCorp</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">
                    &quot;The interface is incredibly intuitive, and knowing that even SecureShare 
                    can&apos;t access our files gives us the ultimate peace of mind.&quot;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Michael Rodriguez</p>
                      <p className="text-sm text-muted-foreground">CTO, DataFlow Inc</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">
                    &quot;Perfect for sharing design files with remote teams. Fast, secure, 
                    and works seamlessly across all platforms.&quot;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Emily Thompson</p>
                      <p className="text-sm text-muted-foreground">Design Lead, CreativeStudio</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Final CTA */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-8 mt-16 text-center">
            <h3 className="text-2xl font-semibold mb-4">Ready to Share Securely?</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join the thousands of professionals who trust SecureShare for their most sensitive file sharing needs. 
              Start your free trial today and experience true zero-knowledge security.
            </p>
            <Button size="lg" asChild>
              <Link href="/auth/signup">
                Get Started Free
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background/95 backdrop-blur mt-16">
        <div className="container py-12">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">SecureShare</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Zero-knowledge file sharing platform built for privacy and security.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>SOC 2 Compliant</span>
              </div>
            </div>

            {/* Product */}
            <div className="space-y-4">
              <h4 className="font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/auth/signup" className="hover:text-foreground transition-colors">Get Started</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link href="/upload" className="hover:text-foreground transition-colors">Upload Files</Link></li>
                <li><Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div className="space-y-4">
              <h4 className="font-semibold">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact Us</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors">Documentation</Link></li>
                <li><a href="https://status.secureshare.example.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Status Page</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-4">
              <h4 className="font-semibold">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Cookie Policy</Link></li>
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">GDPR Compliance</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 SecureShare. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Made with ❤️ for privacy</span>
              <div className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                <span>Always Encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
