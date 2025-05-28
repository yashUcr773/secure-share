import { NextRequest, NextResponse } from 'next/server';
import { FileStorage } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fileId } = await params;
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    const fileData = await FileStorage.getFileMetadata(fileId);
    
    if (!fileData) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Return file metadata (without the actual encrypted content for security)
    const response = {
      id: fileData.id,
      fileName: fileData.fileName,
      fileSize: fileData.fileSize,
      isPasswordProtected: fileData.isPasswordProtected,
      createdAt: fileData.createdAt,
      // Only return encryption parameters, not the content itself
      salt: fileData.salt,
      iv: fileData.iv,
      key: fileData.key, // Only present if not password protected
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('File metadata error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Separate endpoint to get the actual encrypted content
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fileId } = await params;
    const body = await request.json();
    const { password } = body;
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    const fileData = await FileStorage.getFile(fileId);
    
    if (!fileData) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // If password protected, validate password (in real app, you'd verify against hash)
    if (fileData.isPasswordProtected && !password) {
      return NextResponse.json(
        { error: 'Password required' },
        { status: 401 }
      );
    }

    // Return the encrypted content for client-side decryption
    return NextResponse.json({
      encryptedContent: fileData.encryptedContent,
      salt: fileData.salt,
      iv: fileData.iv,
      key: fileData.key,
    });

  } catch (error) {
    console.error('File content error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
