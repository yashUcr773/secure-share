// Dashboard Widgets API Routes
import { NextRequest, NextResponse } from 'next/server';
import { WidgetService, type Widget } from '@/lib/widgets';
import { AuthService } from '@/lib/auth';

// GET /api/dashboard/widgets - Get user's dashboard widgets
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const session = await AuthService.validateSession(token);
    if (!session.valid || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }    const layout = await WidgetService.getDashboardLayout(session.user.id);
      // Get data for each widget
    const widgetsWithData = await Promise.all(
      layout.widgets.map(async (widget: Widget) => {
        const data = await WidgetService.getWidgetData(session.user!.id, widget);
        return {
          ...widget,
          data
        };
      })
    );

    return NextResponse.json({
      layout: {
        ...layout,
        widgets: widgetsWithData
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard widgets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard widgets' },
      { status: 500 }
    );
  }
}

// POST /api/dashboard/widgets - Add a new widget
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const session = await AuthService.validateSession(token);
    if (!session.valid || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const widgetData = await request.json();
    const widget = await WidgetService.addWidget(session.user.id, widgetData);
    
    return NextResponse.json({
      success: true,
      widget
    });
  } catch (error) {
    console.error('Error adding widget:', error);
    return NextResponse.json(
      { error: 'Failed to add widget' },
      { status: 500 }
    );
  }
}

// PUT /api/dashboard/widgets - Update widget layout
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const session = await AuthService.validateSession(token);
    if (!session.valid || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { widgets } = await request.json();
    await WidgetService.updateLayout(session.user.id, widgets);
    
    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Error updating widget layout:', error);
    return NextResponse.json(
      { error: 'Failed to update widget layout' },
      { status: 500 }
    );
  }
}
