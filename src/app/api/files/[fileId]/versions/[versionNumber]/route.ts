// Version-specific API Routes
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

// GET /api/files/[fileId]/versions/[versionNumber] - Get specific version
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; versionNumber: string }> }
) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { versionNumber } = await params;
    // versionNumber in this route is actually the versionId
    const version = await VersioningService.getFileVersion(versionNumber, user.id);
    
    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    return NextResponse.json({ version });
  } catch (error) {
    console.error('Error fetching version:', error);
    return NextResponse.json(
      { error: 'Failed to fetch version' },
      { status: 500 }
    );
  }
}

// POST /api/files/[fileId]/versions/[versionNumber]/restore - Restore version
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; versionNumber: string }> }
) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId, versionNumber } = await params;
    const body = await request.json();
    const { changeDescription } = body;

    const result = await VersioningService.restoreToVersion(
      fileId, 
      versionNumber, // This is actually the versionId
      user.id, 
      changeDescription
    );
    
    return NextResponse.json({
      success: true,
      newVersion: result
    });
  } catch (error) {
    console.error('Error restoring version:', error);
    return NextResponse.json(
      { error: 'Failed to restore version' },
      { status: 500 }
    );
  }
}

// DELETE /api/files/[fileId]/versions/[versionNumber] - Delete version
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string; versionNumber: string }> }
) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { versionNumber } = await params;
    
    // versionNumber in this route is actually the versionId
    await VersioningService.deleteVersion(versionNumber, user.id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting version:', error);
    return NextResponse.json(
      { error: 'Failed to delete version' },
      { status: 500 }
    );
  }
}
