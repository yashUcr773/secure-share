import { NextRequest, NextResponse } from 'next/server';
import { FileStorage } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      encryptedContent, 
      salt, 
      iv, 
      key, 
      shareId, 
      fileName, 
      fileSize,
      isPasswordProtected 
    } = body;

    // Validate required fields
    if (!encryptedContent || !shareId || !fileName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }    // Prepare file data for storage
    const fileData = {
      id: shareId,
      fileName,
      fileSize,
      encryptedContent,
      salt,
      iv,
      key: isPasswordProtected ? null : key, // Don't store key if password protected
      isPasswordProtected,
      createdAt: new Date().toISOString(),
      // TODO: Get user ID from authentication - for now use 'anonymous'
      userId: 'anonymous',
    };

    // Save to persistent storage
    await FileStorage.saveFile(fileData);

    return NextResponse.json({
      success: true,
      shareId,
      shareUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/share/${shareId}`,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
