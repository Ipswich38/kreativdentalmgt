// Multi-tenant Architecture Implementation

import { NextRequest } from 'next/server';
import { Clinic, TenantContext } from '@/types/clinic';
import { User } from '@/types/auth';

export class MultiTenantManager {
  /**
   * Extract clinic ID from request context
   * Supports multiple strategies: subdomain, custom domain, header
   */
  static extractClinicContext(request: NextRequest): string | null {
    const host = request.headers.get('host') || '';
    const userAgent = request.headers.get('user-agent') || '';
    const clinicIdHeader = request.headers.get('x-clinic-id');

    // Strategy 1: Check for explicit clinic ID header
    if (clinicIdHeader) {
      return clinicIdHeader;
    }

    // Strategy 2: Extract from subdomain
    // Format: clinic-slug.dentalapp.com
    const subdomainMatch = host.match(/^([^.]+)\.dentalapp\.com$/);
    if (subdomainMatch) {
      return this.subdomainToClinicId(subdomainMatch[1]);
    }

    // Strategy 3: Check for custom domain mapping
    // This would require database lookup in production
    if (host && !host.includes('localhost') && !host.includes('vercel')) {
      return this.customDomainToClinicId(host);
    }

    // Strategy 4: Development fallback - check query parameter
    const url = new URL(request.url);
    const clinicParam = url.searchParams.get('clinic');
    if (clinicParam) {
      return clinicParam;
    }

    return null;
  }

  /**
   * Create tenant context for database queries
   */
  static createTenantContext(clinicId: string, user: User, clinic?: Clinic): TenantContext {
    return {
      clinicId,
      user,
      clinic: clinic || {} as Clinic, // Will be populated from database
    };
  }

  /**
   * Validate user access to clinic
   */
  static async validateClinicAccess(user: User, clinicId: string): Promise<boolean> {
    // Check if user belongs to the clinic
    if (user.clinicId !== clinicId) {
      return false;
    }

    // Additional checks can be added here:
    // - Check if clinic is active
    // - Check if user is active in this clinic
    // - Check subscription status

    return true;
  }

  /**
   * Apply tenant filtering to database queries
   */
  static applyTenantFilter<T extends Record<string, any>>(
    query: T,
    clinicId: string
  ): T & { clinicId: string } {
    return {
      ...query,
      clinicId,
    };
  }

  /**
   * Generate unique subdomain for clinic
   */
  static generateSubdomain(clinicName: string): string {
    return clinicName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  /**
   * Validate subdomain availability and format
   */
  static validateSubdomain(subdomain: string): { valid: boolean; error?: string } {
    // Check format
    const subdomainRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    if (!subdomainRegex.test(subdomain)) {
      return {
        valid: false,
        error: 'Subdomain must contain only letters, numbers, and hyphens',
      };
    }

    // Check length
    if (subdomain.length < 3 || subdomain.length > 50) {
      return {
        valid: false,
        error: 'Subdomain must be between 3 and 50 characters',
      };
    }

    // Check for reserved words
    const reservedWords = [
      'www', 'api', 'app', 'admin', 'dashboard', 'billing',
      'support', 'help', 'docs', 'blog', 'mail', 'email',
      'test', 'staging', 'dev', 'development', 'prod', 'production'
    ];

    if (reservedWords.includes(subdomain)) {
      return {
        valid: false,
        error: 'This subdomain is reserved and cannot be used',
      };
    }

    return { valid: true };
  }

  /**
   * Get clinic URL for different environments
   */
  static getClinicUrl(subdomain: string, environment: 'development' | 'production' = 'production'): string {
    const baseUrls = {
      development: 'localhost:3000',
      production: 'dentalapp.com', // Replace with your actual domain
    };

    const baseUrl = baseUrls[environment];

    if (environment === 'development') {
      return `http://${subdomain}.${baseUrl}`;
    }

    return `https://${subdomain}.${baseUrl}`;
  }

  // Private helper methods
  private static subdomainToClinicId(subdomain: string): string {
    // In production, this would query the database
    // For now, return the subdomain as clinic ID
    return `clinic_${subdomain}`;
  }

  private static customDomainToClinicId(domain: string): string {
    // In production, this would query the database for custom domain mappings
    // For now, return null to indicate no mapping found
    return `clinic_${domain.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }
}

/**
 * Middleware helper for multi-tenant routing
 */
export class TenantRouting {
  /**
   * Check if request is for a tenant-specific route
   */
  static isTenantRoute(pathname: string): boolean {
    // Routes that require tenant context
    const tenantRoutes = [
      '/dashboard',
      '/patients',
      '/appointments',
      '/treatments',
      '/billing',
      '/inventory',
      '/reports',
      '/settings',
      '/staff',
    ];

    return tenantRoutes.some(route => pathname.startsWith(route));
  }

  /**
   * Handle tenant resolution for routing
   */
  static handleTenantRouting(request: NextRequest): {
    clinicId: string | null;
    shouldRedirect: boolean;
    redirectUrl?: string;
  } {
    const pathname = request.nextUrl.pathname;
    const clinicId = MultiTenantManager.extractClinicContext(request);

    // If it's a tenant route but no clinic context, redirect to clinic selection
    if (this.isTenantRoute(pathname) && !clinicId) {
      return {
        clinicId: null,
        shouldRedirect: true,
        redirectUrl: '/select-clinic',
      };
    }

    // If it's the root route and we have clinic context, redirect to dashboard
    if (pathname === '/' && clinicId) {
      return {
        clinicId,
        shouldRedirect: true,
        redirectUrl: '/dashboard',
      };
    }

    return {
      clinicId,
      shouldRedirect: false,
    };
  }
}

/**
 * Data isolation utilities
 */
export class TenantDataManager {
  /**
   * Ensure all database operations are scoped to the current tenant
   */
  static scopeToTenant<T>(data: T, clinicId: string): T & { clinicId: string } {
    if (typeof data === 'object' && data !== null) {
      return {
        ...data,
        clinicId,
      };
    }

    throw new Error('Data must be an object to scope to tenant');
  }

  /**
   * Validate that data belongs to the current tenant
   */
  static validateTenantData(data: { clinicId?: string }, expectedClinicId: string): boolean {
    return data.clinicId === expectedClinicId;
  }

  /**
   * Remove tenant-specific data before sending to client (if needed)
   */
  static sanitizeForClient<T extends { clinicId?: string }>(data: T): Omit<T, 'clinicId'> {
    const { clinicId, ...sanitized } = data;
    return sanitized;
  }
}

/**
 * Subscription and billing utilities
 */
export class TenantBilling {
  /**
   * Check if clinic has access to a specific feature
   */
  static hasFeatureAccess(clinic: Clinic, feature: string): boolean {
    if (clinic.subscription.status !== 'active' && clinic.subscription.status !== 'trial') {
      return false;
    }

    // Basic plan features are always available
    const basicFeatures = ['appointments', 'patients', 'basic_reports'];
    if (basicFeatures.includes(feature)) {
      return true;
    }

    // Check subscription plan features
    return clinic.subscription.plan.features.includes(feature);
  }

  /**
   * Check usage limits
   */
  static checkUsageLimit(clinic: Clinic, type: 'users' | 'patients' | 'storage'): {
    withinLimit: boolean;
    current: number;
    limit: number;
    percentage: number;
  } {
    const limits = clinic.subscription.limits;
    let current: number;
    let limit: number;

    switch (type) {
      case 'users':
        current = clinic.subscription.monthlyActiveUsers;
        limit = limits.maxUsers;
        break;
      case 'patients':
        current = clinic.subscription.monthlyPatients;
        limit = limits.maxPatients;
        break;
      case 'storage':
        current = clinic.subscription.storageUsed;
        limit = limits.storageLimit;
        break;
      default:
        throw new Error(`Unknown usage type: ${type}`);
    }

    const percentage = (current / limit) * 100;

    return {
      withinLimit: current < limit,
      current,
      limit,
      percentage,
    };
  }
}

/**
 * Export commonly used functions
 */
export {
  MultiTenantManager as TenantManager,
  TenantRouting as Routing,
  TenantDataManager as DataManager,
  TenantBilling as Billing,
};