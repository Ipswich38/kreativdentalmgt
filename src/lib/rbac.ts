// Role-Based Access Control (RBAC) System
import { UserRole, Permission, PermissionAction, RolePermissions } from '@/types/auth';

// Define resource types in the dental management system
export enum Resource {
  // Patient Management
  PATIENTS = 'patients',
  PATIENT_RECORDS = 'patient_records',
  PATIENT_BILLING = 'patient_billing',

  // Appointment Management
  APPOINTMENTS = 'appointments',
  SCHEDULE = 'schedule',

  // Treatment Management
  TREATMENTS = 'treatments',
  TREATMENT_PLANS = 'treatment_plans',
  PRESCRIPTIONS = 'prescriptions',

  // Financial Management
  INVOICES = 'invoices',
  PAYMENTS = 'payments',
  FINANCIAL_REPORTS = 'financial_reports',

  // Inventory Management
  INVENTORY = 'inventory',
  SUPPLIES = 'supplies',

  // Staff Management
  STAFF = 'staff',
  STAFF_SCHEDULES = 'staff_schedules',

  // System Administration
  CLINIC_SETTINGS = 'clinic_settings',
  USER_MANAGEMENT = 'user_management',
  SYSTEM_LOGS = 'system_logs',

  // Reports
  REPORTS = 'reports',
  ANALYTICS = 'analytics'
}

// Define permissions for each role
export const rolePermissions: any = {
  [UserRole.SUPER_ADMIN]: [
    // Full system access
    { id: 'sa_1', name: 'Full Access', description: 'Complete system access', resource: '*', action: PermissionAction.MANAGE }
  ],

  [UserRole.CLINIC_ADMIN]: [
    // Patient Management
    { id: 'ca_1', name: 'Manage Patients', description: 'Full patient management', resource: Resource.PATIENTS, action: PermissionAction.MANAGE },
    { id: 'ca_2', name: 'Manage Patient Records', description: 'Full patient records access', resource: Resource.PATIENT_RECORDS, action: PermissionAction.MANAGE },
    { id: 'ca_3', name: 'Manage Patient Billing', description: 'Full billing access', resource: Resource.PATIENT_BILLING, action: PermissionAction.MANAGE },

    // Appointment Management
    { id: 'ca_4', name: 'Manage Appointments', description: 'Full appointment management', resource: Resource.APPOINTMENTS, action: PermissionAction.MANAGE },
    { id: 'ca_5', name: 'Manage Schedule', description: 'Full schedule management', resource: Resource.SCHEDULE, action: PermissionAction.MANAGE },

    // Staff Management
    { id: 'ca_6', name: 'Manage Staff', description: 'Full staff management', resource: Resource.STAFF, action: PermissionAction.MANAGE },
    { id: 'ca_7', name: 'Manage Staff Schedules', description: 'Staff scheduling', resource: Resource.STAFF_SCHEDULES, action: PermissionAction.MANAGE },

    // Financial Management
    { id: 'ca_8', name: 'Manage Invoices', description: 'Invoice management', resource: Resource.INVOICES, action: PermissionAction.MANAGE },
    { id: 'ca_9', name: 'Manage Payments', description: 'Payment management', resource: Resource.PAYMENTS, action: PermissionAction.MANAGE },
    { id: 'ca_10', name: 'View Financial Reports', description: 'Financial reporting', resource: Resource.FINANCIAL_REPORTS, action: PermissionAction.READ },

    // Inventory
    { id: 'ca_11', name: 'Manage Inventory', description: 'Inventory management', resource: Resource.INVENTORY, action: PermissionAction.MANAGE },

    // Settings and Reports
    { id: 'ca_12', name: 'Manage Clinic Settings', description: 'Clinic configuration', resource: Resource.CLINIC_SETTINGS, action: PermissionAction.MANAGE },
    { id: 'ca_13', name: 'View Reports', description: 'All reports access', resource: Resource.REPORTS, action: PermissionAction.READ }
  ],

  [UserRole.OFFICE_MANAGER]: [
    // Patient Management
    { id: 'om_1', name: 'Manage Patients', description: 'Patient information management', resource: Resource.PATIENTS, action: PermissionAction.MANAGE },
    { id: 'om_2', name: 'View Patient Records', description: 'Patient records viewing', resource: Resource.PATIENT_RECORDS, action: PermissionAction.READ },
    { id: 'om_3', name: 'Manage Patient Billing', description: 'Billing management', resource: Resource.PATIENT_BILLING, action: PermissionAction.MANAGE },

    // Appointment Management
    { id: 'om_4', name: 'Manage Appointments', description: 'Appointment scheduling', resource: Resource.APPOINTMENTS, action: PermissionAction.MANAGE },
    { id: 'om_5', name: 'Manage Schedule', description: 'Schedule management', resource: Resource.SCHEDULE, action: PermissionAction.MANAGE },

    // Financial
    { id: 'om_6', name: 'Manage Invoices', description: 'Invoice processing', resource: Resource.INVOICES, action: PermissionAction.MANAGE },
    { id: 'om_7', name: 'Manage Payments', description: 'Payment processing', resource: Resource.PAYMENTS, action: PermissionAction.MANAGE },
    { id: 'om_8', name: 'View Financial Reports', description: 'Financial reporting', resource: Resource.FINANCIAL_REPORTS, action: PermissionAction.READ },

    // Inventory
    { id: 'om_9', name: 'Manage Inventory', description: 'Supply management', resource: Resource.INVENTORY, action: PermissionAction.MANAGE },

    // Staff Schedules
    { id: 'om_10', name: 'View Staff Schedules', description: 'Staff schedule viewing', resource: Resource.STAFF_SCHEDULES, action: PermissionAction.READ },

    // Reports
    { id: 'om_11', name: 'View Reports', description: 'Operational reports', resource: Resource.REPORTS, action: PermissionAction.READ }
  ],

  [UserRole.DENTIST]: [
    // Patient Management
    { id: 'd_1', name: 'View Patients', description: 'Patient information viewing', resource: Resource.PATIENTS, action: PermissionAction.READ },
    { id: 'd_2', name: 'Manage Patient Records', description: 'Patient medical records', resource: Resource.PATIENT_RECORDS, action: PermissionAction.MANAGE },

    // Treatment Management
    { id: 'd_3', name: 'Manage Treatments', description: 'Treatment management', resource: Resource.TREATMENTS, action: PermissionAction.MANAGE },
    { id: 'd_4', name: 'Manage Treatment Plans', description: 'Treatment planning', resource: Resource.TREATMENT_PLANS, action: PermissionAction.MANAGE },
    { id: 'd_5', name: 'Manage Prescriptions', description: 'Prescription management', resource: Resource.PRESCRIPTIONS, action: PermissionAction.MANAGE },

    // Appointment Management
    { id: 'd_6', name: 'View Appointments', description: 'Appointment viewing', resource: Resource.APPOINTMENTS, action: PermissionAction.READ },
    { id: 'd_7', name: 'View Schedule', description: 'Schedule viewing', resource: Resource.SCHEDULE, action: PermissionAction.READ },

    // Reports
    { id: 'd_8', name: 'View Patient Reports', description: 'Patient-related reports', resource: Resource.REPORTS, action: PermissionAction.READ }
  ],

  [UserRole.SPECIALIST_DENTIST]: [
    // Patient Management
    { id: 'd_1', name: 'View Patients', description: 'Patient information viewing', resource: Resource.PATIENTS, action: PermissionAction.READ },
    { id: 'd_2', name: 'Manage Patient Records', description: 'Patient medical records', resource: Resource.PATIENT_RECORDS, action: PermissionAction.MANAGE },

    // Treatment Management
    { id: 'd_3', name: 'Manage Treatments', description: 'Treatment management', resource: Resource.TREATMENTS, action: PermissionAction.MANAGE },
    { id: 'd_4', name: 'Manage Treatment Plans', description: 'Treatment planning', resource: Resource.TREATMENT_PLANS, action: PermissionAction.MANAGE },
    { id: 'd_5', name: 'Manage Prescriptions', description: 'Prescription management', resource: Resource.PRESCRIPTIONS, action: PermissionAction.MANAGE },

    // Appointment Management
    { id: 'd_6', name: 'View Appointments', description: 'Appointment viewing', resource: Resource.APPOINTMENTS, action: PermissionAction.READ },
    { id: 'd_7', name: 'View Schedule', description: 'Schedule viewing', resource: Resource.SCHEDULE, action: PermissionAction.READ },

    // Reports
    { id: 'd_8', name: 'View Patient Reports', description: 'Patient-related reports', resource: Resource.REPORTS, action: PermissionAction.READ },

    // Additional specialist permissions
    { id: 'sd_1', name: 'Advanced Treatment Plans', description: 'Complex treatment planning', resource: Resource.TREATMENT_PLANS, action: PermissionAction.MANAGE },
    { id: 'sd_2', name: 'Specialist Reports', description: 'Specialized reporting', resource: Resource.REPORTS, action: PermissionAction.READ }
  ],

  [UserRole.DENTAL_ASSISTANT]: [
    // Patient Management
    { id: 'da_1', name: 'View Patients', description: 'Patient information viewing', resource: Resource.PATIENTS, action: PermissionAction.READ },
    { id: 'da_2', name: 'Update Patient Records', description: 'Basic patient record updates', resource: Resource.PATIENT_RECORDS, action: PermissionAction.UPDATE },

    // Appointment Management
    { id: 'da_3', name: 'View Appointments', description: 'Appointment viewing', resource: Resource.APPOINTMENTS, action: PermissionAction.READ },
    { id: 'da_4', name: 'View Schedule', description: 'Schedule viewing', resource: Resource.SCHEDULE, action: PermissionAction.READ },

    // Inventory
    { id: 'da_5', name: 'Update Inventory', description: 'Inventory updates', resource: Resource.INVENTORY, action: PermissionAction.UPDATE },
    { id: 'da_6', name: 'View Supplies', description: 'Supply viewing', resource: Resource.SUPPLIES, action: PermissionAction.READ }
  ],

  [UserRole.RECEPTIONIST]: [
    // Patient Management
    { id: 'r_1', name: 'Manage Patients', description: 'Basic patient management', resource: Resource.PATIENTS, action: PermissionAction.MANAGE },
    { id: 'r_2', name: 'View Patient Records', description: 'Limited patient records', resource: Resource.PATIENT_RECORDS, action: PermissionAction.READ },

    // Appointment Management
    { id: 'r_3', name: 'Manage Appointments', description: 'Appointment booking', resource: Resource.APPOINTMENTS, action: PermissionAction.MANAGE },
    { id: 'r_4', name: 'View Schedule', description: 'Schedule viewing', resource: Resource.SCHEDULE, action: PermissionAction.READ },

    // Billing
    { id: 'r_5', name: 'Manage Patient Billing', description: 'Basic billing operations', resource: Resource.PATIENT_BILLING, action: PermissionAction.MANAGE },
    { id: 'r_6', name: 'Create Invoices', description: 'Invoice creation', resource: Resource.INVOICES, action: PermissionAction.CREATE },
    { id: 'r_7', name: 'Process Payments', description: 'Payment processing', resource: Resource.PAYMENTS, action: PermissionAction.CREATE }
  ]
};

// RBAC Functions
export class RBACManager {
  static hasPermission(
    userRole: UserRole,
    resource: Resource | string,
    action: PermissionAction
  ): boolean {
    const permissions = rolePermissions[userRole];

    // Check for super admin
    if (userRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Check specific permissions
    return permissions.some((permission: Permission) =>
      (permission.resource === resource || permission.resource === '*') &&
      (permission.action === action || permission.action === PermissionAction.MANAGE)
    );
  }

  static getUserPermissions(userRole: UserRole): Permission[] {
    return rolePermissions[userRole] || [];
  }

  static canAccessRoute(userRole: UserRole, route: string): boolean {
    // Define route-to-resource mapping
    const routeResourceMap: { [key: string]: { resource: Resource; action: PermissionAction } } = {
      '/patients': { resource: Resource.PATIENTS, action: PermissionAction.READ },
      '/patients/new': { resource: Resource.PATIENTS, action: PermissionAction.CREATE },
      '/appointments': { resource: Resource.APPOINTMENTS, action: PermissionAction.READ },
      '/schedule': { resource: Resource.SCHEDULE, action: PermissionAction.READ },
      '/treatments': { resource: Resource.TREATMENTS, action: PermissionAction.READ },
      '/billing': { resource: Resource.INVOICES, action: PermissionAction.READ },
      '/inventory': { resource: Resource.INVENTORY, action: PermissionAction.READ },
      '/staff': { resource: Resource.STAFF, action: PermissionAction.READ },
      '/reports': { resource: Resource.REPORTS, action: PermissionAction.READ },
      '/settings': { resource: Resource.CLINIC_SETTINGS, action: PermissionAction.READ }
    };

    const routePermission = routeResourceMap[route];
    if (!routePermission) {
      return false;
    }

    return this.hasPermission(userRole, routePermission.resource, routePermission.action);
  }
}