"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, Phone, MapPin, Send, Check, Lightbulb, Heart, Bug } from "lucide-react";
import { useCSRF } from "@/hooks/useCSRF";
import { useEnhancedToast } from "@/hooks/useEnhancedToast";

export default function ContactPage() {
  const { csrfFetch } = useCSRF();
  const { showSuccess, showError } = useEnhancedToast();  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    type: "general", // general, feedback, feature, bug
    priority: "medium"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState("contact");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await csrfFetch('/api/contact', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
        showSuccess(
          "Message sent successfully!",
          "We'll get back to you within 24 hours."
        );
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      showError(error, "Failed to send message");
    } finally {
      setIsSubmitting(false);
    }
  };
  const resetForm = () => {
    setFormData({ name: "", email: "", subject: "", message: "", type: "general", priority: "medium" });
    setIsSubmitted(false);
    setActiveTab("contact");
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <Header />
        
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <div className="bg-green-100 dark:bg-green-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>              <h1 className="text-3xl font-bold">
                {formData.type === "feedback" ? "Feedback Received!" :
                 formData.type === "feature" ? "Feature Request Submitted!" :
                 formData.type === "bug" ? "Bug Report Submitted!" :
                 "Message Sent Successfully!"}
              </h1>
              <p className="text-muted-foreground">
                {formData.type === "feedback" ? "Thank you for your valuable feedback! We appreciate you taking the time to help us improve." :
                 formData.type === "feature" ? "Thank you for your feature request! Our product team will review it and consider it for future updates." :
                 formData.type === "bug" ? "Thank you for reporting this bug! Our development team will investigate and work on a fix." :
                 "Thank you for contacting us. We'll get back to you within 24 hours."}
              </p>
            </div>            <Button onClick={resetForm} variant="outline">
              {formData.type === "feedback" ? "Send More Feedback" :
               formData.type === "feature" ? "Submit Another Request" :
               formData.type === "bug" ? "Report Another Bug" :
               "Send Another Message"}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <Header />
      
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <h1 className="text-4xl font-bold tracking-tight">Contact Us</h1>
            <p className="text-xl text-muted-foreground">
              Get in touch with our team
            </p>
          </div>          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form with Tabs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Get in Touch
                </CardTitle>
                <CardDescription>
                  Choose the type of inquiry and we&apos;ll route it to the right team.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="contact" className="text-xs">
                      <Mail className="h-4 w-4 mr-1" />
                      Contact
                    </TabsTrigger>
                    <TabsTrigger value="feedback" className="text-xs">
                      <Heart className="h-4 w-4 mr-1" />
                      Feedback
                    </TabsTrigger>
                    <TabsTrigger value="feature" className="text-xs">
                      <Lightbulb className="h-4 w-4 mr-1" />
                      Features
                    </TabsTrigger>
                    <TabsTrigger value="bug" className="text-xs">
                      <Bug className="h-4 w-4 mr-1" />
                      Bug Report
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="contact" className="mt-6">
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-blue-500" />
                        <h3 className="font-semibold">General Inquiry</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Have a question about our service, billing, or need technical support? Send us a message and we&apos;ll get back to you promptly.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="feedback" className="mt-6">
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center gap-2">
                        <Heart className="h-5 w-5 text-pink-500" />
                        <h3 className="font-semibold">Share Your Feedback</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        We value your opinion! Tell us what you love about SecureShare, what could be improved, or share your experience with our service.
                      </p>
                      <div className="flex gap-2">
                        <Badge variant="secondary">User Experience</Badge>
                        <Badge variant="secondary">Performance</Badge>
                        <Badge variant="secondary">Design</Badge>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="feature" className="mt-6">
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-yellow-500" />
                        <h3 className="font-semibold">Request a Feature</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Have an idea that would make SecureShare even better? We&apos;re always looking to improve and would love to hear your suggestions!
                      </p>
                      <div className="flex gap-2">
                        <Badge variant="outline">New Features</Badge>
                        <Badge variant="outline">Integrations</Badge>
                        <Badge variant="outline">UI/UX</Badge>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="bug" className="mt-6">
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center gap-2">
                        <Bug className="h-5 w-5 text-red-500" />
                        <h3 className="font-semibold">Report a Bug</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Found something that isn&apos;t working as expected? Help us fix it by providing detailed information about the issue.
                      </p>
                      <div className="flex gap-2">
                        <Badge variant="destructive">Critical</Badge>
                        <Badge variant="outline">Minor</Badge>
                        <Badge variant="outline">Enhancement</Badge>
                      </div>
                    </div>
                  </TabsContent>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Your full name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="your.email@example.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject *</Label>
                      <Input
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder={
                          activeTab === "feedback" ? "Your feedback about..." :
                          activeTab === "feature" ? "Feature request: " :
                          activeTab === "bug" ? "Bug: Brief description" :
                          "What's this about?"
                        }
                        required
                      />
                    </div>

                    {(activeTab === "feature" || activeTab === "bug") && (
                      <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select 
                          value={formData.priority} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value, type: activeTab }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                Low Priority
                              </div>
                            </SelectItem>
                            <SelectItem value="medium">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                Medium Priority
                              </div>
                            </SelectItem>
                            <SelectItem value="high">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                High Priority
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="message">
                        {activeTab === "feedback" ? "Your Feedback *" :
                         activeTab === "feature" ? "Feature Description *" :
                         activeTab === "bug" ? "Bug Details *" :
                         "Message *"}
                      </Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value, type: activeTab }))}
                        className="h-32 resize-none"
                        placeholder={
                          activeTab === "feedback" ? "Tell us what you think about SecureShare..." :
                          activeTab === "feature" ? "Describe the feature you'd like to see. Include details about how it would help you..." :
                          activeTab === "bug" ? "Please describe the bug, steps to reproduce it, and what you expected to happen..." :
                          "Tell us more about your inquiry..."
                        }
                        required
                      />
                    </div>

                    {activeTab === "bug" && (
                      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                        <h4 className="font-medium text-sm">Help us help you faster:</h4>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li>• What browser and version are you using?</li>
                          <li>• What were you trying to do when the bug occurred?</li>
                          <li>• Can you reproduce the issue consistently?</li>
                          <li>• Include any error messages you saw</li>
                        </ul>
                      </div>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full" 
                      size="lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Send className="h-4 w-4 mr-2 animate-pulse" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          {activeTab === "feedback" ? "Send Feedback" :
                           activeTab === "feature" ? "Submit Feature Request" :
                           activeTab === "bug" ? "Report Bug" :
                           "Send Message"}
                        </>
                      )}
                    </Button>
                  </form>
                </Tabs>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <div className="space-y-8">
              {/* Contact Methods */}
              <Card>
                <CardHeader>
                  <CardTitle>Get in Touch</CardTitle>
                  <CardDescription>
                    We&apos;re here to help with any questions or concerns you may have.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Email Support</h3>
                      <p className="text-muted-foreground">support@secureshare.example.com</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Response within 24 hours
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Phone Support</h3>
                      <p className="text-muted-foreground">+1 (555) 123-4567</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Mon-Fri, 9 AM - 6 PM EST
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Office Address</h3>
                      <p className="text-muted-foreground">
                        123 Security Street<br />
                        Suite 456<br />
                        San Francisco, CA 94102
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* FAQ Links */}              <Card>
                <CardHeader>
                  <CardTitle>Quick Help</CardTitle>
                  <CardDescription>
                    Common questions and helpful resources
                  </CardDescription>
                </CardHeader>                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Link href="/privacy" className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <h4 className="font-medium">How does encryption work?</h4>
                      <p className="text-sm text-muted-foreground">Learn about our zero-knowledge security</p>
                    </Link>
                    <Link href="/pricing" className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <h4 className="font-medium">File size limits</h4>
                      <p className="text-sm text-muted-foreground">Understanding storage and upload limits</p>
                    </Link>
                    <Link href="/terms" className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <h4 className="font-medium">Sharing and permissions</h4>
                      <p className="text-sm text-muted-foreground">How to control file access</p>
                    </Link>
                    <Link href="/dashboard/settings" className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <h4 className="font-medium">Account management</h4>
                      <p className="text-sm text-muted-foreground">Managing your SecureShare account</p>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Community & Feedback */}
              <Card>
                <CardHeader>
                  <CardTitle>Community & Feedback</CardTitle>
                  <CardDescription>
                    Join our community and help shape the future of SecureShare
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg border bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Heart className="h-4 w-4 text-pink-500" />
                        <h4 className="font-medium">User Feedback</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Share your experience and help us improve SecureShare
                      </p>
                    </div>
                    <div className="p-3 rounded-lg border bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        <h4 className="font-medium">Feature Requests</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Suggest new features and improvements
                      </p>
                    </div>
                    <div className="p-3 rounded-lg border bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Bug className="h-4 w-4 text-red-500" />
                        <h4 className="font-medium">Bug Reports</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Help us fix issues and improve stability
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Business Inquiries */}
              <Card>
                <CardHeader>
                  <CardTitle>Business & Enterprise</CardTitle>
                  <CardDescription>
                    Custom solutions for teams and organizations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Need a custom deployment or enterprise features? Our business team can help you with:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mb-4">
                    <li>On-premise installations</li>
                    <li>Custom storage limits</li>
                    <li>Advanced user management</li>
                    <li>SLA agreements</li>
                  </ul>
                  <Button variant="outline" className="w-full">
                    <Mail className="h-4 w-4 mr-2" />
                    Contact Sales Team
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
