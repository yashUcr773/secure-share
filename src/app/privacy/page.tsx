"use client";

export const dynamic = 'force-dynamic';

import { Header } from "@/components/Header";
import { Shield } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <Header />
      
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
            <p className="text-xl text-muted-foreground">
              How we protect and handle your data
            </p>
            <p className="text-sm text-muted-foreground">
              Last updated: December 2024
            </p>
          </div>

          <div className="space-y-8">
            <section className="bg-card border rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Zero-Knowledge Architecture
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  SecureShare is built on a zero-knowledge architecture, meaning we cannot access your files or passwords even if we wanted to. All encryption and decryption happens in your browser using client-side JavaScript.
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Files are encrypted in your browser before being uploaded</li>
                  <li>Encryption keys never leave your device</li>
                  <li>We only store encrypted data that we cannot decrypt</li>
                  <li>No passwords or sensitive data are transmitted in plain text</li>
                </ul>
              </div>
            </section>

            <section className="bg-card border rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
              <div className="space-y-4 text-muted-foreground">
                <h3 className="text-lg font-medium text-foreground">Account Information</h3>
                <p>When you create an account, we collect:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Email address (for account creation and notifications)</li>
                  <li>Username (for account identification)</li>
                  <li>Account creation and last login timestamps</li>
                </ul>

                <h3 className="text-lg font-medium text-foreground">File Metadata</h3>
                <p>For uploaded files, we store minimal metadata:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>File name (encrypted)</li>
                  <li>File size</li>
                  <li>Upload timestamp</li>
                  <li>Expiration date (if set)</li>
                  <li>Download count</li>
                </ul>

                <h3 className="text-lg font-medium text-foreground">Usage Analytics</h3>
                <p>We collect anonymous usage statistics to improve our service:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Page views and feature usage</li>
                  <li>Error logs (without personal data)</li>
                  <li>Performance metrics</li>
                </ul>
              </div>
            </section>

            <section className="bg-card border rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>We use collected information solely to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Provide and maintain the SecureShare service</li>
                  <li>Authenticate your account and authorize access</li>
                  <li>Send important service notifications</li>
                  <li>Improve our service through anonymous analytics</li>
                  <li>Comply with legal obligations</li>
                </ul>
                <p className="font-medium text-foreground">
                  We never sell, rent, or share your personal information with third parties for marketing purposes.
                </p>
              </div>
            </section>

            <section className="bg-card border rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
              <div className="space-y-4 text-muted-foreground">
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Files are automatically deleted after their expiration date</li>
                  <li>Account data is retained while your account is active</li>
                  <li>Deleted accounts are permanently removed within 30 days</li>
                  <li>Anonymous analytics data may be retained indefinitely</li>
                </ul>
              </div>
            </section>

            <section className="bg-card border rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>You have the right to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Access your personal data</li>
                  <li>Correct inaccurate information</li>
                  <li>Delete your account and associated data</li>
                  <li>Export your data</li>
                  <li>Withdraw consent for data processing</li>
                </ul>
                <p>
                  To exercise these rights, contact us at privacy@secureshare.example.com
                </p>
              </div>
            </section>

            <section className="bg-card border rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-4">Security Measures</h2>
              <div className="space-y-4 text-muted-foreground">
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Industry-standard encryption (AES-256)</li>
                  <li>Secure HTTPS connections for all communications</li>
                  <li>Regular security audits and updates</li>
                  <li>Limited access to data by authorized personnel only</li>
                  <li>Secure data centers with physical security measures</li>
                </ul>
              </div>
            </section>

            <section className="bg-card border rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  If you have questions about this Privacy Policy or our data practices, please contact us:
                </p>
                <ul className="space-y-1">
                  <li>Email: privacy@secureshare.example.com</li>
                  <li>Address: [Your Company Address]</li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
