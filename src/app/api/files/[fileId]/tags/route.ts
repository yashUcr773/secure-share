import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/lib/auth-enhanced';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight } from '@/lib/security';
import { prisma } from '@/lib/database';

// Validation schema for updating file tags
const updateTagsSchema = z.object({
  tags: z.array(z.string().trim().min(1).max(50)).max(10),
});

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return handleCORSPreflight(request) || new NextResponse(null, { status: 200 });
}

// PATCH /api/files/[fileId]/tags - Update file tags
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {    // Validate origin
    if (!validateOrigin(request, [process.env.NEXTAUTH_URL || 'http://localhost:3000'])) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid origin' },
        { status: 403 }
      ));
    }

    const { fileId } = await params;
      // Verify authentication
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ));
    }

    let userId;
    try {
      const verification = await AuthService.verifyToken(token);
      if (!verification.valid || !verification.user) {
        return addSecurityHeaders(NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        ));
      }
      userId = verification.user.id;
    } catch (error) {
      console.error('Token verification failed:', error);
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      ));
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateTagsSchema.safeParse(body);
    
    if (!validationResult.success) {
      return addSecurityHeaders(NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      ));
    }

    const { tags } = validationResult.data;

    // Verify file ownership
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: userId,
      },
    });

    if (!file) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'File not found or access denied' },
        { status: 404 }
      ));
    }

    // Update file tags
    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data: {
        tags: tags.join(','), // Store as comma-separated string
        updatedAt: new Date(),
      },
    });

    return addSecurityHeaders(NextResponse.json({
      success: true,
      file: {
        id: updatedFile.id,
        fileName: updatedFile.fileName,
        tags: updatedFile.tags ? updatedFile.tags.split(',') : [],
      },
    }));

  } catch (error) {
    console.error('Update file tags error:', error);
    return addSecurityHeaders(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ));
  }
}
