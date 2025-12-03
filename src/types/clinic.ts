// Multi-tenant Clinic Management Types

import { User } from './auth';

export interface Clinic {
  id: string;
  name: string;
  subdomain: string; // For clinic1.dentalapp.com
  customDomain?: string; // For clinic's own domain

  // Contact Information
  contact: ClinicContact;

  // Address (Philippine format)
  address: ClinicAddress;

  // Business Details
  businessInfo: ClinicBusinessInfo;

  // Subscription & Billing
  subscription: ClinicSubscription;

  // Settings & Configuration
  settings: ClinicSettings;

  // Status & Metadata
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Owner/Admin
  ownerId: string;
}

export interface ClinicContact {
  email: string;
  phone: string;
  mobilePhone?: string;
  website?: string;

  // Social Media (optional)
  facebook?: string;
  instagram?: string;
}

export interface ClinicAddress {
  street: string;
  barangay?: string;
  city: string;
  province: string;
  zipCode: string;
  region: PhilippineRegion;

  // Additional location details
  landmarks?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface ClinicBusinessInfo {
  // Business Registration
  businessType: 'sole_proprietorship' | 'partnership' | 'corporation';
  businessRegistrationNumber?: string;
  tin?: string; // Tax Identification Number

  // Professional Licenses
  prcLicenseNumber?: string; // Professional Regulation Commission
  dohLicenseNumber?: string; // Department of Health

  // PhilHealth Information
  philHealthProvider?: {
    accreditationNumber: string;
    accreditationLevel: string;
    expiryDate: Date;
  };

  // Operating Hours (Philippine timezone)
  operatingHours: OperatingHours;
}

export interface OperatingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;

  // Holiday schedules
  holidays: HolidaySchedule[];
}

export interface DaySchedule {
  isOpen: boolean;
  openTime?: string; // "09:00"
  closeTime?: string; // "18:00"
  breakStart?: string; // "12:00"
  breakEnd?: string; // "13:00"
}

export interface HolidaySchedule {
  date: Date;
  name: string;
  isOpen: boolean;
  specialHours?: {
    openTime: string;
    closeTime: string;
  };
}

export interface ClinicSubscription {
  plan: SubscriptionPlan;
  status: 'trial' | 'active' | 'past_due' | 'canceled' | 'suspended';

  // Billing
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingDate?: Date;

  // Usage tracking
  monthlyActiveUsers: number;
  monthlyPatients: number;
  storageUsed: number; // in MB

  // Limits based on plan
  limits: SubscriptionLimits;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;

  // Pricing in Philippine Peso
  monthlyPrice: number;
  annualPrice?: number;

  // Features
  features: string[];

  // Limits
  maxUsers: number;
  maxPatients: number;
  storageLimit: number; // in MB

  // Additional features
  hasAdvancedReports: boolean;
  hasInventoryManagement: boolean;
  hasTreatmentPlanning: boolean;
  hasPhilHealthIntegration: boolean;
  hasCustomBranding: boolean;
}

export interface SubscriptionLimits {
  maxUsers: number;
  maxPatients: number;
  storageLimit: number;
  maxMonthlyAppointments?: number;
  maxMonthlyInvoices?: number;
}

export interface ClinicSettings {
  // Localization
  timezone: string; // "Asia/Manila"
  locale: string; // "en-PH"
  currency: string; // "PHP"
  dateFormat: string;
  timeFormat: '12h' | '24h';

  // Business preferences
  appointmentDuration: number; // minutes
  bufferTime: number; // minutes between appointments
  advanceBookingLimit: number; // days
  cancellationPolicy: string;

  // Payment & Billing
  acceptedPaymentMethods: PaymentMethod[];
  defaultPaymentTerms: number; // days

  // Philippine-specific
  philHealthSettings?: {
    isAccredited: boolean;
    defaultClaimType: string;
    requiresAuthorization: boolean;
  };

  seniorCitizenDiscount: {
    enabled: boolean;
    percentage: number; // 20% for SC/PWD
    requiresValidId: boolean;
  };

  // Notifications
  emailNotifications: NotificationSettings;
  smsNotifications: NotificationSettings;

  // Branding (for custom domains)
  branding?: ClinicBranding;
}

export interface PaymentMethod {
  type: 'cash' | 'credit_card' | 'debit_card' | 'gcash' | 'paymaya' | 'bank_transfer' | 'check' | 'installment';
  enabled: boolean;
  processingFee?: number;
}

export interface NotificationSettings {
  appointmentReminders: boolean;
  appointmentConfirmations: boolean;
  paymentReminders: boolean;
  treatmentFollowUps: boolean;

  // Staff notifications
  newAppointments: boolean;
  cancellations: boolean;
  emergencies: boolean;
}

export interface ClinicBranding {
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily?: string;

  // Email templates
  emailHeader?: string;
  emailFooter?: string;
}

// Philippine-specific enums
export enum PhilippineRegion {
  NCR = 'National Capital Region',
  CAR = 'Cordillera Administrative Region',
  REGION_I = 'Ilocos Region',
  REGION_II = 'Cagayan Valley',
  REGION_III = 'Central Luzon',
  REGION_IV_A = 'CALABARZON',
  REGION_IV_B = 'MIMAROPA',
  REGION_V = 'Bicol Region',
  REGION_VI = 'Western Visayas',
  REGION_VII = 'Central Visayas',
  REGION_VIII = 'Eastern Visayas',
  REGION_IX = 'Zamboanga Peninsula',
  REGION_X = 'Northern Mindanao',
  REGION_XI = 'Davao Region',
  REGION_XII = 'SOCCSKSARGEN',
  REGION_XIII = 'Caraga',
  BARMM = 'Bangsamoro Autonomous Region in Muslim Mindanao',
}

// Multi-tenant data isolation interfaces
export interface TenantContext {
  clinicId: string;
  clinic: Clinic;
  user: User;
}

export interface MultiTenantQuery {
  clinicId: string;
  [key: string]: any;
}

// Clinic onboarding types
export interface ClinicOnboardingData {
  // Step 1: Basic Information
  basicInfo: {
    clinicName: string;
    subdomain: string;
    ownerEmail: string;
    ownerFirstName: string;
    ownerLastName: string;
    ownerPassword: string;
  };

  // Step 2: Contact & Location
  contactInfo: ClinicContact;
  address: ClinicAddress;

  // Step 3: Business Details
  businessInfo: Partial<ClinicBusinessInfo>;

  // Step 4: Subscription
  selectedPlan: string;
  paymentMethod?: string;
}

export interface ClinicInvitation {
  id: string;
  clinicId: string;
  email: string;
  role: string;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  isUsed: boolean;
  createdAt: Date;
}