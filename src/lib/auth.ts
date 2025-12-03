// Authentication utilities
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWTPayload, User } from '@/types/auth';

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
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  // Generate refresh token
  static generateRefreshToken(userId: string): string {
    return jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
  }

  // Verify access token
  static verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      return decoded;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  // Verify refresh token
  static verifyRefreshToken(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string };
      return decoded;
    } catch (error) {
      console.error('Refresh token verification failed:', error);
      return null;
    }
  }

  // Extract token from Authorization header
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
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

// Mock user data for development (will be replaced with Supabase)
export const mockUsers: (User & { password: string })[] = [
  {
    id: '1',
    email: 'admin@kreativdental.com',
    password: '$2b$12$tdXB8U6kP7YQqO86D/VPSeCQpT6yAa12bDiOW4SJ5jkFuEN2p1gz.', // password: Admin123!
    firstName: 'Dr. Sarah',
    lastName: 'Johnson',
    role: 'clinic_admin' as any,
    isActive: true,
    clinicId: 'clinic_1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
    lastLogin: undefined
  },
  {
    id: '2',
    email: 'dentist@kreativdental.com',
    password: '$2b$12$7CF5q04sjiu1tFzcGAUCcODVAId6zIhVtigg6lejrPKphZrSOJzLS', // password: Dentist123!
    firstName: 'Dr. Michael',
    lastName: 'Smith',
    role: 'dentist' as any,
    isActive: true,
    clinicId: 'clinic_1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
    lastLogin: undefined
  },
  {
    id: '3',
    email: 'staff@kreativdental.com',
    password: '$2b$12$LxsEeZVZoqNbTzqYmo8XfOZXSHSIudtZMzpSkr.WtXN0UQ.UfI4F.', // password: Staff123!
    firstName: 'Jennifer',
    lastName: 'Davis',
    role: 'receptionist' as any,
    isActive: true,
    clinicId: 'clinic_1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
    lastLogin: undefined
  }
];

// Mock authentication service (will be replaced with Supabase)
export class MockAuthService {
  static async authenticateUser(email: string, password: string): Promise<User | null> {
    const user = mockUsers.find(u => u.email === email && u.isActive);

    if (!user) {
      return null;
    }

    const isValidPassword = await AuthUtils.verifyPassword(password, user.password);
    if (!isValidPassword) {
      return null;
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static async getUserById(id: string): Promise<User | null> {
    const user = mockUsers.find(u => u.id === id && u.isActive);
    if (!user) {
      return null;
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static async updateLastLogin(userId: string): Promise<void> {
    const user = mockUsers.find(u => u.id === userId);
    if (user) {
      user.lastLogin = new Date();
    }
  }
}