// Authentication utilities for server actions
// Helper functions for multi-tenant authentication and authorization

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export interface AuthenticatedUser {
  id: string
  email: string
  role: string
  clinicId: string
  firstName: string
  lastName: string
  permissions?: Record<string, boolean>
}

export interface AuthResult {
  user: AuthenticatedUser
  clinicId: string
}

/**
 * Require authentication and return user context
 * Throws if not authenticated or authorized
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = createClient()

  // Check Supabase auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Get user's clinic association and role
  const { data: staffMember, error: staffError } = await supabase
    .from('users')
    .select(`
      id,
      email,
      first_name,
      last_name,
      role,
      clinic_id,
      permissions,
      is_active
    `)
    .eq('email', user.email)
    .eq('is_active', true)
    .single()

  if (staffError || !staffMember) {
    console.error('Staff member not found:', staffError)
    redirect('/login')
  }

  return {
    user: {
      id: staffMember.id,
      email: staffMember.email,
      role: staffMember.role,
      clinicId: staffMember.clinic_id,
      firstName: staffMember.first_name,
      lastName: staffMember.last_name,
      permissions: staffMember.permissions || {}
    },
    clinicId: staffMember.clinic_id
  }
}

/**
 * Get current clinic ID (for convenience)
 */
export async function getCurrentClinicId(): Promise<string> {
  const { clinicId } = await requireAuth()
  return clinicId
}

/**
 * Check if user has specific permission
 */
export async function hasPermission(permission: string): Promise<boolean> {
  try {
    const { user } = await requireAuth()

    // Super admins have all permissions
    if (user.role === 'super_admin' || user.role === 'clinic_admin') {
      return true
    }

    // Check specific permission
    return user.permissions?.[permission] === true
  } catch {
    return false
  }
}

/**
 * Require specific permission
 */
export async function requirePermission(permission: string): Promise<AuthResult> {
  const authResult = await requireAuth()

  if (!await hasPermission(permission)) {
    throw new Error(`Access denied: ${permission} permission required`)
  }

  return authResult
}

/**
 * Check if user can access resource
 */
export async function canAccessResource(
  resourceType: string,
  action: 'read' | 'write' | 'delete' = 'read'
): Promise<boolean> {
  try {
    const { user } = await requireAuth()

    // Super admins can access everything
    if (user.role === 'super_admin' || user.role === 'clinic_admin') {
      return true
    }

    // Build permission key
    const permissionKey = `can${action === 'read' ? 'View' : action === 'write' ? 'Edit' : 'Delete'}${resourceType}`

    return user.permissions?.[permissionKey] === true
  } catch {
    return false
  }
}