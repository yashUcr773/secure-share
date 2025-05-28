"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent,  CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderOpen, Plus, Search, MoreHorizontal, FileText, Trash2 } from "lucide-react";
import Link from "next/link";

interface Folder {
  id: string;
  name: string;
  description?: string;
  fileCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function FoldersPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Simulate API call - replace with actual API
    setTimeout(() => {
      setFolders([
        {
          id: "1",
          name: "Documents",
          description: "Important documents and files",
          fileCount: 12,
          createdAt: "2024-01-15T10:00:00Z",
          updatedAt: "2024-01-20T15:30:00Z",
        },
        {
          id: "2",
          name: "Projects",
          description: "Project-related files and resources",
          fileCount: 8,
          createdAt: "2024-01-10T09:15:00Z",
          updatedAt: "2024-01-18T14:20:00Z",
        },
        {
          id: "3",
          name: "Personal",
          fileCount: 5,
          createdAt: "2024-01-05T16:45:00Z",
          updatedAt: "2024-01-12T11:10:00Z",
        },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    folder.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("Are you sure you want to delete this folder? This action cannot be undone.")) {
      return;
    }
    
    try {
      // Replace with actual API call
      setFolders(folders.filter(f => f.id !== folderId));
    } catch (error) {
      console.error("Failed to delete folder:", error);
    }
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Folders</h1>
            <p className="text-muted-foreground">
              Organize your files into folders for better management
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/folders/new">
              <Plus className="h-4 w-4 mr-2" />
              New Folder
            </Link>
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search folders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Folders Grid */}
        {filteredFolders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No folders found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm 
                  ? "Try adjusting your search terms" 
                  : "Create your first folder to organize your files"
                }
              </p>
              <Button asChild>
                <Link href="/dashboard/folders/new">Create Folder</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFolders.map((folder) => (
              <Card key={folder.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FolderOpen className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{folder.name}</CardTitle>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          {folder.fileCount} files
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {folder.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {folder.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Created {formatDate(folder.createdAt)}</span>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => handleDeleteFolder(folder.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
