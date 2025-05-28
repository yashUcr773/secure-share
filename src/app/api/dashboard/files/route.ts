import { NextRequest, NextResponse } from 'next/server';
import { FileStorage } from '@/lib/storage';

// GET /api/dashboard/files - Get all files for the current user
export async function GET() {
  try {
    // TODO: Get user ID from authentication
    // For now, return all files (in a real app, you'd filter by user)
    const userId = 'anonymous'; // Placeholder
    
    const files = await FileStorage.getUserFiles(userId);
    
    return NextResponse.json({
      success: true,
      files,
    });

  } catch (error) {
    console.error('Dashboard files error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/dashboard/files - Delete a file
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

    // TODO: Verify user owns this file
    const deleted = await FileStorage.deleteFile(fileId);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });

  } catch (error) {
    console.error('Delete file error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
