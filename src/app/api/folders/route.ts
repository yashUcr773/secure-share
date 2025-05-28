import { NextRequest, NextResponse } from 'next/server';
import { FileStorage } from '@/lib/storage';

// GET - Get user's folders
export async function GET() {
  try {
    // TODO: Get actual user ID from authentication
    // For now, using 'anonymous' for demo purposes
    const userId = 'anonymous';
    
    const folders = await FileStorage.getUserFolders(userId);
    
    return NextResponse.json({
      folders,
      total: folders.length,
    });
  } catch (error) {
    console.error('Folders fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch folders' },
      { status: 500 }
    );
  }
}

// POST - Create new folder
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, parentId } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      );
    }

    // TODO: Get actual user ID from authentication
    const userId = 'anonymous';

    const folder = await FileStorage.createFolder({
      name: name.trim(),
      parentId: parentId || null,
      userId,
    });

    return NextResponse.json({
      folder,
      message: 'Folder created successfully',
    });
  } catch (error) {
    console.error('Folder creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    );
  }
}
