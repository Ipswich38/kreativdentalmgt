// Authentication utilities
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWTPayload, User, UserRole } from '@/types/auth';

// Environment variables with fallbacks for development
const JWT_SECRET = process.env.JWT_SECRET || 'dental-management-dev-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dental-management-refresh-dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export class AuthUtils {
  // Hash password
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Verify password
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Generate access token
  static generateToken(user: Omit<User, 'password'>): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    return jwt.sign(payload, JWT_SECRET as string);
  }

  // Generate refresh token
  static generateRefreshToken(userId: string): string {
    return jwt.sign({ userId }, JWT_REFRESH_SECRET as string);
  }

  // Verify access token
  static verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET as string) as JWTPayload;
      return decoded;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  // Verify refresh token
  static verifyRefreshToken(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET as string) as { userId: string };
      return decoded;
    } catch (error) {
      console.error('Refresh token verification failed:', error);
      return null;
    }
  }

  // Extract token from Authorization header
  static extractTokenFromHeader(authHeader: string | undefined | null): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  // Validate email format
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate password strength
  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Generate secure random password
  static generateSecurePassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@$!%*?&';
    let password = '';

    // Ensure at least one character from each required category
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '@$!%*?&'[Math.floor(Math.random() * 7)];

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}

// Production-ready authentication service interface
export interface AuthService {
  authenticateUser(email: string, password: string, clinicId?: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  updateLastLogin(userId: string): Promise<void>;
  createUser(userData: CreateUserData): Promise<User>;
  updateUser(userId: string, updates: Partial<User>): Promise<User | null>;
  deactivateUser(userId: string): Promise<boolean>;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  clinicId: string;
}

// Placeholder service - will be replaced with Supabase implementation
export class ProductionAuthService implements AuthService {
  async authenticateUser(email: string, password: string, clinicId?: string): Promise<User | null> {
    // TODO: Implement with Supabase
    throw new Error('Production authentication not implemented - requires Supabase setup');
  }

  async getUserById(id: string): Promise<User | null> {
    // TODO: Implement with Supabase
    throw new Error('User lookup not implemented - requires Supabase setup');
  }

  async updateLastLogin(userId: string): Promise<void> {
    // TODO: Implement with Supabase
    throw new Error('Last login update not implemented - requires Supabase setup');
  }

  async createUser(userData: CreateUserData): Promise<User> {
    // TODO: Implement with Supabase
    throw new Error('User creation not implemented - requires Supabase setup');
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    // TODO: Implement with Supabase
    throw new Error('User update not implemented - requires Supabase setup');
  }

  async deactivateUser(userId: string): Promise<boolean> {
    // TODO: Implement with Supabase
    throw new Error('User deactivation not implemented - requires Supabase setup');
  }
}