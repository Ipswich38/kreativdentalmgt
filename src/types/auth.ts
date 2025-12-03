// Authentication and User Types for Dental Management System

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  clinicId: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export enum UserRole {
  // Administrative Roles
  CLINIC_ADMIN = 'clinic_admin',
  OFFICE_MANAGER = 'office_manager',

  // Staff Roles
  RECEPTIONIST = 'receptionist',
  DENTAL_ASSISTANT = 'dental_assistant',

  // Dentist Roles
  DENTIST = 'dentist',
  SPECIALIST_DENTIST = 'specialist_dentist',

  // System Role
  SUPER_ADMIN = 'super_admin'
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: PermissionAction;
}

export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage'
}

export interface RolePermissions {
  [UserRole.SUPER_ADMIN]: Permission[];
  [UserRole.CLINIC_ADMIN]: Permission[];
  [UserRole.OFFICE_MANAGER]: Permission[];
  [UserRole.DENTIST]: Permission[];
  [UserRole.SPECIALIST_DENTIST]: Permission[];
  [UserRole.DENTAL_ASSISTANT]: Permission[];
  [UserRole.RECEPTIONIST]: Permission[];
}

// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: Omit<User, 'password'>;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthSession {
  user: Omit<User, 'password'>;
  token: string;
  isAuthenticated: boolean;
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  clinicId: string;
  iat: number;
  exp: number;
}