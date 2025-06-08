"use client";

export const dynamic = 'force-dynamic';

import { Header } from "@/components/Header";
import { FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <Header />
      
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
            <p className="text-xl text-muted-foreground">
              Terms and conditions for using SecureShare
            </p>
            <p className="text-sm text-muted-foreground">
              Last updated: December 2024
            </p>
          </div>

          <div className="space-y-8">
            <section className="bg-card border rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                Acceptance of Terms
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  By accessing and using SecureShare, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>
              </div>
            </section>

            <section className="bg-card border rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-4">Service Description</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  SecureShare is a file sharing service that provides:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Client-side encryption of files before upload</li>
                  <li>Secure sharing links with optional password protection</li>
                  <li>File organization through folders and collections</li>
                  <li>Analytics and sharing management tools</li>
                </ul>
                <p>
                  The service is provided &quot;as is&quot; and we reserve the right to modify or discontinue the service at any time.
                </p>
              </div>
            </section>

            <section className="bg-card border rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-4">User Accounts</h2>
              <div className="space-y-4 text-muted-foreground">
                <h3 className="text-lg font-medium text-foreground">Account Creation</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>You must provide accurate and complete information</li>
                  <li>You are responsible for maintaining account security</li>
                  <li>One account per person; no sharing accounts</li>
                  <li>You must be at least 13 years old to create an account</li>
                </ul>

                <h3 className="text-lg font-medium text-foreground">Account Responsibilities</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Keep your login credentials secure</li>
                  <li>Notify us immediately of any unauthorized access</li>
                  <li>You are responsible for all activities under your account</li>
                  <li>Comply with all applicable laws and regulations</li>
                </ul>
              </div>
            </section>

            <section className="bg-card border rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-4">Acceptable Use</h2>
              <div className="space-y-4 text-muted-foreground">
                <h3 className="text-lg font-medium text-foreground">Permitted Uses</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Sharing personal and business documents</li>
                  <li>Collaborative work and file exchange</li>
                  <li>Backup and storage of personal files</li>
                  <li>Educational and research purposes</li>
                </ul>

                <h3 className="text-lg font-medium text-foreground">Prohibited Content</h3>
                <p>You may not upload or share content that:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Violates any laws or regulations</li>
                  <li>Infringes on intellectual property rights</li>
                  <li>Contains malware, viruses, or harmful code</li>
                  <li>Is defamatory, threatening, or harassing</li>
                  <li>Contains adult content involving minors</li>
                  <li>Promotes illegal activities or substances</li>
                  <li>Violates privacy rights of others</li>
                </ul>
              </div>
            </section>

            <section className="bg-card border rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-4">File Storage and Limits</h2>
              <div className="space-y-4 text-muted-foreground">
                <h3 className="text-lg font-medium text-foreground">Storage Limits</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Free accounts: 100MB total storage</li>
                  <li>Premium accounts: 10GB total storage</li>
                  <li>Maximum file size: 100MB per file</li>
                  <li>File retention: 30 days default, up to 1 year for premium</li>
                </ul>

                <h3 className="text-lg font-medium text-foreground">File Management</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Files are automatically deleted after expiration</li>
                  <li>We may delete files to maintain service performance</li>
                  <li>You are responsible for backing up important files</li>
                  <li>Deleted files cannot be recovered</li>
                </ul>
              </div>
            </section>

            <section className="bg-card border rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-4">Privacy and Security</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your information.
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>All files are encrypted before upload using AES-256 encryption</li>
                  <li>Encryption keys are generated in your browser and never transmitted</li>
                  <li>We cannot access your files or decrypt your content</li>
                  <li>Share links include the decryption key in the URL fragment</li>
                </ul>
              </div>
            </section>

            <section className="bg-card border rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-4">Intellectual Property</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  You retain all rights to content you upload to SecureShare. By using our service, you grant us a limited license to:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Store and transmit your encrypted files</li>
                  <li>Provide the sharing and collaboration features</li>
                  <li>Make backups for service reliability</li>
                </ul>
                <p>
                  The SecureShare platform, including all software, designs, and trademarks, remains our intellectual property.
                </p>
              </div>
            </section>

            <section className="bg-card border rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  SecureShare is provided &quot;as is&quot; without warranties of any kind. We are not liable for:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Loss of data or files</li>
                  <li>Service interruptions or downtime</li>
                  <li>Unauthorized access to your files</li>
                  <li>Damages resulting from use of the service</li>
                  <li>Third-party actions or content</li>
                </ul>
                <p>
                  Our total liability is limited to the amount you paid for the service in the past 12 months.
                </p>
              </div>
            </section>

            <section className="bg-card border rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-4">Termination</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  We may terminate or suspend your account if you:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Violate these terms of service</li>
                  <li>Upload prohibited content</li>
                  <li>Engage in abusive behavior</li>
                  <li>Fail to pay applicable fees</li>
                </ul>
                <p>
                  You may delete your account at any time through the settings page. Upon termination, all your files will be permanently deleted.
                </p>
              </div>
            </section>

            <section className="bg-card border rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-4">Changes to Terms</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  We may update these terms from time to time. We will notify you of significant changes via email or through the service. Continued use of SecureShare after changes constitutes acceptance of the new terms.
                </p>
              </div>
            </section>

            <section className="bg-card border rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  For questions about these Terms of Service, please contact us:
                </p>
                <ul className="space-y-1">
                  <li>Email: legal@secureshare.example.com</li>
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
