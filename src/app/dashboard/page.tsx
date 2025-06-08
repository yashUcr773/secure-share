"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useEnhancedToast } from "@/hooks/useEnhancedToast";
import { Upload, FolderOpen, File, Share2, Trash2, Edit, Plus, Search } from "lucide-react";
import { DashboardWidgets } from "@/components/widgets/DashboardWidgets";

interface FileItem {
  id: string;
  fileName: string;
  createdAt: string;
  fileSize: number;
  isPasswordProtected: boolean;
}

interface FolderItem {
  id: string;
  name: string;
  fileCount: number;
  createdAt: string;
}

export default function DashboardPage() {
  const { fileCopySuccess, showError } = useEnhancedToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch recent files and folders
      const [filesResponse, foldersResponse] = await Promise.all([
        fetch('/api/dashboard/files'),
        fetch('/api/folders')
      ]);

      if (filesResponse.ok) {
        const filesData = await filesResponse.json();
        // Get only the 3 most recent files for dashboard
        setFiles((filesData.files || []).slice(0, 3));
      }

      if (foldersResponse.ok) {
        const foldersData = await foldersResponse.json();
        setFolders(foldersData.folders || []);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };  const copyShareLink = async (fileId: string) => {
    try {
      const shareUrl = `${window.location.origin}/share/${fileId}`;
      await navigator.clipboard.writeText(shareUrl);
      fileCopySuccess();
    } catch (error) {
      showError(error, "Failed to copy link");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
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
      <div className="p-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Manage your encrypted files and folders</p>
          </div>
          <Button asChild>
            <Link href="/upload">
              <Plus className="h-4 w-4 mr-2" />
              New Upload
            </Link>
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files and folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid gap-8">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get started with common tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-auto p-4 flex flex-col gap-2" asChild>
                  <Link href="/upload">
                    <Upload className="h-8 w-8" />
                    <span>Upload File</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
                  <FolderOpen className="h-8 w-8" />
                  <span>Create Folder</span>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex flex-col gap-2">
                  <Share2 className="h-8 w-8" />
                  <span>Share Multiple</span>
                </Button>
              </div>
            </CardContent>          </Card>

          {/* Custom Dashboard Widgets */}
          <DashboardWidgets />

          {/* Folders */}
          <Card>
            <CardHeader>
              <CardTitle>Folders</CardTitle>
              <CardDescription>Organize your files into folders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">                {folders.map((folder) => (
                  <Card key={folder.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <FolderOpen className="h-8 w-8 text-primary mt-1" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{folder.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {folder.fileCount} files
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(folder.createdAt)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Files */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Files</CardTitle>
              <CardDescription>Your recently uploaded files</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <File className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <h3 className="font-medium">{file.fileName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(file.fileSize)} • {formatDate(file.createdAt)}
                          {file.isPasswordProtected && " • Password protected"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyShareLink(file.id)}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
