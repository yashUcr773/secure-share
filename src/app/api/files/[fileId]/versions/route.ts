// File Versioning API Routes
import { NextRequest, NextResponse } from 'next/server';
import { VersioningService } from '@/lib/versioning';
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

// GET /api/files/[fileId]/versions - Get version history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const versions = await VersioningService.getFileVersions(fileId, user.id);
    
    // Apply pagination
    const paginatedVersions = versions.slice(offset, offset + limit);
    
    return NextResponse.json({
      versions: paginatedVersions,
      total: versions.length
    });
  } catch (error) {
    console.error('Error fetching version history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch version history' },
      { status: 500 }
    );
  }
}

// POST /api/files/[fileId]/versions - Create new version
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId } = await params;
    const body = await request.json();
    const { encryptedContent, salt, iv, fileName, changeDescription } = body;

    if (!encryptedContent || !salt || !iv) {
      return NextResponse.json(
        { error: 'Missing required fields: encryptedContent, salt, iv' },
        { status: 400 }
      );
    }

    const version = await VersioningService.createVersion(
      fileId,
      user.id,
      encryptedContent,
      salt,
      iv,
      fileName,
      changeDescription
    );
    
    return NextResponse.json({
      success: true,
      version
    });
  } catch (error) {
    console.error('Error creating version:', error);
    return NextResponse.json(
      { error: 'Failed to create version' },
      { status: 500 }
    );
  }
}
