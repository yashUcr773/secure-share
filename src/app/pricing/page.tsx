"use client";

import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Shield, Check, Star, Zap, Users, Crown } from "lucide-react";

export default function PricingPage() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for personal use and trying out SecureShare",
      icon: Shield,
      features: [
        "100MB total storage",
        "Up to 10 files",
        "7-day file retention",
        "Basic encryption (AES-256)",
        "Public sharing links",
        "Email support"
      ],
      limitations: [
        "No password protection",
        "No custom expiration dates",
        "No analytics"
      ],
      cta: "Get Started",
      popular: false
    },
    {
      name: "Pro",
      price: "$9",
      period: "per month",
      description: "Ideal for professionals and small teams",
      icon: Zap,
      features: [
        "10GB total storage",
        "Unlimited files",
        "90-day file retention",
        "Advanced encryption options",
        "Password protection",
        "Custom expiration dates",
        "Download analytics",
        "Priority email support",
        "Folder organization",
        "Share link customization"
      ],
      limitations: [],
      cta: "Start Free Trial",
      popular: true
    },
    {
      name: "Team",
      price: "$29",
      period: "per month",
      description: "Built for teams and organizations",
      icon: Users,
      features: [
        "100GB total storage",
        "Unlimited files and folders",
        "1-year file retention",
        "Team collaboration tools",
        "Advanced user management",
        "Bulk sharing operations",
        "Detailed analytics dashboard",
        "SSO integration (coming soon)",
        "Priority phone support",
        "Custom branding",
        "API access",
        "Advanced security controls"
      ],
      limitations: [],
      cta: "Contact Sales",
      popular: false
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "pricing",
      description: "For large organizations with specific needs",
      icon: Crown,
      features: [
        "Unlimited storage",
        "On-premise deployment option",
        "Custom retention policies",
        "Advanced compliance features",
        "Dedicated account manager",
        "Custom integrations",
        "24/7 phone support",
        "SLA guarantees",
        "Advanced audit logs",
        "Custom security policies",
        "White-label solution",
        "Professional services"
      ],
      limitations: [],
      cta: "Contact Sales",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <Header />
      
      <main className="container mx-auto px-4 py-16">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl font-bold tracking-tight">Simple, Transparent Pricing</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that&apos;s right for you. All plans include our core zero-knowledge encryption.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    Most Popular
                  </div>
                </div>
              )}
              
              <CardHeader className="text-center pb-2">
                <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <plan.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="space-y-1">
                  <div className="text-3xl font-bold">
                    {plan.price}
                    {plan.price !== "Custom" && <span className="text-lg font-normal text-muted-foreground">/{plan.period}</span>}
                  </div>
                  {plan.name === "Pro" && (
                    <p className="text-sm text-muted-foreground">14-day free trial</p>
                  )}
                </div>
                <CardDescription className="text-sm">
                  {plan.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <Button 
                  className={`w-full ${plan.popular ? '' : 'variant-outline'}`}
                  variant={plan.popular ? 'default' : 'outline'}
                  asChild
                >
                  <Link href={plan.name === "Free" ? "/auth/signup" : "/contact"}>
                    {plan.cta}
                  </Link>
                </Button>
                
                <div className="space-y-3">
                  <h4 className="font-medium">Features included:</h4>
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {plan.limitations.length > 0 && (
                    <div className="pt-2">
                      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                        Not included:
                      </h4>
                      <ul className="space-y-1 text-sm text-muted-foreground mt-2">
                        {plan.limitations.map((limitation, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{limitation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-24 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          
          <div className="space-y-8">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Is there really a free plan forever?</h3>
                <p className="text-muted-foreground">
                  Yes! Our free plan is completely free forever with no hidden costs. It includes 100MB of storage 
                  and all our core security features. Perfect for personal use or trying out SecureShare.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Can I upgrade or downgrade at any time?</h3>
                <p className="text-muted-foreground">
                  Absolutely! You can upgrade or downgrade your plan at any time. Changes take effect immediately, 
                  and we&apos;ll prorate any billing adjustments.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">What happens to my files if I downgrade?</h3>
                <p className="text-muted-foreground">
                  Your files remain safe and accessible. If you exceed the storage limit of your new plan, 
                  you won&apos;t be able to upload new files until you free up space or upgrade again.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Do you offer discounts for annual billing?</h3>
                <p className="text-muted-foreground">
                  Yes! Save 20% by choosing annual billing on Pro and Team plans. Enterprise customers 
                  can discuss custom billing arrangements with our sales team.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Is my data really secure with zero-knowledge encryption?</h3>
                <p className="text-muted-foreground">
                  Yes! All encryption happens in your browser before upload. We never have access to your 
                  encryption keys, passwords, or file contents. Even our own engineers cannot decrypt your files.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center mt-16">
          <h3 className="text-2xl font-semibold mb-4">Ready to get started?</h3>
          <p className="text-muted-foreground mb-6">
            Join thousands of users who trust SecureShare for secure file sharing.
          </p>
          <Button size="lg" asChild>
            <Link href="/auth/signup">
              Start Your Free Trial
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
