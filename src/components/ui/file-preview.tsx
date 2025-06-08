"use client";

/* eslint-disable jsx-a11y/alt-text */
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Image, 
  Video, 
  Music, 
  Archive, 
  Download,
  Share2,
  Eye,
  Calendar,
  HardDrive,
  Lock,
  ExternalLink,
  Trash2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileTags } from "./file-tags";

interface FilePreviewProps {
  file: {
    id: string;
    fileName: string;
    fileSize: number;
    createdAt: string;
    isPasswordProtected: boolean;
    tags?: string[];
    shares: number;
    downloads: number;
    views?: number;
  };
  onClose: () => void;
  onShare?: () => void;
  onDownload?: () => void;
  onTagsChange?: (tags: string[]) => void;
  onDelete?: () => void;
}

export function FilePreview({ 
  file, 
  onClose, 
  onShare, 
  onDownload,
  onTagsChange,
  onDelete
}: FilePreviewProps) {
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return <Image className="h-16 w-16 text-blue-500" />;
    } else if (['mp4', 'avi', 'mov', 'wmv', 'flv'].includes(ext || '')) {
      return <Video className="h-16 w-16 text-purple-500" />;
    } else if (['mp3', 'wav', 'flac', 'aac'].includes(ext || '')) {
      return <Music className="h-16 w-16 text-green-500" />;
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) {
      return <Archive className="h-16 w-16 text-orange-500" />;
    } else {
      return <FileText className="h-16 w-16 text-gray-500" />;
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
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="truncate">{file.fileName}</span>
            {file.isPasswordProtected && (
              <Badge variant="secondary" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                Protected
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* File Icon and Basic Info */}
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              {getFileIcon(file.fileName)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-medium truncate">{file.fileName}</h3>
              <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  {formatFileSize(file.fileSize)}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(file.createdAt)}
                </div>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">File Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">{file.views || 0}</div>
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Eye className="h-3 w-3" />
                    Views
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">{file.downloads}</div>
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Download className="h-3 w-3" />
                    Downloads
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-500">{file.shares}</div>
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Share2 className="h-3 w-3" />
                    Shares
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          {onTagsChange && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <FileTags
                  tags={file.tags || []}
                  onTagsChange={onTagsChange}
                />
              </CardContent>
            </Card>
          )}          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={onDownload} className="flex-1 gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button onClick={onShare} variant="outline" className="flex-1 gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Open
            </Button>
            {onDelete && (
              <Button onClick={onDelete} variant="destructive" size="sm" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
