"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Share2, Trash2, Search, Filter, MoreHorizontal, Edit, Download, Copy, Eye, Tag, Grid3X3, List } from "lucide-react";
import Link from "next/link";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
import { BulkOperations } from "@/components/ui/bulk-operations";
import { FileTags } from "@/components/ui/file-tags";
import { FilePreview } from "@/components/ui/file-preview";
import { useViewMode } from "@/contexts/ViewModeContext";
import { useEnhancedToast } from "@/hooks/useEnhancedToast";

interface FileItem {
  id: string;
  fileName: string;
  createdAt: string;
  fileSize: number;
  isPasswordProtected: boolean;
  shares: number;
  downloads: number;
  tags?: string[];
  views?: number;
}

export default function FilesPage() {
  const { viewMode } = useViewMode();
  const { showSuccess, showError } = useEnhancedToast();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("date");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [tagFilter, setTagFilter] = useState<string>("");

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch("/api/dashboard/files");
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error("Failed to fetch files:", error);
    } finally {
      setLoading(false);
    }
  };
  const filteredFiles = files
    .filter(file => {
      const matchesSearch = file.fileName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTag = !tagFilter || (file.tags && file.tags.some(tag => 
        tag.toLowerCase().includes(tagFilter.toLowerCase())
      ));
      return matchesSearch && matchesTag;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.fileName.localeCompare(b.fileName);
        case "size":
          return b.fileSize - a.fileSize;
        case "date":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const handleDelete = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;
    
    try {
      const response = await fetch(`/api/file/${fileId}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        setFiles(files.filter(f => f.id !== fileId));
        showSuccess("File deleted successfully");
      } else {
        showError("Failed to delete file");
      }
    } catch (error) {
      console.error("Failed to delete file:", error);
      showError("Failed to delete file");
    }
  };

  const handleTagsChange = async (fileId: string, newTags: string[]) => {
    try {
      const response = await fetch(`/api/files/${fileId}/tags`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tags: newTags }),
      });

      if (response.ok) {
        setFiles(files.map(f => 
          f.id === fileId ? { ...f, tags: newTags } : f
        ));
        showSuccess("Tags updated successfully");
      } else {
        showError("Failed to update tags");
      }
    } catch (error) {
      console.error("Failed to update tags:", error);
      showError("Failed to update tags");
    }
  };

  // Bulk operation handlers
  const handleSelectAll = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(filteredFiles.map(f => f.id));
    }
  };

  const handleFileSelect = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedFiles.length} files?`)) return;
    
    try {
      const deletePromises = selectedFiles.map(fileId =>
        fetch(`/api/file/${fileId}`, { method: "DELETE" })
      );
      
      await Promise.all(deletePromises);
      setFiles(files.filter(f => !selectedFiles.includes(f.id)));
      setSelectedFiles([]);
      showSuccess(`${selectedFiles.length} files deleted successfully`);
    } catch (error) {
      console.error("Failed to delete files:", error);
      showError("Failed to delete some files");
    }
  };

  const handleBulkShare = async () => {
    // Implement bulk sharing logic
    showSuccess(`Sharing ${selectedFiles.length} files`);
  };

  const handleBulkDownload = async () => {
    // Implement bulk download logic
    showSuccess(`Downloading ${selectedFiles.length} files`);
  };

  const handleBulkTag = async () => {
    // Implement bulk tagging logic
    showSuccess(`Adding tags to ${selectedFiles.length} files`);
  };

  // Get all unique tags for filtering
  const allTags = Array.from(new Set(
    files.flatMap(file => file.tags || [])
  )).sort();

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
            <h1 className="text-3xl font-bold">My Files</h1>
            <p className="text-muted-foreground">
              Manage all your uploaded files and shared links
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ViewModeToggle />
            <Button asChild>
              <Link href="/upload">Upload File</Link>
            </Button>
          </div>
        </div>

        {/* Bulk Operations */}
        <BulkOperations
          selectedFiles={selectedFiles}
          totalFiles={filteredFiles.length}
          onSelectAll={handleSelectAll}
          onClearSelection={() => setSelectedFiles([])}
          onBulkDelete={handleBulkDelete}
          onBulkShare={handleBulkShare}
          onBulkDownload={handleBulkDownload}
          onBulkTag={handleBulkTag}
        />

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            {allTags.length > 0 && (
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by tag..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All tags</SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      <div className="flex items-center gap-2">
                        <Tag className="h-3 w-3" />
                        {tag}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as "name" | "date" | "size")}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Sort by Date</SelectItem>
                <SelectItem value="name">Sort by Name</SelectItem>
                <SelectItem value="size">Sort by Size</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>        {/* Files Display */}
        {filteredFiles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No files found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm ? "Try adjusting your search terms" : "Upload your first file to get started"}
              </p>
              <Button asChild>
                <Link href="/upload">Upload File</Link>
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFiles.map((file) => (
              <Card key={file.id} className="hover:shadow-md transition-shadow group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <Checkbox
                      checked={selectedFiles.includes(file.id)}
                      onCheckedChange={() => handleFileSelect(file.id)}
                      className="mt-1"
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setPreviewFile(file)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/share/${file.id}`}>
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Link
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(file.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div 
                    className="cursor-pointer" 
                    onClick={() => setPreviewFile(file)}
                  >
                    <div className="flex flex-col items-center mb-4">
                      <div className="p-4 bg-primary/10 rounded-lg mb-3">
                        <FileText className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="font-semibold text-center truncate w-full" title={file.fileName}>
                        {file.fileName}
                      </h3>
                    </div>
                    
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <span>{formatFileSize(file.fileSize)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shares:</span>
                        <span>{file.shares}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Downloads:</span>
                        <span>{file.downloads}</span>
                      </div>
                      {file.views !== undefined && (
                        <div className="flex justify-between">
                          <span>Views:</span>
                          <span>{file.views}</span>
                        </div>
                      )}
                      <div className="text-xs">
                        {formatDate(file.createdAt)}
                      </div>
                    </div>
                  </div>
                  
                  {/* File Tags */}
                  <div className="mt-3 pt-3 border-t">
                    <FileTags
                      tags={file.tags || []}
                      onTagsChange={(newTags) => handleTagsChange(file.id, newTags)}
                    />
                  </div>
                  
                  {file.isPasswordProtected && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                      <FileText className="h-3 w-3" />
                      Password Protected
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          // List View
          <div className="space-y-2">
            {filteredFiles.map((file) => (
              <Card key={file.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={selectedFiles.includes(file.id)}
                      onCheckedChange={() => handleFileSelect(file.id)}
                    />
                    
                    <div 
                      className="flex items-center gap-4 flex-1 cursor-pointer"
                      onClick={() => setPreviewFile(file)}
                    >
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{file.fileName}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{formatDate(file.createdAt)}</span>
                          <span>{formatFileSize(file.fileSize)}</span>
                          {file.isPasswordProtected && (
                            <span className="flex items-center gap-1 text-amber-600">
                              <FileText className="h-3 w-3" />
                              Protected
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="text-center">
                          <div className="font-medium">{file.shares}</div>
                          <div className="text-xs">Shares</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{file.downloads}</div>
                          <div className="text-xs">Downloads</div>
                        </div>
                        {file.views !== undefined && (
                          <div className="text-center">
                            <div className="font-medium">{file.views}</div>
                            <div className="text-xs">Views</div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* File Tags */}
                    <div className="hidden md:block">
                      <FileTags
                        tags={file.tags || []}
                        onTagsChange={(newTags) => handleTagsChange(file.id, newTags)}
                        compact
                      />
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/share/${file.id}`}>
                          <Share2 className="h-4 w-4" />
                        </Link>
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPreviewFile(file)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(file.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {/* Mobile tags display */}
                  <div className="md:hidden mt-3 pl-10">
                    <FileTags
                      tags={file.tags || []}
                      onTagsChange={(newTags) => handleTagsChange(file.id, newTags)}
                      compact
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Enhanced File Preview Modal */}
        {previewFile && (
          <FilePreview
            file={previewFile}
            onClose={() => setPreviewFile(null)}
            onTagsChange={(newTags) => handleTagsChange(previewFile.id, newTags)}
            onDelete={() => {
              handleDelete(previewFile.id);
              setPreviewFile(null);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
