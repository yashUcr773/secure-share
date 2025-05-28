// Authentication utilities for SecureShare
// Handles user registration, login, password hashing, and JWT tokens

import { promises as fs } from 'fs';
import path from 'path';
import { config } from './config';

// User interface
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// JWT payload interface
export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

// Login result interface
export interface LoginResult {
  success: boolean;
  user?: Omit<User, 'passwordHash'>;
  token?: string;
  error?: string;
}

// Registration result interface
export interface RegisterResult {
  success: boolean;
  user?: Omit<User, 'passwordHash'>;
  error?: string;
}

export class AuthService {
  private static readonly USERS_DIR = path.join(path.resolve(config.storageDir), 'users');
  private static readonly USERS_INDEX = path.join(this.USERS_DIR, 'index.json');

  /**
   * Initialize authentication storage
   */
  static async init(): Promise<void> {
    try {
      await fs.mkdir(this.USERS_DIR, { recursive: true });
      
      // Create users index if it doesn't exist
      try {
        await fs.access(this.USERS_INDEX);
      } catch {
        await fs.writeFile(this.USERS_INDEX, JSON.stringify({}));
      }
    } catch (error) {
      console.error('Failed to initialize auth storage:', error);
      throw new Error('Auth storage initialization failed');
    }
  }

  /**
   * Hash a password using Web Crypto API (PBKDF2)
   */
  static async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    
    // Generate salt
    const salt = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(salt);
    } else {
      // Fallback for Node.js environment
      const nodeCrypto = await import('crypto');
      nodeCrypto.randomFillSync(salt);
    }

    // Import password as key material
    let keyMaterial: CryptoKey;
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      // Browser environment
      keyMaterial = await crypto.subtle.importKey(
        'raw',
        data,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      // Derive key
      const derivedKey = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: config.keyDerivationIterations,
          hash: 'SHA-256',
        },
        keyMaterial,
        256 // 32 bytes
      );

      // Combine salt and derived key
      const hashArray = new Uint8Array(salt.length + derivedKey.byteLength);
      hashArray.set(salt);
      hashArray.set(new Uint8Array(derivedKey), salt.length);

      // Convert to base64
      return btoa(String.fromCharCode.apply(null, Array.from(hashArray)));
    } else {
      // Node.js environment fallback
      const nodeCrypto = await import('crypto');
      const derivedKey = nodeCrypto.pbkdf2Sync(password, salt, config.keyDerivationIterations, 32, 'sha256');
      
      // Combine salt and derived key
      const hashArray = new Uint8Array(salt.length + derivedKey.length);
      hashArray.set(salt);
      hashArray.set(derivedKey, salt.length);

      return btoa(String.fromCharCode.apply(null, Array.from(hashArray)));
    }
  }

  /**
   * Verify a password against a hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      // Decode the stored hash
      const hashArray = new Uint8Array(
        atob(hash).split('').map(char => char.charCodeAt(0))
      );

      // Extract salt (first 16 bytes) and stored key (remaining bytes)
      const salt = hashArray.slice(0, 16);
      const storedKey = hashArray.slice(16);

      // Derive key from provided password using same salt
      const encoder = new TextEncoder();
      const data = encoder.encode(password);

      if (typeof crypto !== 'undefined' && crypto.subtle) {
        // Browser environment
        const keyMaterial = await crypto.subtle.importKey(
          'raw',
          data,
          { name: 'PBKDF2' },
          false,
          ['deriveBits']
        );

        const derivedKey = await crypto.subtle.deriveBits(
          {
            name: 'PBKDF2',
            salt: salt,
            iterations: config.keyDerivationIterations,
            hash: 'SHA-256',
          },
          keyMaterial,
          256
        );

        const derivedKeyArray = new Uint8Array(derivedKey);
        
        // Compare keys
        return derivedKeyArray.length === storedKey.length &&
               derivedKeyArray.every((byte, index) => byte === storedKey[index]);
      } else {
        // Node.js environment
        const nodeCrypto = await import('crypto');
        const derivedKey = nodeCrypto.pbkdf2Sync(password, salt, config.keyDerivationIterations, 32, 'sha256');
        
        return derivedKey.length === storedKey.length &&
               derivedKey.every((byte, index) => byte === storedKey[index]);
      }
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Generate a simple JWT-like token (for development)
   * In production, use a proper JWT library
   */
  static async generateToken(user: User): Promise<string> {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    };

    // Simple base64 encoding for development
    // In production, use proper JWT signing
    const token = btoa(JSON.stringify(payload));
    return token;
  }

  /**
   * Verify and decode a token
   */
  static async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      // Simple base64 decoding for development
      const payload: JWTPayload = JSON.parse(atob(token));
      
      // Check expiration
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return null; // Token expired
      }

      return payload;
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  /**
   * Generate a unique user ID
   */
  static generateUserId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 9);
    return `user_${timestamp}_${randomPart}`;
  }

  /**
   * Register a new user
   */
  static async register(email: string, password: string, name?: string): Promise<RegisterResult> {
    await this.init();

    try {
      // Validate input
      if (!email || !password) {
        return { success: false, error: 'Email and password are required' };
      }

      if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' };
      }

      // Check if user already exists
      const existingUser = await this.getUserByEmail(email);
      if (existingUser) {
        return { success: false, error: 'User with this email already exists' };
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Create user
      const user: User = {
        id: this.generateUserId(),
        email: email.toLowerCase().trim(),
        passwordHash,
        name: name?.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      };

      // Save user
      await this.saveUser(user);

      // Return user without password hash
      const { ...userWithoutPassword } = user;
      return { success: true, user: userWithoutPassword };

    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  }

  /**
   * Authenticate a user
   */
  static async login(email: string, password: string): Promise<LoginResult> {
    await this.init();

    try {
      // Validate input
      if (!email || !password) {
        return { success: false, error: 'Email and password are required' };
      }

      // Get user by email
      const user = await this.getUserByEmail(email);
      if (!user || !user.isActive) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Generate token
      const token = await this.generateToken(user);

      // Return user without password hash
      const { ...userWithoutPassword } = user;
      return { success: true, user: userWithoutPassword, token };

    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    await this.init();

    try {
      const indexContent = await fs.readFile(this.USERS_INDEX, 'utf-8');
      const index = JSON.parse(indexContent);

      const normalizedEmail = email.toLowerCase().trim();
      const userId = index[normalizedEmail];

      if (!userId) {
        return null;
      }

      return await this.getUserById(userId);
    } catch (error) {
      console.error('Get user by email error:', error);
      return null;
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<User | null> {
    await this.init();

    try {
      const userPath = path.join(this.USERS_DIR, `${id}.json`);
      const userContent = await fs.readFile(userPath, 'utf-8');
      return JSON.parse(userContent) as User;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null; // User not found
      }
      console.error('Get user by ID error:', error);
      throw new Error('User retrieval failed');
    }
  }

  /**
   * Save user to storage
   */
  private static async saveUser(user: User): Promise<void> {
    try {
      // Save user file
      const userPath = path.join(this.USERS_DIR, `${user.id}.json`);
      await fs.writeFile(userPath, JSON.stringify(user, null, 2));

      // Update email index
      const indexContent = await fs.readFile(this.USERS_INDEX, 'utf-8');
      const index = JSON.parse(indexContent);
      
      index[user.email] = user.id;
      
      await fs.writeFile(this.USERS_INDEX, JSON.stringify(index, null, 2));

      console.log(`User ${user.id} saved successfully`);
    } catch (error) {
      console.error('Failed to save user:', error);
      throw new Error('User save failed');
    }
  }

  /**
   * Get current user from request (for API routes)
   */
  static async getCurrentUser(request: Request): Promise<User | null> {
    try {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
      }

      const token = authHeader.substring(7);
      const payload = await this.verifyToken(token);
      
      if (!payload) {
        return null;
      }

      return await this.getUserById(payload.userId);
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }
}