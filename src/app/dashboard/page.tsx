"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Upload, FolderOpen, File, Share2, Trash2, Edit, Plus, Search } from "lucide-react";


export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data - in real app, this would come from your backend
  const [files] = useState([
    {
      id: "1",
      name: "Important Document.txt",
      size: "2.1 KB",
      created: "2 hours ago",
      isPasswordProtected: true,
      shareLink: "https://secureshare.com/share/abc123"
    },
    {
      id: "2", 
      name: "Meeting Notes.md",
      size: "5.3 KB",
      created: "1 day ago",
      isPasswordProtected: false,
      shareLink: "https://secureshare.com/share/def456"
    },
    {
      id: "3",
      name: "Code Snippet.js",
      size: "1.8 KB", 
      created: "3 days ago",
      isPasswordProtected: true,
      shareLink: "https://secureshare.com/share/ghi789"
    }
  ]);

  const [folders] = useState([
    { id: "1", name: "Work Documents", fileCount: 8, created: "1 week ago" },
    { id: "2", name: "Personal", fileCount: 3, created: "2 weeks ago" },
    { id: "3", name: "Projects", fileCount: 12, created: "1 month ago" }
  ]);

  const copyShareLink = async (shareLink: string) => {
    await navigator.clipboard.writeText(shareLink);
    // TODO: Show toast notification
  };

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
            </CardContent>
          </Card>

          {/* Folders */}
          <Card>
            <CardHeader>
              <CardTitle>Folders</CardTitle>
              <CardDescription>Organize your files into folders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {folders.map((folder) => (
                  <Card key={folder.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <FolderOpen className="h-8 w-8 text-primary mt-1" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{folder.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {folder.fileCount} files
                          </p>
                          <p className="text-xs text-muted-foreground">{folder.created}</p>
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
              <div className="space-y-4">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <File className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <h3 className="font-medium">{file.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {file.size} • {file.created}
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
                        onClick={() => copyShareLink(file.shareLink)}
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
