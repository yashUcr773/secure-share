"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Copy, 
  ExternalLink, 
  Trash2, 
  Search, 
  MoreVertical,
  Eye,
  Download,
  Share2,
  Calendar,
  RefreshCw,
  FileText,
  Clock,
  Globe,
  Lock,
  AlertCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEnhancedToast } from "@/hooks/useEnhancedToast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SharedLink {
	id: string;
	file: {
		fileName: string;
		fileSize: number;
		isPasswordProtected: boolean;
	};
	shareUrl: string;
	createdAt: string;
	expiresAt: string;
	views: number;
	downloads: number;
}

interface ApiResponse {
  sharedLinks: SharedLink[];
  success?: boolean;
  error?: string;
}

export default function SharedLinksPage() {
  const [sharedLinks, setSharedLinks] = useState<SharedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<SharedLink | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { showError, showSuccess } = useEnhancedToast();

  const fetchSharedLinks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/dashboard/shared");
      
      if (!response.ok) {
        throw new Error(`Failed to fetch shared links: ${response.status}`);
      }      const data: ApiResponse = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setSharedLinks(data.sharedLinks || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load shared links";
      setError(errorMessage);
      showError(errorMessage, "Failed to load shared links");
    } finally {
      setLoading(false);
    }  }, [showError]);

  useEffect(() => {
    fetchSharedLinks();
  }, []); // Empty dependency array to run only on mount

  const filteredLinks = useMemo(() => {
    return sharedLinks.filter((link) => {
      if (!searchTerm.trim()) return true;
      
      const searchLower = searchTerm.toLowerCase().trim();
      const fileName = link?.file.fileName || "";
      return fileName.toLowerCase().includes(searchLower);
    });
  }, [sharedLinks, searchTerm]);

  const formatDate = useCallback((dateString: string): string => {
    if (!dateString) return "Unknown";
    
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Invalid date";
    }
  }, []);

  const copyToClipboard = useCallback(async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      showSuccess("Link copied to clipboard!");
      
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      showError("Failed to copy link");
    }
  }, [showSuccess, showError]);

  const handleDeleteLink = useCallback((link: SharedLink) => {
    setLinkToDelete(link);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!linkToDelete) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/dashboard/shared/${linkToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete shared link");
      }

      setSharedLinks(prev => prev.filter(link => link.id !== linkToDelete.id));
      showSuccess("Shared link deleted successfully");
    } catch (err) {
      showError("Failed to delete shared link");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setLinkToDelete(null);
    }
  }, [linkToDelete, showSuccess, showError]);

  const openInNewTab = useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const getFileIcon = useCallback((fileName: string) => {
    const extension = fileName?.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'mp4':
      case 'avi':
      case 'mov':
        return <FileText className="h-4 w-4 text-purple-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  }, []);

  const getStatusBadge = useCallback((link: SharedLink) => {
    if (!link.expiresAt) {
      return <Badge variant="default">Active</Badge>;
    }
    
    try {
      const now = new Date();
      const expiresAt = new Date(link.expiresAt);
      const isExpired = expiresAt < now;
      
      if (isExpired) {
        return <Badge variant="destructive">Expired</Badge>;
      }
      
      // Check if expiring soon (within 24 hours)
      const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilExpiry <= 24) {
        return <Badge variant="secondary">Expiring Soon</Badge>;
      }
      
      return <Badge variant="default">Active</Badge>;
    } catch {
      return <Badge variant="outline">Unknown</Badge>;
    }
  }, []);

  const LoadingSkeleton = useCallback(() => (
    <div className="grid gap-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  ), []);

  const EmptyState = useCallback(({ isSearch }: { isSearch: boolean }) => (
    <Card>
      <CardContent className="p-8 text-center">
        <Share2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          {isSearch ? "No matching links found" : "No shared links yet"}
        </h3>
        <p className="text-muted-foreground mb-4">
          {isSearch 
            ? "Try adjusting your search criteria"
            : "Start sharing files to see your links here"
          }
        </p>
        {isSearch && (
          <Button 
            variant="outline" 
            onClick={() => setSearchTerm("")}
          >
            Clear Search
          </Button>
        )}
      </CardContent>
    </Card>
  ), []);

  const ErrorState = useCallback(() => (
    <Card>
      <CardContent className="p-8 text-center">
        <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to load shared links</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchSharedLinks} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  ), [error, fetchSharedLinks]);

  const StatsCards = useCallback(() => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Links</p>
              <p className="text-2xl font-bold">{sharedLinks.length}</p>
            </div>
            <Share2 className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Views</p>
              <p className="text-2xl font-bold">
                {sharedLinks.reduce((sum, link) => sum + (link.views || 0), 0)}
              </p>
            </div>
            <Eye className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Downloads</p>
              <p className="text-2xl font-bold">
                {sharedLinks.reduce((sum, link) => sum + (link.downloads || 0), 0)}
              </p>
            </div>
            <Download className="h-8 w-8 text-purple-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  ), [sharedLinks]);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Shared Links</h1>
        <p className="text-muted-foreground">
          Manage your shared file links and track their usage
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shared links..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button 
          onClick={fetchSharedLinks}
          variant="outline"
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState />
      ) : (
        <>
          <StatsCards />

          {filteredLinks.length === 0 ? (
            <EmptyState isSearch={!!searchTerm.trim()} />
          ) : (
            <div className="grid gap-4">
              {filteredLinks.map((link) => (                
                <Card key={link.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {getFileIcon(link.file.fileName || "unknown")}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold truncate" title={link.file.fileName || "Unknown file"}>
                            {link.file.fileName || "Unknown file"}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Created {formatDate(link.createdAt)}</span>
                            </div>
                            {link.expiresAt && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>Expires {formatDate(link.expiresAt)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(link)}
                        {link.file.isPasswordProtected && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Protected
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="bg-muted rounded-lg p-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <code className="flex-1 text-sm font-mono truncate" title={`${window.location.protocol}//${window.location.host}/share/${link.id}`}>
                          {`${window.location.protocol}//${window.location.host}/share/${link.id}`}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(`${window.location.protocol}//${window.location.host}/share/${link.id}`, link.id)}
                          className="shrink-0"
                          title="Copy link"
                        >
                          {copiedId === link.id ? (
                            <span className="text-green-600 text-xs">Copied!</span>
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          <span>{link.views || 0} views</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Download className="h-4 w-4" />
                          <span>{link.downloads || 0} downloads</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openInNewTab(`${window.location.protocol}//${window.location.host}/share/${link.id}`)}
                          className="flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem 
                              onClick={() => copyToClipboard(`${window.location.protocol}//${window.location.host}/share/${link.id}`, link.id)}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openInNewTab(`${window.location.protocol}//${window.location.host}/share/${link.id}`)}
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open in New Tab
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteLink(link)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Link
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shared Link</AlertDialogTitle>            
            <AlertDialogDescription>
              Are you sure you want to delete the shared link for &quot;{linkToDelete?.file.fileName || "Unknown file"}&quot;? 
              This action cannot be undone and the link will no longer be accessible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Link"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
