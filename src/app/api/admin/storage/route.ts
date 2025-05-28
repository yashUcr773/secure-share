import { NextRequest, NextResponse } from 'next/server';
import { FileStorage } from '@/lib/storage';

// GET /api/admin/storage - Get storage statistics
export async function GET() {
  try {
    const stats = await FileStorage.getStats();
    
    return NextResponse.json({
      success: true,
      stats,
    });

  } catch (error) {
    console.error('Storage stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/storage - Run maintenance tasks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, daysOld } = body;

    if (action === 'cleanup') {
      const deletedCount = await FileStorage.cleanupOldFiles(daysOld || 30);
      
      return NextResponse.json({
        success: true,
        message: `Cleanup completed: ${deletedCount} files deleted`,
        deletedCount,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Storage maintenance error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
