'use client';

import { WidgetWrapper } from './WidgetWrapper';
import { Progress } from '@/components/ui/progress';
import { HardDrive, Files } from 'lucide-react';
import { Widget } from '@/lib/widgets';

interface StorageUsageWidgetProps {
  widget: Widget & { 
    data: {
      totalSize: number;
      fileCount: number;
      storageLimit: number;
      usagePercentage: number;
      formattedSize: string;
      formattedLimit: string;
    }
  };
  onUpdate?: (widget: Widget) => void;
  onRemove?: (widgetId: string) => void;
  onToggleVisibility?: (widgetId: string, isVisible: boolean) => void;
}

export function StorageUsageWidget({ 
  widget, 
  onUpdate, 
  onRemove, 
  onToggleVisibility 
}: StorageUsageWidgetProps) {
  const { data } = widget;

  return (
    <WidgetWrapper 
      widget={widget}
      onUpdate={onUpdate}
      onRemove={onRemove}
      onToggleVisibility={onToggleVisibility}
    >
      <div className="space-y-4">
        {/* Storage Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Storage Used</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {data.formattedSize} / {data.formattedLimit}
            </span>
          </div>
          <Progress value={data.usagePercentage} className="h-2" />
          {widget.config.showPercentage && (
            <p className="text-xs text-muted-foreground text-center">
              {data.usagePercentage.toFixed(1)}% used
            </p>
          )}
        </div>

        {/* File Count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Files className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Total Files</span>
          </div>
          <span className="text-sm font-medium">{data.fileCount}</span>
        </div>

        {/* Storage Status */}
        <div className="pt-2 border-t">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              data.usagePercentage < 70 ? 'bg-green-500' :
              data.usagePercentage < 90 ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className="text-xs text-muted-foreground">
              {data.usagePercentage < 70 ? 'Plenty of space' :
               data.usagePercentage < 90 ? 'Space getting low' : 'Nearly full'}
            </span>
          </div>
        </div>
      </div>
    </WidgetWrapper>
  );
}
