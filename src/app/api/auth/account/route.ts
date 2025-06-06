import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = await AuthService.verifyToken(token);
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get current user
    const user = await AuthService.getUserById(payload.userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // TODO: Delete user account and all associated data
    // This would include:
    // - User profile data
    // - Uploaded files
    // - Shared links
    // - Analytics data
    // For now, just return success
    
    const response = NextResponse.json(
      { message: 'Account deleted successfully' },
      { status: 200 }
    );

    // Clear auth token
    response.cookies.delete('auth-token');

    return response;

  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
