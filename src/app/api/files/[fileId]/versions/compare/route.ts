// Version comparison API route
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

// GET /api/files/[fileId]/versions/compare - Compare two versions
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
    const versionId1 = searchParams.get('version1');
    const versionId2 = searchParams.get('version2');

    if (!versionId1 || !versionId2) {
      return NextResponse.json(
        { error: 'Both version1 and version2 parameters are required' },
        { status: 400 }
      );
    }

    const comparison = await VersioningService.compareVersions(fileId, versionId1, versionId2, user.id);
    
    return NextResponse.json({ comparison });
  } catch (error) {
    console.error('Error comparing versions:', error);
    return NextResponse.json(
      { error: 'Failed to compare versions' },
      { status: 500 }
    );
  }
}

// POST /api/files/[fileId]/versions/stats - Get version statistics
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
    const stats = await VersioningService.getVersionStats(fileId, user.id);
    
    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching version stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch version stats' },
      { status: 500 }
    );
  }
}
