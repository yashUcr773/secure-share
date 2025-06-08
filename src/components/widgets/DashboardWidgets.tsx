'use client';

import { useState, useEffect } from 'react';
import { WidgetRenderer } from './WidgetRenderer';
import { Button } from '@/components/ui/button';
import { Plus, Grid, Settings } from 'lucide-react';
import { DashboardLayout, Widget } from '@/lib/widgets';

interface DashboardWidgetsProps {
  onUpload?: () => void;
}

export function DashboardWidgets({ onUpload }: DashboardWidgetsProps) {
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    fetchDashboardLayout();
  }, []);

  const fetchDashboardLayout = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/dashboard/widgets');
      if (response.ok) {
        const data = await response.json();
        setLayout(data.layout);
      }
    } catch (error) {
      console.error('Error fetching dashboard layout:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateWidget = async (updatedWidget: Widget) => {
    try {
      const response = await fetch(`/api/dashboard/widgets/${updatedWidget.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedWidget),
      });      if (response.ok) {
        // Update local state
        setLayout(prev => prev ? {
          ...prev,
          widgets: prev.widgets.map((w: Widget) => w.id === updatedWidget.id ? updatedWidget : w)
        } : null);
      }
    } catch (error) {
      console.error('Error updating widget:', error);
    }
  };

  const handleRemoveWidget = async (widgetId: string) => {
    try {
      const response = await fetch(`/api/dashboard/widgets/${widgetId}`, {
        method: 'DELETE',
      });      if (response.ok) {
        // Update local state
        setLayout((prev: DashboardLayout | null) => prev ? {
          ...prev,
          widgets: prev.widgets.filter((w: Widget) => w.id !== widgetId)
        } : null);
      }
    } catch (error) {
      console.error('Error removing widget:', error);
    }
  };
  const handleToggleVisibility = async (widgetId: string, isVisible: boolean) => {
    const widget = layout?.widgets.find((w: Widget) => w.id === widgetId);
    if (widget) {
      await handleUpdateWidget({ ...widget, isVisible });
    }
  };

  const handleAddWidget = () => {
    // In a real implementation, this would open a widget selection dialog
    console.log('Add widget clicked');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!layout) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load dashboard widgets</p>
        <Button onClick={fetchDashboardLayout} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-muted-foreground">Manage your files and monitor activity</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditMode(!isEditMode)}
          >
            <Settings className="mr-2 h-4 w-4" />
            {isEditMode ? 'Done' : 'Customize'}
          </Button>
          
          {isEditMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddWidget}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Widget
            </Button>
          )}
        </div>
      </div>

      {/* Widget Grid */}
      <div 
        className="grid gap-4 auto-rows-fr"
        style={{
          gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
          gap: `${layout.gap}px`
        }}
      >        {layout.widgets
          .filter((widget: Widget) => widget.isVisible)
          .sort((a: Widget, b: Widget) => (a.position.order || 0) - (b.position.order || 0))
          .map((widget: Widget) => (
            <WidgetRenderer
              key={widget.id}
              widget={widget}
              onUpdate={handleUpdateWidget}
              onRemove={isEditMode ? handleRemoveWidget : undefined}
              onToggleVisibility={isEditMode ? handleToggleVisibility : undefined}
              onUpload={onUpload}
            />
          ))}
      </div>      {/* Empty State */}
      {layout.widgets.filter((w: Widget) => w.isVisible).length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-muted-foreground/25 rounded-lg">
          <Grid className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No widgets visible</h3>
          <p className="text-muted-foreground mb-4">
            Customize your dashboard by adding widgets to track your files and activity
          </p>
          <Button onClick={handleAddWidget}>
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Widget
          </Button>
        </div>
      )}
    </div>
  );
}
