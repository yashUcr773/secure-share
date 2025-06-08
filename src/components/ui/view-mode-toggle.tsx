"use client";

import React from "react";
import { Grid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useViewMode } from "@/contexts/ViewModeContext";

export function ViewModeToggle() {
  const { viewMode, setViewMode } = useViewMode();

  return (
    <div className="flex items-center border rounded-md">
      <Button
        variant={viewMode === "grid" ? "default" : "ghost"}
        size="sm"
        onClick={() => setViewMode("grid")}
        className="rounded-r-none border-r"
      >
        <Grid className="h-4 w-4" />
        <span className="ml-2 hidden sm:inline">Grid</span>
      </Button>
      <Button
        variant={viewMode === "list" ? "default" : "ghost"}
        size="sm"
        onClick={() => setViewMode("list")}
        className="rounded-l-none"
      >
        <List className="h-4 w-4" />
        <span className="ml-2 hidden sm:inline">List</span>
      </Button>
    </div>
  );
}
