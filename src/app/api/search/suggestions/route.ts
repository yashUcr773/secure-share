// Search suggestions API endpoint
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth-enhanced';
import { SearchService } from '@/lib/search';
import { addSecurityHeaders } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ));
    }

    const verification = await AuthService.verifyToken(token);
    
    if (!verification.valid || !verification.user) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      ));
    }

    const user = verification.user;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '5');

    if (!query || query.length < 2) {
      return addSecurityHeaders(NextResponse.json({
        success: true,
        suggestions: []
      }));
    }

    const suggestions = await SearchService.getSearchSuggestions(
      query,
      user.id,
      Math.min(limit, 10)
    );

    const response = NextResponse.json({
      success: true,
      suggestions
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Search suggestions error:', error);
    return addSecurityHeaders(NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    ));
  }
}
