# SecureShare API Documentation

**Last Updated:** June 8, 2025  
**Version:** 1.0.0  
**Status:** Production Ready ✅

## Overview

SecureShare provides a comprehensive REST API for secure file sharing with zero-knowledge encryption. All API endpoints follow REST conventions and return JSON responses.

## Base URL
```
https://your-domain.com/api
```

## Authentication

Most API endpoints require authentication via session cookies. Authentication is handled through the following endpoints:

### POST /api/auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "username"
  }
}
```

### POST /api/auth/signup
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "username"
  }
}
```

### POST /api/auth/logout
Logout the current user.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /api/auth/me
Get current user information.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "username"
  }
}
```

## File Operations

### POST /api/upload
Upload and encrypt a file.

**Headers:**
- `Content-Type: multipart/form-data`
- `X-CSRF-Token: <csrf_token>` (required for authenticated users)

**Request Body (multipart/form-data):**
- `content`: The encrypted file content (base64)
- `fileName`: Original file name
- `fileSize`: File size in bytes
- `salt`: Encryption salt (base64)
- `iv`: Initialization vector (base64)
- `isPasswordProtected`: Boolean indicating password protection

**Response:**
```json
{
  "success": true,
  "fileId": "unique_file_id",
  "shareUrl": "https://your-domain.com/share/unique_file_id"
}
```

### GET /api/file/[id]
Retrieve file metadata and encrypted content.

**Parameters:**
- `id`: File ID

**Query Parameters:**
- `password`: Password for password-protected files (optional)

**Response:**
```json
{
  "success": true,
  "file": {
    "id": "file_id",
    "fileName": "document.txt",
    "fileSize": 1024,
    "encryptedContent": "base64_encrypted_content",
    "salt": "base64_salt",
    "iv": "base64_iv",
    "isPasswordProtected": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Dashboard Operations

### GET /api/dashboard/files
Get user's uploaded files.

**Query Parameters:**
- `limit`: Number of files to return (default: 20)
- `offset`: Number of files to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "id": "file_id",
      "fileName": "document.txt",
      "fileSize": 1024,
      "isPasswordProtected": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 5,
  "hasMore": false
}
```

### GET /api/dashboard/shared
Get user's shared links.

**Response:**
```json
{
  "success": true,
  "sharedLinks": [
    {
      "id": "file_id",
      "fileName": "document.txt",
      "shareUrl": "https://your-domain.com/share/file_id",
      "views": 10,
      "downloads": 5,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "isActive": true
    }
  ]
}
```

### GET /api/dashboard/analytics
Get analytics data for user's files.

**Query Parameters:**
- `timeRange`: "7d", "30d", or "90d" (default: "30d")

**Response:**
```json
{
  "success": true,
  "analytics": {
    "totalViews": 100,
    "totalDownloads": 50,
    "totalShares": 25,
    "activeLinks": 10,
    "popularFiles": [
      {
        "id": "file_id",
        "fileName": "popular.txt",
        "views": 20,
        "downloads": 10,
        "shares": 5
      }
    ],
    "recentActivity": [
      {
        "id": "activity_id",
        "type": "view",
        "fileName": "document.txt",
        "timestamp": "2024-01-01T00:00:00.000Z",
        "userAgent": "Mozilla/5.0..."
      }
    ],
    "viewsOverTime": [
      {
        "date": "2024-01-01",
        "views": 10,
        "downloads": 5
      }
    ]
  }
}
```

## Folder Operations

### GET /api/folders
Get user's folders.

**Response:**
```json
{
  "success": true,
  "folders": [
    {
      "id": "folder_id",
      "name": "My Documents",
      "parentId": null,
      "userId": "user_id",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### POST /api/folders
Create a new folder.

**Headers:**
- `X-CSRF-Token: <csrf_token>`

**Request Body:**
```json
{
  "name": "New Folder",
  "parentId": "parent_folder_id"
}
```

**Response:**
```json
{
  "success": true,
  "folder": {
    "id": "folder_id",
    "name": "New Folder",
    "parentId": "parent_folder_id",
    "userId": "user_id",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### PUT /api/folders/[id]
Update a folder.

**Headers:**
- `X-CSRF-Token: <csrf_token>`

**Parameters:**
- `id`: Folder ID

**Request Body:**
```json
{
  "name": "Updated Folder Name"
}
```

**Response:**
```json
{
  "success": true,
  "folder": {
    "id": "folder_id",
    "name": "Updated Folder Name",
    "parentId": "parent_folder_id",
    "userId": "user_id",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

### DELETE /api/folders/[id]
Delete a folder.

**Headers:**
- `X-CSRF-Token: <csrf_token>`

**Parameters:**
- `id`: Folder ID

**Response:**
```json
{
  "success": true,
  "message": "Folder deleted successfully"
}
```

## User Profile Operations

### GET /api/auth/profile
Get user profile information.

**Response:**
```json
{
  "success": true,
  "profile": {
    "email": "user@example.com",
    "username": "username",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastLoginAt": "2024-01-01T12:00:00.000Z"
  }
}
```

### PUT /api/auth/profile
Update user profile.

**Headers:**
- `X-CSRF-Token: <csrf_token>`

**Request Body:**
```json
{
  "username": "new_username",
  "email": "new@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

### PUT /api/auth/password
Change user password.

**Headers:**
- `X-CSRF-Token: <csrf_token>`

**Request Body:**
```json
{
  "currentPassword": "current_password",
  "newPassword": "new_password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

### PUT /api/auth/notifications
Update notification preferences.

**Headers:**
- `X-CSRF-Token: <csrf_token>`

**Request Body:**
```json
{
  "emailNotifications": true,
  "marketingEmails": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notification preferences updated"
}
```

### DELETE /api/auth/account
Delete user account.

**Headers:**
- `X-CSRF-Token: <csrf_token>`

**Response:**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

## Contact and Support

### POST /api/contact
Submit a contact form.

**Headers:**
- `X-CSRF-Token: <csrf_token>`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Support Request",
  "message": "I need help with..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully"
}
```

## Security

### GET /api/csrf
Get CSRF token for authenticated requests.

**Response:**
```json
{
  "success": true,
  "token": "csrf_token_string"
}
```

## Error Responses

All API endpoints may return error responses in the following format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "status": 400
}
```

### Common Error Codes

- `INVALID_INPUT`: Request validation failed
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Access denied
- `NOT_FOUND`: Resource not found
- `FILE_TOO_LARGE`: File exceeds size limit
- `FILE_TYPE_NOT_SUPPORTED`: File type not allowed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INVALID_CSRF_TOKEN`: CSRF token validation failed
- `VALIDATION_ERROR`: Input validation failed
- `INTERNAL_ERROR`: Server error

### HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `413`: Payload Too Large
- `429`: Too Many Requests
- `500`: Internal Server Error

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **File Upload**: 10 requests per minute per IP
- **Authentication**: 5 requests per minute per IP
- **General API**: 60 requests per minute per IP

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets

## CORS Policy

The API supports CORS for browser-based applications:
- `Access-Control-Allow-Origin`: Configured origins only
- `Access-Control-Allow-Methods`: GET, POST, PUT, DELETE, OPTIONS
- `Access-Control-Allow-Headers`: Content-Type, Authorization, X-CSRF-Token

## WebSocket Support

Currently, WebSocket support is not available. Real-time features may be added in future versions.

## Pagination

Endpoints that return lists support pagination:

**Query Parameters:**
- `limit`: Number of items per page (max 100, default 20)
- `offset`: Number of items to skip (default 0)

**Response includes:**
- `total`: Total number of items
- `hasMore`: Boolean indicating if more items are available

## File Size Limits

- **Free Plan**: 2MB per file
- **Pro Plan**: 100MB per file
- **Enterprise**: 1GB per file

## Security Headers

All API responses include security headers:
- `Strict-Transport-Security`: HSTS for HTTPS
- `Content-Security-Policy`: CSP rules
- `X-Frame-Options`: Clickjacking protection
- `X-Content-Type-Options`: MIME sniffing protection
- `Referrer-Policy`: Referrer control

## SDK and Libraries

Official SDKs:
- JavaScript/TypeScript (coming soon)
- Python (coming soon)
- Go (coming soon)

## Support

For API support:
- Documentation: [Your documentation URL]
- Issues: [Your GitHub issues URL]
- Email: support@your-domain.com
- Discord: [Your Discord invite]

## Changelog

### v1.0.0 (Current)
- Initial API release
- File upload/download
- User authentication
- Folder management
- Analytics dashboard
- CSRF protection
- Rate limiting
