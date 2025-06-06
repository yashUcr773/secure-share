"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderOpen, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewFolderPage() {
  const router = useRouter();
  const [folderName, setFolderName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!folderName.trim()) {
      setError("Folder name is required");
      return;
    }

    setIsCreating(true);
    setError("");    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          description: description || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push("/dashboard/folders");
      } else {
        throw new Error(data.error || 'Failed to create folder');
      }
    } catch (error) {
      console.error("Failed to create folder:", error);
      setError(error instanceof Error ? error.message : "Failed to create folder. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/folders">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Folders
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FolderOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Create New Folder</CardTitle>
                <CardDescription>
                  Organize your files by creating folders
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="folderName">Folder Name *</Label>
                <Input
                  id="folderName"
                  placeholder="Enter folder name"
                  value={folderName}
                  onChange={(e) => {
                    setFolderName(e.target.value);
                    setError("");
                  }}
                  maxLength={50}
                />
                <p className="text-sm text-muted-foreground">
                  {folderName.length}/50 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="Enter folder description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={100}
                />
                <p className="text-sm text-muted-foreground">
                  {description.length}/100 characters
                </p>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={isCreating || !folderName.trim()}>
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Create Folder
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/dashboard/folders">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tips for Organizing Files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <div>
                <p className="font-medium">Use descriptive names</p>
                <p className="text-sm text-muted-foreground">
                  Choose clear, specific names that will make sense later
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <div>
                <p className="font-medium">Group related files</p>
                <p className="text-sm text-muted-foreground">
                  Keep files that belong together in the same folder
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
              <div>
                <p className="font-medium">Add descriptions</p>
                <p className="text-sm text-muted-foreground">
                  Brief descriptions help you remember what&apos;s in each folder
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
