// Advanced search API endpoint
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth-enhanced';
import { SearchService, SearchFilters, SearchOptions } from '@/lib/search';
import { addSecurityHeaders } from '@/lib/security';
import { z } from 'zod';

const searchSchema = z.object({
  query: z.string().optional().default(''),
  fileType: z.string().optional(),
  sizeMin: z.number().optional(),
  sizeMax: z.number().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  folderId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPasswordProtected: z.boolean().optional(),
  page: z.number().optional().default(1),
  limit: z.number().optional().default(20),
  sortBy: z.enum(['name', 'size', 'date', 'relevance']).optional().default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

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

    // Parse and validate search parameters
    const rawParams = Object.fromEntries(searchParams.entries());
    
    // Convert string parameters to appropriate types
    const parsedParams = {
      ...rawParams,
      page: rawParams.page ? parseInt(rawParams.page) : 1,
      limit: rawParams.limit ? parseInt(rawParams.limit) : 20,
      sizeMin: rawParams.sizeMin ? parseInt(rawParams.sizeMin) : undefined,
      sizeMax: rawParams.sizeMax ? parseInt(rawParams.sizeMax) : undefined,
      tags: rawParams.tags ? rawParams.tags.split(',') : undefined,
      isPasswordProtected: rawParams.isPasswordProtected === 'true' ? true : 
                          rawParams.isPasswordProtected === 'false' ? false : undefined
    };

    const validation = searchSchema.safeParse(parsedParams);
    if (!validation.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid search parameters', details: validation.error.errors },
        { status: 400 }
      ));
    }

    const params = validation.data;

    // Build search filters
    const filters: SearchFilters = {
      userId: user.id,
      fileType: params.fileType,
      sizeMin: params.sizeMin,
      sizeMax: params.sizeMax,
      dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
      dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
      folderId: params.folderId,
      tags: params.tags,
      isPasswordProtected: params.isPasswordProtected
    };

    const options: SearchOptions = {
      page: params.page,
      limit: Math.min(params.limit, 100), // Limit max results
      sortBy: params.sortBy,
      sortOrder: params.sortOrder
    };

    // Perform search
    const results = await SearchService.searchFiles(
      params.query,
      filters,
      options
    );

    const response = NextResponse.json({
      success: true,
      data: results
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Search error:', error);
    return addSecurityHeaders(NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    ));
  }
}

export async function POST(request: NextRequest) {
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
    const body = await request.json();

    // Validate search parameters
    const validation = searchSchema.safeParse(body);
    if (!validation.success) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Invalid search parameters', details: validation.error.errors },
        { status: 400 }
      ));
    }

    const params = validation.data;

    // Build search filters
    const filters: SearchFilters = {
      userId: user.id,
      fileType: params.fileType,
      sizeMin: params.sizeMin,
      sizeMax: params.sizeMax,
      dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
      dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
      folderId: params.folderId,
      tags: params.tags,
      isPasswordProtected: params.isPasswordProtected
    };

    const options: SearchOptions = {
      page: params.page,
      limit: Math.min(params.limit, 100),
      sortBy: params.sortBy,
      sortOrder: params.sortOrder
    };

    // Perform search
    const results = await SearchService.searchFiles(
      params.query,
      filters,
      options
    );

    const response = NextResponse.json({
      success: true,
      data: results
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Search error:', error);
    return addSecurityHeaders(NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    ));
  }
}
