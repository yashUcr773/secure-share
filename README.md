# SecureShare 🔐

A modern, secure file sharing application built with Next.js 15, featuring zero-knowledge encryption, role-based authentication, and enterprise-grade security.

[![Next.js](https://img.shields.io/badge/Next.js-15.3.2-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 🌟 Features

### 🔒 Security First
- **Zero-knowledge encryption** - Files are encrypted client-side before upload
- **Role-based authentication** with JWT tokens
- **CSRF protection** on all forms and API endpoints
- **Rate limiting** to prevent abuse
- **Input sanitization** and validation
- **Secure headers** and CORS configuration

### 📁 File Management
- **Encrypted file uploads** with progress tracking
- **Password-protected shares** for additional security
- **Folder organization** with nested structure support
- **File ownership verification** - users can only access their own files
- **Automatic cleanup** of expired files
- **File type validation** and size limits

### 👥 User Experience
- **Responsive design** optimized for all devices
- **Dark/light theme** support
- **Real-time notifications** with toast messages
- **Drag & drop uploads** with visual feedback
- **Share links** with optional expiration dates
- **Analytics dashboard** for file access tracking

### 🛠 Enterprise Features
- **Admin dashboard** for system management
- **Storage monitoring** and usage analytics
- **Email notifications** (configurable)
- **Background job processing** for file operations
- **Prisma ORM** for scalable database operations
- **CDN integration** ready for global distribution

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/secure-share.git
cd secure-share
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Configure the following required variables:
```env
# Security (REQUIRED in production)
JWT_SECRET=your-super-secure-jwt-secret-key-32-chars-minimum
SESSION_SECRET=your-session-secret-key

# Database (optional - uses file storage by default)
DATABASE_URL=your-database-connection-string

# Storage Configuration
STORAGE_DIR=./data
MAX_FILE_SIZE=10485760
CLEANUP_DAYS=30

# Rate Limiting
RATE_LIMIT_UPLOAD_PER_HOUR=10
RATE_LIMIT_LOGIN_PER_HOUR=5
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Documentation

All comprehensive documentation is available in the `/docs` folder:

- **[API Documentation](docs/API_DOCUMENTATION.md)** - Complete REST API reference
- **[Implementation Summary](docs/IMPLEMENTATION_SUMMARY.md)** - Technical implementation details
- **[Storage Guide](docs/STORAGE.md)** - File storage and encryption details
- **[CSRF Implementation](docs/CSRF_IMPLEMENTATION.md)** - Security implementation guide
- **[Email Configuration](docs/EMAIL_CONFIGURATION.md)** - Email setup instructions
- **[Project Completion Summary](docs/PROJECT_COMPLETION_SUMMARY.md)** - Feature completion status
- **[Final Status Report](docs/FINAL_STATUS_REPORT.md)** - Production readiness report

## 🏗 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # User dashboard
│   └── upload/            # File upload interface
├── components/            # Reusable UI components
├── lib/                   # Core business logic
├── hooks/                 # Custom React hooks
└── middleware.ts          # Route protection & security
```

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Utilities
npm run type-check   # TypeScript type checking
npm run optimize:production  # Production optimization
npm run build:analyze       # Bundle analysis
```

## 🚀 Deployment

### Environment Setup
1. Set all required environment variables for production
2. Ensure `JWT_SECRET` is at least 32 characters long
3. Configure your database (optional - uses file storage by default)
4. Set up CDN for static assets (optional)

### Vercel (Recommended)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme)

### Docker
```bash
# Build the image
docker build -t secure-share .

# Run the container
docker run -p 3000:3000 secure-share
```

### Manual Deployment
```bash
npm run build
npm run start
```

## 🔐 Security Features

- **Client-side encryption** using AES-GCM
- **PBKDF2 key derivation** with 100,000 iterations
- **CSRF tokens** on all state-changing operations
- **Rate limiting** with Redis backend support
- **Input sanitization** using DOMPurify
- **Secure headers** including CSP, HSTS, and X-Frame-Options
- **Session management** with secure, httpOnly cookies

## 🧪 Testing & Quality

This project follows best practices for:
- **TypeScript** strict mode enabled
- **ESLint** with Next.js recommended rules
- **Security-first development** with OWASP guidelines
- **Performance optimization** with bundle splitting
- **Accessibility** compliance

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Lucide React](https://lucide.dev/)

## 📞 Support

For support, email support@yourapp.com or open an issue on GitHub.

---

**SecureShare** - Secure file sharing made simple. 🔐✨
