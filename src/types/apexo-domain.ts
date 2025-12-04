// TypeScript Interfaces based on Apexo Domain Model Analysis
// Mapped to Supabase PostgreSQL schema

import { z } from 'zod'

// ==============================================
// PATIENT DOMAIN (Based on Apexo Patient Model)
// ==============================================

export interface Patient {
  id: string
  clinicId: string

  // Basic Information (from Apexo)
  name: string
  birthYear?: number
  gender?: 'male' | 'female' | 'other'

  // Contact Information
  email?: string
  phone?: string
  address?: string

  // Medical Information (from Apexo)
  medicalHistory: string[]
  allergies?: string[]
  medications?: string[]

  // Classification (from Apexo tags and labels)
  tags?: string
  labels: PatientLabel[]

  // Photos/Documentation (from Apexo gallery)
  avatarUrl?: string
  galleryUrls: string[]

  // Dental Chart (from Apexo teeth data)
  dentalChart: TeethRecord[]

  // Computed properties (like Apexo)
  isActive: boolean

  // Metadata
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface PatientLabel {
  id: string
  text: string
  color?: string
}

export interface TeethRecord {
  toothNumber: number
  status: string
  treatments: ToothTreatment[]
  notes?: string
}

export interface ToothTreatment {
  treatmentId: string
  date: Date
  surface?: string
  status: 'planned' | 'in_progress' | 'completed'
  notes?: string
}

// Zod Schemas for Patient
export const PatientLabelSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1),
  color: z.string().optional()
})

export const ToothTreatmentSchema = z.object({
  treatmentId: z.string().uuid(),
  date: z.coerce.date(),
  surface: z.string().optional(),
  status: z.enum(['planned', 'in_progress', 'completed']),
  notes: z.string().optional()
})

export const TeethRecordSchema = z.object({
  toothNumber: z.number().min(1).max(32),
  status: z.string(),
  treatments: z.array(ToothTreatmentSchema).default([]),
  notes: z.string().optional()
})

export const PatientSchema = z.object({
  id: z.string().uuid().optional(),
  clinicId: z.string().uuid(),

  // Basic Information
  name: z.string().min(1, 'Name is required'),
  birthYear: z.number().min(1900).max(new Date().getFullYear()).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),

  // Contact Information
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),

  // Medical Information
  medicalHistory: z.array(z.string()).default([]),
  allergies: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),

  // Classification
  tags: z.string().optional(),
  labels: z.array(PatientLabelSchema).default([]),

  // Photos/Documentation
  avatarUrl: z.string().url().optional(),
  galleryUrls: z.array(z.string().url()).default([]),

  // Dental Chart
  dentalChart: z.array(TeethRecordSchema).default([]),

  // Status
  isActive: z.boolean().default(true),

  // Metadata
  createdBy: z.string().uuid(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
})

// ==============================================
// APPOINTMENT DOMAIN (Based on Apexo Appointment Model)
// ==============================================

export interface Appointment {
  id: string
  clinicId: string

  // Relationships (from Apexo)
  patientId: string
  staffIds: string[] // Operating staff from Apexo
  treatmentId?: string

  // Date and Time (from Apexo)
  date: number // Unix timestamp like Apexo
  time: number // Time in minutes from midnight

  // Clinical Information (from Apexo)
  complaint?: string // Chief complaint
  diagnosis?: string
  notes?: string

  // Treatment Details (from Apexo)
  involvedTeeth: number[] // Array of tooth numbers
  units: number // Treatment units

  // Financial Information (from Apexo)
  finalPrice?: number // in centavos
  paidAmount?: number // in centavos

  // Status (from Apexo isDone and computed properties)
  isDone: boolean
  status: AppointmentStatus

  // Timer functionality (from Apexo)
  timer?: number // Timer in seconds

  // Prescriptions (from Apexo)
  prescriptions: AppointmentPrescription[]

  // Metadata
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface AppointmentPrescription {
  id: string
  prescription: string
}

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

// Zod Schemas for Appointment
export const AppointmentPrescriptionSchema = z.object({
  id: z.string().uuid(),
  prescription: z.string().min(1)
})

export const AppointmentSchema = z.object({
  id: z.string().uuid().optional(),
  clinicId: z.string().uuid(),

  // Relationships
  patientId: z.string().uuid(),
  staffIds: z.array(z.string().uuid()).default([]),
  treatmentId: z.string().uuid().optional(),

  // Date and Time
  date: z.number().int().positive(), // Unix timestamp
  time: z.number().int().min(0).max(1439), // 0-1439 minutes in a day

  // Clinical Information
  complaint: z.string().optional(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),

  // Treatment Details
  involvedTeeth: z.array(z.number().min(1).max(32)).default([]),
  units: z.number().int().positive().default(1),

  // Financial Information
  finalPrice: z.number().int().optional(), // in centavos
  paidAmount: z.number().int().optional(), // in centavos

  // Status
  isDone: z.boolean().default(false),
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']).default('scheduled'),

  // Timer
  timer: z.number().int().optional(),

  // Prescriptions
  prescriptions: z.array(AppointmentPrescriptionSchema).default([]),

  // Metadata
  createdBy: z.string().uuid(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
})

// ==============================================
// STAFF DOMAIN (Based on Apexo StaffMember Model)
// ==============================================

export interface StaffMember {
  id: string
  clinicId: string
  authUserId?: string // Link to Supabase auth

  // Basic Information (from Apexo)
  name: string
  email: string
  phone?: string

  // Role and Status
  role: StaffRole
  operates: boolean // Can perform procedures (from Apexo)
  isActive: boolean

  // Work Schedule (from Apexo onDutyDays)
  onDutyDays: string[] // ['monday', 'tuesday', ...]

  // Security (from Apexo)
  pin?: string // Optional PIN for quick access

  // Permissions (from Apexo extensive permission model)
  permissions: StaffPermissions

  // Metadata
  createdAt: Date
  updatedAt: Date
}

export type StaffRole =
  | 'dentist'
  | 'assistant'
  | 'receptionist'
  | 'admin'

export interface StaffPermissions {
  // Edit permissions (from Apexo)
  canEditStaff: boolean
  canEditPatients: boolean
  canEditAppointments: boolean
  canEditTreatments: boolean
  canEditPrescriptions: boolean
  canEditSettings: boolean

  // View permissions (from Apexo)
  canViewStaff: boolean
  canViewPatients: boolean
  canViewAppointments: boolean
  canViewTreatments: boolean
  canViewPrescriptions: boolean
  canViewSettings: boolean
  canViewStats: boolean
}

// Zod Schemas for Staff
export const StaffPermissionsSchema = z.object({
  // Edit permissions
  canEditStaff: z.boolean().default(false),
  canEditPatients: z.boolean().default(false),
  canEditAppointments: z.boolean().default(false),
  canEditTreatments: z.boolean().default(false),
  canEditPrescriptions: z.boolean().default(false),
  canEditSettings: z.boolean().default(false),

  // View permissions
  canViewStaff: z.boolean().default(true),
  canViewPatients: z.boolean().default(true),
  canViewAppointments: z.boolean().default(true),
  canViewTreatments: z.boolean().default(true),
  canViewPrescriptions: z.boolean().default(true),
  canViewSettings: z.boolean().default(false),
  canViewStats: z.boolean().default(false)
})

export const StaffMemberSchema = z.object({
  id: z.string().uuid().optional(),
  clinicId: z.string().uuid(),
  authUserId: z.string().uuid().optional(),

  // Basic Information
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),

  // Role and Status
  role: z.enum(['dentist', 'assistant', 'receptionist', 'admin']),
  operates: z.boolean().default(false),
  isActive: z.boolean().default(true),

  // Work Schedule
  onDutyDays: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).default([]),

  // Security
  pin: z.string().length(4).optional(),

  // Permissions
  permissions: StaffPermissionsSchema.default({
    canEditStaff: false,
    canEditPatients: false,
    canEditAppointments: false,
    canEditTreatments: false,
    canEditPrescriptions: false,
    canEditSettings: false,
    canViewStaff: true,
    canViewPatients: true,
    canViewAppointments: true,
    canViewTreatments: true,
    canViewPrescriptions: true,
    canViewSettings: false,
    canViewStats: false
  }),

  // Metadata
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
})

// ==============================================
// TREATMENT DOMAIN (Based on Apexo Treatment Model)
// ==============================================

export interface Treatment {
  id: string
  clinicId: string

  // Basic Information (from Apexo)
  type: string // Treatment type/name
  expenses: number // Cost in centavos

  // Additional information for enhanced functionality
  description?: string
  duration?: number // Duration in minutes
  defaultPrice?: number // Default price in centavos

  // Status
  isActive: boolean

  // Metadata
  createdAt: Date
  updatedAt: Date
}

// Zod Schema for Treatment
export const TreatmentSchema = z.object({
  id: z.string().uuid().optional(),
  clinicId: z.string().uuid(),

  // Basic Information
  type: z.string().min(1, 'Treatment type is required'),
  expenses: z.number().int().nonnegative().default(0), // Cost in centavos

  // Additional information
  description: z.string().optional(),
  duration: z.number().int().positive().optional(), // Duration in minutes
  defaultPrice: z.number().int().nonnegative().optional(), // Price in centavos

  // Status
  isActive: z.boolean().default(true),

  // Metadata
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
})

// ==============================================
// PAYMENT DOMAIN (Enhanced from Apexo embedded payments)
// ==============================================

export interface Payment {
  id: string
  clinicId: string

  // Relationships
  patientId: string
  appointmentId?: string
  invoiceId?: string

  // Payment Details
  paymentNumber: string
  paymentDate: Date
  amount: number // in centavos

  // Payment Method (enhanced beyond Apexo)
  paymentMethod: PaymentMethodType
  paymentCategory: PaymentCategory

  // Transaction References (required for non-cash)
  transactionReference?: string
  externalTransactionId?: string
  authorizationCode?: string

  // Status and Verification
  status: PaymentStatus
  verificationStatus: VerificationStatus

  // Processing Details
  paymentDetails: Record<string, any>

  // Documentation
  receiptUrl?: string
  supportingDocuments: string[]

  // Notes
  notes?: string
  internalNotes?: string

  // Audit Trail
  receivedBy: string
  verifiedBy?: string
  verifiedAt?: Date

  // Metadata
  createdAt: Date
  updatedAt: Date
}

export type PaymentMethodType =
  | 'cash'
  | 'gcash'
  | 'paymaya'
  | 'bank_transfer'
  | 'credit_card'
  | 'debit_card'
  | 'check'

export type PaymentCategory =
  | 'cash'
  | 'digital_wallet'
  | 'bank'
  | 'card'
  | 'alternative'

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'verified'
  | 'confirmed'
  | 'failed'
  | 'cancelled'
  | 'refunded'

export type VerificationStatus =
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'requires_review'

// Zod Schemas for Payment
export const PaymentSchema = z.object({
  id: z.string().uuid().optional(),
  clinicId: z.string().uuid(),

  // Relationships
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),

  // Payment Details
  paymentNumber: z.string().min(1, 'Payment number is required'),
  paymentDate: z.coerce.date(),
  amount: z.number().int().positive('Amount must be positive'),

  // Payment Method
  paymentMethod: z.enum(['cash', 'gcash', 'paymaya', 'bank_transfer', 'credit_card', 'debit_card', 'check']),
  paymentCategory: z.enum(['cash', 'digital_wallet', 'bank', 'card', 'alternative']),

  // Transaction References
  transactionReference: z.string().optional(),
  externalTransactionId: z.string().optional(),
  authorizationCode: z.string().optional(),

  // Status
  status: z.enum(['pending', 'processing', 'verified', 'confirmed', 'failed', 'cancelled', 'refunded']).default('pending'),
  verificationStatus: z.enum(['pending', 'verified', 'rejected', 'requires_review']).default('pending'),

  // Processing Details
  paymentDetails: z.record(z.string(), z.any()).default({}),

  // Documentation
  receiptUrl: z.string().url().optional(),
  supportingDocuments: z.array(z.string().url()).default([]),

  // Notes
  notes: z.string().optional(),
  internalNotes: z.string().optional(),

  // Audit Trail
  receivedBy: z.string().uuid(),
  verifiedBy: z.string().uuid().optional(),
  verifiedAt: z.coerce.date().optional(),

  // Metadata
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
})

// Validation for non-cash payment requiring transaction reference
export const PaymentWithReferencesSchema = PaymentSchema.refine(
  (data) => {
    if (data.paymentMethod === 'cash') {
      return true // Cash payments don't need references
    }
    return data.transactionReference || data.externalTransactionId
  },
  {
    message: 'Non-cash payments require either transactionReference or externalTransactionId',
    path: ['transactionReference']
  }
)

// ==============================================
// FORM VALIDATION SCHEMAS (For API endpoints)
// ==============================================

// Create/Update schemas (excluding auto-generated fields)
export const CreatePatientSchema = PatientSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
})

export const UpdatePatientSchema = PatientSchema.partial().omit({
  id: true,
  clinicId: true,
  createdAt: true,
  updatedAt: true
})

export const CreateAppointmentSchema = AppointmentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
})

export const UpdateAppointmentSchema = AppointmentSchema.partial().omit({
  id: true,
  clinicId: true,
  createdAt: true,
  updatedAt: true
})

export const CreateStaffMemberSchema = StaffMemberSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
})

export const UpdateStaffMemberSchema = StaffMemberSchema.partial().omit({
  id: true,
  clinicId: true,
  createdAt: true,
  updatedAt: true
})

export const CreateTreatmentSchema = TreatmentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
})

export const UpdateTreatmentSchema = TreatmentSchema.partial().omit({
  id: true,
  clinicId: true,
  createdAt: true,
  updatedAt: true
})

export const CreatePaymentSchema = PaymentWithReferencesSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
})

export const UpdatePaymentSchema = PaymentSchema.partial().omit({
  id: true,
  clinicId: true,
  createdAt: true,
  updatedAt: true
})

// ==============================================
// COMPUTED PROPERTIES (Similar to Apexo's computed fields)
// ==============================================

export interface PatientComputedProps {
  age?: number
  totalPayments: number
  outstandingAmount: number
  overpaidAmount: number
  lastAppointment?: Appointment
  nextAppointment?: Appointment
  appointments: Appointment[]
}

export interface AppointmentComputedProps {
  isPaid: boolean
  outstandingAmount: number
  overpaidAmount: number
  operatingStaff: StaffMember[]
  patient: Patient
  treatment?: Treatment
  profit: number
  profitPercentage: number
  isOutstanding: boolean
  isOverpaid: boolean
  formattedTime: string
  spentTimeValue: number
}

// Type helpers for form handling
export type CreatePatientFormData = z.infer<typeof CreatePatientSchema>
export type UpdatePatientFormData = z.infer<typeof UpdatePatientSchema>
export type CreateAppointmentFormData = z.infer<typeof CreateAppointmentSchema>
export type UpdateAppointmentFormData = z.infer<typeof UpdateAppointmentSchema>
export type CreateStaffMemberFormData = z.infer<typeof CreateStaffMemberSchema>
export type UpdateStaffMemberFormData = z.infer<typeof UpdateStaffMemberSchema>
export type CreateTreatmentFormData = z.infer<typeof CreateTreatmentSchema>
export type UpdateTreatmentFormData = z.infer<typeof UpdateTreatmentSchema>
export type CreatePaymentFormData = z.infer<typeof CreatePaymentSchema>
export type UpdatePaymentFormData = z.infer<typeof UpdatePaymentSchema>