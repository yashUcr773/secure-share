// Advanced search service for SecureShare
// Provides full-text search, filtering, and sorting capabilities

import { prisma } from './database';

export interface SearchFilters {
  userId?: string;
  fileType?: string;
  sizeMin?: number;
  sizeMax?: number;
  dateFrom?: Date;
  dateTo?: Date;
  folderId?: string;
  tags?: string[];
  isPasswordProtected?: boolean;
}

export interface SearchOptions {
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'size' | 'date' | 'relevance';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  files: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    createdAt: Date;
    updatedAt: Date;
    folderId: string | null;
    isPasswordProtected: boolean;
    tags: string[];
    folder?: {
      id: string;
      name: string;
    };
    relevanceScore?: number;
  }>;
  total: number;
  page: number;
  totalPages: number;
}

export class SearchService {
  /**
   * Advanced search with full-text search, filters, and sorting
   */
  static async searchFiles(
    query: string,
    filters: SearchFilters = {},
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'relevance',
      sortOrder = 'desc'
    } = options;    const offset = (page - 1) * limit;

    // Build where clause based on filters
    interface WhereClause {
      AND: Array<Record<string, unknown>>;
    }
    
    const whereClause: WhereClause = {
      AND: []
    };

    // User filter (required for security)
    if (filters.userId) {
      whereClause.AND.push({ userId: filters.userId });
    }    // Text search in filename
    if (query.trim()) {
      whereClause.AND.push({
        fileName: {
          contains: query,
        }
      });
    }// File type filter
    if (filters.fileType) {
      whereClause.AND.push({
        fileName: {
          endsWith: filters.fileType,
        }
      });
    }

    // Size filters
    if (filters.sizeMin !== undefined) {
      whereClause.AND.push({
        fileSize: { gte: filters.sizeMin }
      });
    }

    if (filters.sizeMax !== undefined) {
      whereClause.AND.push({
        fileSize: { lte: filters.sizeMax }
      });
    }

    // Date filters
    if (filters.dateFrom) {
      whereClause.AND.push({
        createdAt: { gte: filters.dateFrom }
      });
    }

    if (filters.dateTo) {
      whereClause.AND.push({
        createdAt: { lte: filters.dateTo }
      });
    }

    // Folder filter
    if (filters.folderId) {
      whereClause.AND.push({ folderId: filters.folderId });
    }

    // Password protection filter
    if (filters.isPasswordProtected !== undefined) {
      whereClause.AND.push({
        isPasswordProtected: filters.isPasswordProtected
      });
    }

    // Tags filter (JSON contains search)
    if (filters.tags && filters.tags.length > 0) {
      whereClause.AND.push({
        OR: filters.tags.map(tag => ({
          tags: {
            contains: tag
          }
        }))
      });
    }    // Build order by clause
    interface OrderByClause {
      fileName?: 'asc' | 'desc';
      fileSize?: 'asc' | 'desc';
      createdAt?: 'asc' | 'desc';
      updatedAt?: 'asc' | 'desc';
    }
    
    let orderBy: OrderByClause[] = [];
    
    switch (sortBy) {
      case 'name':
        orderBy = [{ fileName: sortOrder }];
        break;
      case 'size':
        orderBy = [{ fileSize: sortOrder }];
        break;
      case 'date':
        orderBy = [{ createdAt: sortOrder }];
        break;
      case 'relevance':
      default:
        // For relevance, we'll use a combination of factors
        orderBy = [
          { updatedAt: 'desc' },
          { fileName: 'asc' }
        ];
        break;
    }    // Execute search query
    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where: whereClause,
        include: {
          folder: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy,
        skip: offset,
        take: limit,
      }),
      prisma.file.count({ where: whereClause })
    ]);// Process results and add relevance scoring
    const processedFiles = files.map(file => {
      const tags = file.tags ? JSON.parse(file.tags) : [];
      let relevanceScore = 0;

      // Calculate relevance score if there's a query
      if (query.trim()) {
        const queryLower = query.toLowerCase();
        const fileNameLower = file.fileName.toLowerCase();
        
        // Exact match bonus
        if (fileNameLower === queryLower) {
          relevanceScore += 100;
        }
        
        // Starts with query bonus
        if (fileNameLower.startsWith(queryLower)) {
          relevanceScore += 50;
        }
        
        // Contains query bonus
        if (fileNameLower.includes(queryLower)) {
          relevanceScore += 25;
        }
        
        // Tag match bonus
        tags.forEach((tag: string) => {
          if (tag.toLowerCase().includes(queryLower)) {
            relevanceScore += 20;
          }
        });
        
        // Recent file bonus
        const daysSinceCreation = (Date.now() - file.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation < 7) {
          relevanceScore += 10;
        }
      }

      return {
        id: file.id,
        fileName: file.fileName,
        fileSize: file.fileSize,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        folderId: file.folderId,
        isPasswordProtected: file.isPasswordProtected,
        tags,
        folder: file.folder ? {
          id: file.folder.id,
          name: file.folder.name
        } : undefined,
        relevanceScore
      };
    });

    // Sort by relevance if that's the selected sort
    if (sortBy === 'relevance' && query.trim()) {
      processedFiles.sort((a, b) => {
        const scoreA = a.relevanceScore || 0;
        const scoreB = b.relevanceScore || 0;
        return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
      });
    }

    const totalPages = Math.ceil(total / limit);

    return {
      files: processedFiles,
      total,
      page,
      totalPages
    };
  }

  /**
   * Get search suggestions based on partial query
   */
  static async getSearchSuggestions(
    query: string,
    userId: string,
    limit: number = 5
  ): Promise<string[]> {
    if (!query.trim() || query.length < 2) {
      return [];
    }

    const files = await prisma.file.findMany({      where: {
        userId,
        fileName: {
          contains: query,
        }
      },
      select: {
        fileName: true
      },
      take: limit * 2 // Get more to filter unique suggestions
    });

    // Extract unique suggestions
    const suggestions = new Set<string>();
    
    files.forEach(file => {
      const fileName = file.fileName;
      const queryLower = query.toLowerCase();
      const fileNameLower = fileName.toLowerCase();
      
      // Find the position of the query in the filename
      const queryIndex = fileNameLower.indexOf(queryLower);
      if (queryIndex !== -1) {
        // Extract potential completion
        const completion = fileName.substring(queryIndex);
        if (completion.length > query.length) {
          suggestions.add(completion);
        }
        
        // Also add the full filename if it's different
        if (fileName.length > query.length) {
          suggestions.add(fileName);
        }
      }
    });

    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Get popular search terms (based on file names and tags)
   */
  static async getPopularSearchTerms(userId: string, limit: number = 10): Promise<string[]> {
    const files = await prisma.file.findMany({
      where: { userId },
      select: {
        fileName: true,
        tags: true
      }
    });

    const termFrequency = new Map<string, number>();

    files.forEach(file => {
      // Extract terms from filename
      const fileNameTerms = file.fileName
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(term => term.length > 2);

      fileNameTerms.forEach(term => {
        termFrequency.set(term, (termFrequency.get(term) || 0) + 1);
      });

      // Extract terms from tags
      if (file.tags) {
        try {
          const tags = JSON.parse(file.tags);
          tags.forEach((tag: string) => {
            const normalizedTag = tag.toLowerCase().trim();
            if (normalizedTag.length > 2) {
              termFrequency.set(normalizedTag, (termFrequency.get(normalizedTag) || 0) + 2); // Tags get double weight
            }          });
        } catch {
          // Ignore invalid JSON
        }
      }
    });

    // Sort by frequency and return top terms
    return Array.from(termFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([term]) => term);
  }

  /**
   * Get file type statistics for filter suggestions
   */
  static async getFileTypeStats(userId: string): Promise<Array<{ type: string; count: number }>> {
    const files = await prisma.file.findMany({
      where: { userId },
      select: { fileName: true }
    });

    const typeCount = new Map<string, number>();

    files.forEach(file => {
      const extension = file.fileName.split('.').pop()?.toLowerCase();
      if (extension) {
        typeCount.set(extension, (typeCount.get(extension) || 0) + 1);
      }
    });

    return Array.from(typeCount.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Create search index for better performance (can be run periodically)
   */
  static async rebuildSearchIndex(userId?: string): Promise<void> {
    // In a real implementation, this would rebuild full-text search indexes
    // For SQLite, we could use FTS5 virtual tables
    console.log('Search index rebuild triggered for user:', userId || 'all users');
    
    // This is a placeholder for index rebuilding logic
    // In production, you might want to:
    // 1. Create FTS5 virtual tables
    // 2. Update search indexes
    // 3. Optimize query performance
  }
}
