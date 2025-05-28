import { NextRequest, NextResponse } from 'next/server';
import { FileStorage } from '@/lib/storage';

// GET /api/dashboard/shared - Get all shared links for the current user
export async function GET() {
  try {
    // TODO: Get user ID from authentication
    // For now, return all shared links (in a real app, you'd filter by user)
    const userId = 'anonymous'; // Placeholder
    
    const sharedLinks = await FileStorage.getUserSharedLinks(userId);
    
    return NextResponse.json({
      success: true,
      sharedLinks,
    });

  } catch (error) {
    console.error('Dashboard shared links error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/dashboard/shared - Create a new shared link
export async function POST(request: NextRequest) {
  try {
    const { fileId, expiresAt } = await request.json();
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // TODO: Get user ID from authentication
    const userId = 'anonymous'; // Placeholder

    // TODO: Verify user owns this file
    const sharedLink = await FileStorage.createSharedLink(fileId, userId, expiresAt);
    
    if (!sharedLink) {
      return NextResponse.json(
        { error: 'Failed to create shared link' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sharedLink,
    });

  } catch (error) {
    console.error('Create shared link error:', error);
    if (error instanceof Error && error.message === 'File not found') {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/dashboard/shared - Delete a shared link
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // TODO: Verify user owns this shared link
    const deleted = await FileStorage.deleteSharedLink(fileId);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Shared link not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Shared link deleted successfully',
    });

  } catch (error) {
    console.error('Delete shared link error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
