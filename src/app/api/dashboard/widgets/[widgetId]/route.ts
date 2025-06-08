// Individual Widget API Routes
import { NextRequest, NextResponse } from 'next/server';
import { WidgetService } from '@/lib/widgets';
import { AuthService } from '@/lib/auth';

// Helper function to validate authentication
async function validateAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const session = await AuthService.validateSession(token);
  return session.valid && session.user ? session.user : null;
}

// GET /api/dashboard/widgets/[widgetId] - Get specific widget
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ widgetId: string }> }
) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { widgetId } = await params;
    const widget = await WidgetService.getWidget(user.id, widgetId);
      if (!widget) {
          return NextResponse.json(
              { error: 'Widget not found' },
              { status: 404 }
          );
      }
    const data = await WidgetService.getWidgetData(user.id, widget);
    
    return NextResponse.json({
      widget: {
        ...widget,
        data
      }
    });
  } catch (error) {
    console.error('Error fetching widget:', error);
    return NextResponse.json(
      { error: 'Widget not found' },
      { status: 404 }
    );
  }
}

// PUT /api/dashboard/widgets/[widgetId] - Update specific widget
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ widgetId: string }> }
) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { widgetId } = await params;
    const updates = await request.json();
    
    const widget = await WidgetService.updateWidget(user.id, widgetId, updates);
    
    return NextResponse.json({
      success: true,
      widget
    });
  } catch (error) {
    console.error('Error updating widget:', error);
    return NextResponse.json(
      { error: 'Failed to update widget' },
      { status: 500 }
    );
  }
}

// DELETE /api/dashboard/widgets/[widgetId] - Remove specific widget
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ widgetId: string }> }
) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { widgetId } = await params;
    await WidgetService.removeWidget(user.id, widgetId);
    
    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Error removing widget:', error);
    return NextResponse.json(
      { error: 'Failed to remove widget' },
      { status: 500 }
    );
  }
}
