'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Settings, Trash2, Eye, EyeOff } from 'lucide-react';
import { Widget } from '@/lib/widgets';

interface WidgetWrapperProps {
  widget: Widget & { data?: Record<string, unknown> };
  children: React.ReactNode;
  onUpdate?: (widget: Widget) => void;
  onRemove?: (widgetId: string) => void;
  onToggleVisibility?: (widgetId: string, isVisible: boolean) => void;
  className?: string;
}

export function WidgetWrapper({
  widget,
  children,
  onRemove,
  onToggleVisibility,
  className = ''
}: WidgetWrapperProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleToggleVisibility = () => {
    onToggleVisibility?.(widget.id, !widget.isVisible);
  };

  const handleRemove = () => {
    if (confirm('Are you sure you want to remove this widget?')) {
      onRemove?.(widget.id);
    }
  };

  if (!widget.isVisible) {
    return null;
  }

  return (
    <Card 
      className={`relative transition-all duration-200 hover:shadow-md ${className}`}
      style={{
        gridColumn: `span ${widget.size.width}`,
        gridRow: `span ${widget.size.height}`,
        minHeight: widget.size.minHeight ? `${widget.size.minHeight * 200}px` : '200px'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">
          {widget.title}
        </CardTitle>
        
        {/* Widget Controls */}
        {isHovered && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => console.log('Configure widget')}>
                <Settings className="mr-2 h-4 w-4" />
                Configure
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleVisibility}>
                {widget.isVisible ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Show
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleRemove}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  );
}
