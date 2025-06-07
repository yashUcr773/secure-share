// Jest setup file
require('@testing-library/jest-dom');

// Mock Next.js environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-at-least-32-characters-long';
process.env.SESSION_SECRET = 'test-session-secret-for-testing';
process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
process.env.STORAGE_DIR = './test-data';
process.env.KEY_DERIVATION_ITERATIONS = '10000';
process.env.SENDGRID_API_KEY = 'test-sendgrid-key';
process.env.FROM_EMAIL = 'test@example.com';

// Polyfill for TextEncoder/TextDecoder
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock crypto for edge runtime compatibility
global.crypto = global.crypto || {
  getRandomValues: (arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  },
  subtle: {
    importKey: jest.fn(),
    deriveBits: jest.fn(),
  },
  randomBytes: (size) => {
    const arr = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }
};

// Mock fetch globally
global.fetch = jest.fn();

// Mock btoa/atob for Node.js environment
global.btoa = global.btoa || ((str) => Buffer.from(str, 'binary').toString('base64'));
global.atob = global.atob || ((b64Encoded) => Buffer.from(b64Encoded, 'base64').toString('binary'));

// Mock window for tests (location will be mocked per test as needed)

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    const headers = new Headers(init?.headers);
    return {
      url,
      headers,
      method: init?.method || 'GET',
      ip: '127.0.0.1',
      nextUrl: new URL(url),
      get: (name) => headers.get(name),
    };
  }),
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
      headers: new Headers(init?.headers),
      ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
    })),
    redirect: jest.fn((url, status) => ({
      url,
      status: status || 302,
      headers: new Headers({ Location: url }),
    })),
  },
}));

// Clean up test data after tests
afterEach(() => {
  jest.clearAllMocks();
  // Reset window.location.href
  window.location.href = 'http://localhost:3000';
});
