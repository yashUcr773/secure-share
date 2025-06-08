"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Tag } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface FileTagsProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  readOnly?: boolean;
  compact?: boolean;
}

export function FileTags({ tags, onTagsChange, readOnly = false, compact = false }: FileTagsProps) {
  const [newTag, setNewTag] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      onTagsChange([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };
  if (readOnly) {
    return (
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs">
            <Tag className="h-3 w-3 mr-1" />
            {tag}
          </Badge>
        ))}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {tags.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs">
            {tag}
          </Badge>
        ))}
        {tags.length > 2 && (
          <Badge variant="outline" className="text-xs">
            +{tags.length - 2}
          </Badge>
        )}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
              <Tag className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-3">
              <div className="text-sm font-medium">Manage Tags</div>
              
              {/* Existing tags */}
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs group">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-auto p-0 ml-1 opacity-0 group-hover:opacity-100 hover:bg-transparent"
                      onClick={() => removeTag(tag)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              
              {/* Add new tag */}
              <div className="flex gap-2">
                <Input
                  placeholder="Enter tag name"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button size="sm" onClick={addTag} disabled={!newTag.trim()}>
                  Add
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs group">
            <Tag className="h-3 w-3 mr-1" />
            {tag}
            <Button
              size="sm"
              variant="ghost"
              className="h-auto p-0 ml-1 opacity-0 group-hover:opacity-100 hover:bg-transparent"
              onClick={() => removeTag(tag)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
        
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 px-2">
              <Plus className="h-3 w-3 mr-1" />
              Add Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60" align="start">
            <div className="space-y-2">
              <div className="text-sm font-medium">Add new tag</div>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter tag name"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button size="sm" onClick={addTag} disabled={!newTag.trim()}>
                  Add
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
