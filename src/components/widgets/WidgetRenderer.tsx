'use client';

import { Widget } from '@/lib/widgets';
import { StorageUsageWidget } from './StorageUsageWidget';
import { QuickUploadWidget } from './QuickUploadWidget';
import { RecentFilesWidget } from './RecentFilesWidget';

interface WidgetData {
  [key: string]: unknown;
}

interface StorageWidgetData extends WidgetData {
  totalSize: number;
  fileCount: number;
  storageLimit: number;
  usagePercentage: number;
  formattedSize: string;
  formattedLimit: string;
}

interface RecentFilesWidgetData extends WidgetData {
  files: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    formattedSize: string;
    updatedAt: Date;
    createdAt: Date;
  }>;
}

interface QuickUploadWidgetData extends WidgetData {
  uploadedFiles: number;
  totalSize: number;
}

interface WidgetRendererProps {
  widget: Widget & { data?: WidgetData };
  onUpdate?: (widget: Widget) => void;
  onRemove?: (widgetId: string) => void;
  onToggleVisibility?: (widgetId: string, isVisible: boolean) => void;
  onUpload?: () => void;
}

export function WidgetRenderer({ 
  widget, 
  onUpdate, 
  onRemove, 
  onToggleVisibility,
  onUpload
}: WidgetRendererProps) {  switch (widget.type) {
    case 'storage-usage':
      return (
        <StorageUsageWidget
          widget={widget as Widget & { data: StorageWidgetData }}
          onUpdate={onUpdate}
          onRemove={onRemove}
          onToggleVisibility={onToggleVisibility}
        />
      );
    
    case 'quick-upload':
      return (
        <QuickUploadWidget
          widget={widget as Widget & { data: QuickUploadWidgetData }}
          onUpdate={onUpdate}
          onRemove={onRemove}
          onToggleVisibility={onToggleVisibility}
          onUpload={onUpload}
        />
      );
    
    case 'recent-files':
      return (
        <RecentFilesWidget
          widget={widget as Widget & { data: RecentFilesWidgetData }}
          onUpdate={onUpdate}
          onRemove={onRemove}
          onToggleVisibility={onToggleVisibility}
        />
      );
    
    case 'file-stats':
      return (
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-2">{widget.title}</h3>
          <p className="text-sm text-muted-foreground">File statistics widget (placeholder)</p>
        </div>
      );
    
    case 'activity-feed':
      return (
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-2">{widget.title}</h3>
          <p className="text-sm text-muted-foreground">Activity feed widget (placeholder)</p>
        </div>
      );
    
    case 'search-shortcuts':
      return (
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-2">{widget.title}</h3>
          <p className="text-sm text-muted-foreground">Search shortcuts widget (placeholder)</p>
        </div>
      );
    
    case 'sharing-stats':
      return (
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-2">{widget.title}</h3>
          <p className="text-sm text-muted-foreground">Sharing stats widget (placeholder)</p>
        </div>
      );
    
    case 'security-status':
      return (
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-2">{widget.title}</h3>
          <p className="text-sm text-muted-foreground">Security status widget (placeholder)</p>
        </div>
      );
    
    case 'backup-status':
      return (
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-2">{widget.title}</h3>
          <p className="text-sm text-muted-foreground">Backup status widget (placeholder)</p>
        </div>
      );
    
    case 'custom-notes':
      return (
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-2">{widget.title}</h3>
          <p className="text-sm text-muted-foreground">Custom notes widget (placeholder)</p>
        </div>
      );
    
    default:
      return (
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium mb-2">Unknown Widget</h3>
          <p className="text-sm text-muted-foreground">Widget type: {widget.type}</p>
        </div>
      );
  }
}
