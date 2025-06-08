"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Trash2, 
  Share2, 
  Archive, 
  Tag,
  X 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BulkOperationsProps {
  selectedFiles: string[];
  totalFiles: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkShare: () => void;
  onBulkDownload: () => void;
  onBulkTag: () => void;
}

export function BulkOperations({
  selectedFiles,
  totalFiles,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  onBulkShare,
  onBulkDownload,
  onBulkTag,
}: BulkOperationsProps) {
  const allSelected = selectedFiles.length === totalFiles && totalFiles > 0;
  const someSelected = selectedFiles.length > 0;

  if (!someSelected) {
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          checked={allSelected}
          onCheckedChange={onSelectAll}
          aria-label="Select all files"
        />
        <span className="text-sm text-muted-foreground">
          Select files for bulk operations
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-3 bg-primary/5 rounded-lg border">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={allSelected}
          onCheckedChange={allSelected ? onClearSelection : onSelectAll}
          aria-label={allSelected ? "Deselect all" : "Select all"}
        />
        <Badge variant="secondary">
          {selectedFiles.length} of {totalFiles} selected
        </Badge>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <Button
          size="sm"
          variant="outline"
          onClick={onBulkDownload}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Download
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={onBulkShare}
          className="gap-2"
        >
          <Share2 className="h-4 w-4" />
          Share
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              More Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onBulkTag}>
              <Tag className="h-4 w-4 mr-2" />
              Add Tags
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={onBulkDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
