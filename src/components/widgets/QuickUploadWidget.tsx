'use client';

import { WidgetWrapper } from './WidgetWrapper';
import { Button } from '@/components/ui/button';
import { Upload, FolderOpen } from 'lucide-react';
import { Widget } from '@/lib/widgets';

interface QuickUploadWidgetProps {
  widget: Widget;
  onUpdate?: (widget: Widget) => void;
  onRemove?: (widgetId: string) => void;
  onToggleVisibility?: (widgetId: string, isVisible: boolean) => void;
  onUpload?: () => void;
}

export function QuickUploadWidget({ 
  widget, 
  onUpdate, 
  onRemove, 
  onToggleVisibility,
  onUpload
}: QuickUploadWidgetProps) {
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Handle file upload
      onUpload?.();
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      // Handle file drop
      onUpload?.();
    }
  };

  return (
    <WidgetWrapper 
      widget={widget}
      onUpdate={onUpdate}
      onRemove={onRemove}
      onToggleVisibility={onToggleVisibility}
    >
      <div 
        className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => document.getElementById('quick-upload-input')?.click()}
      >
        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground text-center mb-2">
          Drop files here or click to upload
        </p>
        <Button variant="outline" size="sm">
          <FolderOpen className="mr-2 h-4 w-4" />
          Browse Files
        </Button>
        
        <input
          id="quick-upload-input"
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </WidgetWrapper>
  );
}
