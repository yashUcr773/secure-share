"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, Copy, Check, ExternalLink, Eye, Download, Trash2, Search } from "lucide-react";
import Link from "next/link";

interface SharedLink {
  id: string;
  fileName: string;
  shareUrl: string;
  createdAt: string;
  expiresAt?: string;
  views: number;
  downloads: number;
  isPasswordProtected: boolean;
  isActive: boolean;
}

export default function SharedLinksPage() {
  const [sharedLinks, setSharedLinks] = useState<SharedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchSharedLinks();
  }, []);

  const fetchSharedLinks = async () => {
    try {
      // Simulate API call - replace with actual API
      setTimeout(() => {
        setSharedLinks([
          {
            id: "1",
            fileName: "project-proposal.txt",
            shareUrl: `${window.location.origin}/share/abc123`,
            createdAt: "2024-01-15T10:00:00Z",
            expiresAt: "2024-02-15T10:00:00Z",
            views: 25,
            downloads: 8,
            isPasswordProtected: true,
            isActive: true,
          },
          {
            id: "2",
            fileName: "meeting-notes.txt",
            shareUrl: `${window.location.origin}/share/def456`,
            createdAt: "2024-01-10T14:30:00Z",
            views: 12,
            downloads: 3,
            isPasswordProtected: false,
            isActive: true,
          },
          {
            id: "3",
            fileName: "expired-document.txt",
            shareUrl: `${window.location.origin}/share/ghi789`,
            createdAt: "2023-12-01T09:15:00Z",
            expiresAt: "2023-12-31T23:59:59Z",
            views: 45,
            downloads: 15,
            isPasswordProtected: true,
            isActive: false,
          },
        ]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Failed to fetch shared links:", error);
      setLoading(false);
    }
  };

  const filteredLinks = sharedLinks.filter(link =>
    link.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const copyToClipboard = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const handleDelete = async (linkId: string) => {
    if (!confirm("Are you sure you want to delete this shared link?")) return;
    
    try {
      // Replace with actual API call
      setSharedLinks(sharedLinks.filter(l => l.id !== linkId));
    } catch (error) {
      console.error("Failed to delete shared link:", error);
    }
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Shared Links</h1>
          <p className="text-muted-foreground">
            Manage and monitor all your shared file links
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shared links..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{sharedLinks.filter(l => l.isActive).length}</div>
              <div className="text-sm text-muted-foreground">Active Links</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{sharedLinks.reduce((sum, l) => sum + l.views, 0)}</div>
              <div className="text-sm text-muted-foreground">Total Views</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{sharedLinks.reduce((sum, l) => sum + l.downloads, 0)}</div>
              <div className="text-sm text-muted-foreground">Total Downloads</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{sharedLinks.filter(l => !l.isActive || isExpired(l.expiresAt)).length}</div>
              <div className="text-sm text-muted-foreground">Expired/Inactive</div>
            </CardContent>
          </Card>
        </div>

        {/* Shared Links List */}
        {filteredLinks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Share2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No shared links found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm 
                  ? "Try adjusting your search terms" 
                  : "Upload and share files to see your shared links here"
                }
              </p>
              <Button asChild>
                <Link href="/upload">Upload & Share File</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredLinks.map((link) => {
              const expired = isExpired(link.expiresAt);
              const inactive = !link.isActive || expired;
              
              return (
                <Card key={link.id} className={`${inactive ? 'opacity-60' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`p-2 rounded-lg ${inactive ? 'bg-muted' : 'bg-primary/10'}`}>
                          <Share2 className={`h-6 w-6 ${inactive ? 'text-muted-foreground' : 'text-primary'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{link.fileName}</h3>
                            {link.isPasswordProtected && (
                              <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded">
                                Protected
                              </span>
                            )}
                            {inactive && (
                              <span className="px-2 py-1 bg-destructive/10 text-destructive text-xs rounded">
                                {expired ? 'Expired' : 'Inactive'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Created {formatDate(link.createdAt)}</span>
                            {link.expiresAt && (
                              <span>Expires {formatDate(link.expiresAt)}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {link.views} views
                            </span>
                            <span className="flex items-center gap-1">
                              <Download className="h-3 w-3" />
                              {link.downloads} downloads
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(link.shareUrl, link.id)}
                          >
                            {copiedId === link.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button size="sm" variant="ghost" asChild>
                            <a href={link.shareUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleDelete(link.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
