'use client';

import { WidgetWrapper } from './WidgetWrapper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { File, Calendar, Download } from 'lucide-react';
import { Widget } from '@/lib/widgets';

interface RecentFile {
  id: string;
  fileName: string;
  fileSize: number;
  formattedSize: string;
  updatedAt: Date;
  createdAt: Date;
}

interface RecentFilesWidgetProps {
  widget: Widget & { 
    data: {
      files: Array<{
        id: string;
        fileName: string;
        fileSize: number;
        formattedSize: string;
        updatedAt: Date;
        createdAt: Date;
      }>;
    }
  };
  onUpdate?: (widget: Widget) => void;
  onRemove?: (widgetId: string) => void;
  onToggleVisibility?: (widgetId: string, isVisible: boolean) => void;
}

export function RecentFilesWidget({ 
  widget, 
  onUpdate, 
  onRemove, 
  onToggleVisibility 
}: RecentFilesWidgetProps) {
  const { data } = widget;

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return new Date(date).toLocaleDateString();
  };  const getFileIcon = () => {
    // You could expand this with more specific icons
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <WidgetWrapper 
      widget={widget}
      onUpdate={onUpdate}
      onRemove={onRemove}
      onToggleVisibility={onToggleVisibility}
    >
      <div className="space-y-3">
        {data.files.length === 0 ? (
          <div className="text-center py-8">
            <File className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No files yet</p>
            <p className="text-xs text-muted-foreground">Upload your first file to get started</p>
          </div>        ) : (
          data.files.map((file: RecentFile) => (
            <div 
              key={file.id} 
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
            ><div className="flex-shrink-0">
                {getFileIcon()}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" title={file.fileName}>
                  {file.fileName}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {file.formattedSize}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(file.updatedAt)}
                  </span>
                </div>
              </div>
              
              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
        
        {data.files.length > 0 && (
          <div className="pt-2 border-t">
            <Button variant="outline" size="sm" className="w-full">
              View All Files
            </Button>
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
}
