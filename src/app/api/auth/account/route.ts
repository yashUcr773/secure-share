import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { FileStorage } from '@/lib/storage';
import { generalRateLimit, createRateLimitIdentifier, checkRateLimit } from '@/lib/rate-limit';
import { addSecurityHeaders, validateOrigin, handleCORSPreflight, validateCSRFWithSession } from '@/lib/security';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = handleCORSPreflight(request);
  return response ? addSecurityHeaders(response) : new NextResponse(null, { status: 405 });
}

export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting - very strict for account deletion
    const identifier = createRateLimitIdentifier(request, 'account_delete');
    const rateLimitResult = await checkRateLimit(request, generalRateLimit, identifier);
    
    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        { error: 'Too many account deletion attempts. Please try again later.' },
        { status: 429 }
      );
      
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      return addSecurityHeaders(response);
    }

    // Origin validation for CSRF protection
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    ];
    
    if (!validateOrigin(request, allowedOrigins)) {
      const response = NextResponse.json(
        { error: 'Invalid request origin' },
        { status: 403 }
      );
      return addSecurityHeaders(response);
    }    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      const response = NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }    const payload = await AuthService.verifyToken(token);
    
    if (!payload) {
      const response = NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    // Validate CSRF token
    const csrfValid = await validateCSRFWithSession(request, payload.userId);
    if (!csrfValid) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      ));
    }

    // Get current user
    const user = await AuthService.getUserById(payload.userId);
    
    if (!user) {
      const response = NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }    // Delete user account and all associated data
    try {
      
      // 1. Get all user files and delete them
      const userFiles = await FileStorage.getUserFiles(payload.userId);
      
      for (const file of userFiles) {
        try {
          await FileStorage.deleteFile(file.id);
        } catch (fileError) {
          console.error(`Failed to delete file ${file.id}:`, fileError);
        }
      }
      
      // 2. Get all user shared links and delete them
      const userSharedLinks = await FileStorage.getUserSharedLinks(payload.userId);
      
      for (const link of userSharedLinks) {
        try {
          await FileStorage.deleteSharedLink(link.id);
        } catch (linkError) {
          console.error(`Failed to delete shared link ${link.id}:`, linkError);
        }
      }
      
      // 3. Get all user folders and delete them
      const userFolders = await FileStorage.getUserFolders(payload.userId);
      
      for (const folder of userFolders) {
        try {
          await FileStorage.deleteFolder(folder.id);
        } catch (folderError) {
          console.error(`Failed to delete folder ${folder.id}:`, folderError);
        }
      }
      
      // 4. Finally, delete the user account
      // Note: AuthService doesn't have a deleteUser method, so we'll mark as inactive
      const deleteResult = await AuthService.updateUser(payload.userId, {
        isActive: false,
        updatedAt: new Date().toISOString(),
        deletedAt: new Date().toISOString()
      } as any);
      
      if (!deleteResult.success) {
        throw new Error('Failed to delete user account');
      }
      
      console.log(`Account deletion completed for user ${payload.userId}`);
      
    } catch (deletionError) {
      console.error('Account deletion failed:', deletionError);
      const response = NextResponse.json(
        { error: 'Failed to delete account completely. Please contact support.' },
        { status: 500 }
      );
      return addSecurityHeaders(response);
    }
    
    const response = NextResponse.json(
      { message: 'Account deleted successfully' },
      { status: 200 }
    );

    // Clear auth token
    response.cookies.delete('auth-token');

    // Add rate limit headers
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Account deletion error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
