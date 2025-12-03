// Patient Management Server Actions
// Based on Apexo Patient workflows

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  CreatePatientSchema,
  UpdatePatientSchema,
  type CreatePatientFormData,
  type UpdatePatientFormData,
  type Patient
} from '@/types/apexo-domain'
import { getCurrentClinicId, requireAuth } from '@/lib/auth-utils'

export type PatientActionResult = {
  success: boolean
  data?: Patient
  error?: string
  fieldErrors?: Record<string, string[]>
}

/**
 * Create a new patient
 * Workflow from Apexo: Basic patient creation with validation
 */
export async function createPatient(formData: CreatePatientFormData): Promise<PatientActionResult> {
  try {
    // Authentication and authorization
    const { user, clinicId } = await requireAuth()

    // Validate input data
    const validationResult = CreatePatientSchema.safeParse({
      ...formData,
      clinicId,
      createdBy: user.id
    })

    if (!validationResult.success) {
      return {
        success: false,
        error: 'Validation failed',
        fieldErrors: validationResult.error.flatten().fieldErrors
      }
    }

    const patientData = validationResult.data
    const supabase = createClient()

    // Check for duplicate patient number if provided
    if (patientData.name) {
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id')
        .eq('clinic_id', clinicId)
        .eq('name', patientData.name)
        .single()

      if (existingPatient) {
        return {
          success: false,
          error: 'A patient with this name already exists'
        }
      }
    }

    // Generate patient number (clinic-specific)
    const { data: lastPatient } = await supabase
      .from('patients')
      .select('patient_number')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const patientNumber = lastPatient
      ? String(parseInt(lastPatient.patient_number) + 1).padStart(6, '0')
      : '000001'

    // Insert patient record
    const { data: patient, error } = await supabase
      .from('patients')
      .insert({
        clinic_id: clinicId,
        patient_number: patientNumber,
        first_name: patientData.name.split(' ')[0],
        last_name: patientData.name.split(' ').slice(1).join(' ') || '',
        date_of_birth: patientData.birthYear ? new Date(patientData.birthYear, 0, 1) : null,
        gender: patientData.gender,
        email: patientData.email || null,
        phone: patientData.phone || null,
        street: patientData.address || null,
        medical_history: { conditions: patientData.medicalHistory },
        allergies: patientData.allergies || [],
        medications: patientData.medications || [],
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating patient:', error)
      return {
        success: false,
        error: 'Failed to create patient'
      }
    }

    // Revalidate patient list
    revalidatePath('/dashboard/patients')

    return {
      success: true,
      data: patient as Patient
    }

  } catch (error) {
    console.error('Error in createPatient:', error)
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

/**
 * Update an existing patient
 * Workflow from Apexo: Update patient with change tracking
 */
export async function updatePatient(
  patientId: string,
  formData: UpdatePatientFormData
): Promise<PatientActionResult> {
  try {
    const { user, clinicId } = await requireAuth()

    // Validate input data
    const validationResult = UpdatePatientSchema.safeParse(formData)

    if (!validationResult.success) {
      return {
        success: false,
        error: 'Validation failed',
        fieldErrors: validationResult.error.flatten().fieldErrors
      }
    }

    const updateData = validationResult.data
    const supabase = createClient()

    // Verify patient exists and user has access
    const { data: existingPatient, error: fetchError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .eq('clinic_id', clinicId)
      .single()

    if (fetchError || !existingPatient) {
      return {
        success: false,
        error: 'Patient not found or access denied'
      }
    }

    // Build update object
    const updateObject: any = {}

    if (updateData.name) {
      const nameParts = updateData.name.split(' ')
      updateObject.first_name = nameParts[0]
      updateObject.last_name = nameParts.slice(1).join(' ')
    }

    if (updateData.birthYear !== undefined) {
      updateObject.date_of_birth = updateData.birthYear
        ? new Date(updateData.birthYear, 0, 1)
        : null
    }

    if (updateData.gender !== undefined) {
      updateObject.gender = updateData.gender
    }

    if (updateData.email !== undefined) {
      updateObject.email = updateData.email || null
    }

    if (updateData.phone !== undefined) {
      updateObject.phone = updateData.phone || null
    }

    if (updateData.address !== undefined) {
      updateObject.street = updateData.address || null
    }

    if (updateData.medicalHistory !== undefined) {
      updateObject.medical_history = {
        ...existingPatient.medical_history,
        conditions: updateData.medicalHistory
      }
    }

    // Update patient record
    const { data: updatedPatient, error: updateError } = await supabase
      .from('patients')
      .update({
        ...updateObject,
        updated_at: new Date().toISOString()
      })
      .eq('id', patientId)
      .eq('clinic_id', clinicId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating patient:', updateError)
      return {
        success: false,
        error: 'Failed to update patient'
      }
    }

    // Log the change for audit trail (similar to Apexo's change tracking)
    await supabase
      .from('activity_logs')
      .insert({
        clinic_id: clinicId,
        user_id: user.id,
        action: 'update',
        resource_type: 'patient',
        resource_id: patientId,
        old_values: existingPatient,
        new_values: updatedPatient,
        description: `Updated patient: ${updateData.name || existingPatient.first_name} ${existingPatient.last_name}`
      })

    revalidatePath('/dashboard/patients')
    revalidatePath(`/dashboard/patients/${patientId}`)

    return {
      success: true,
      data: updatedPatient as Patient
    }

  } catch (error) {
    console.error('Error in updatePatient:', error)
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

/**
 * Search patients with filters
 * Workflow from Apexo: Searchable string functionality
 */
export async function searchPatients(query: string, filters?: {
  isActive?: boolean
  hasOutstandingBalance?: boolean
}): Promise<PatientActionResult> {
  try {
    const { clinicId } = await requireAuth()
    const supabase = createClient()

    let queryBuilder = supabase
      .from('patients')
      .select(`
        *,
        appointments:appointments(count),
        payments:payments(amount)
      `)
      .eq('clinic_id', clinicId)

    // Apply search query (similar to Apexo's searchableString)
    if (query.trim()) {
      queryBuilder = queryBuilder.or(`
        first_name.ilike.%${query}%,
        last_name.ilike.%${query}%,
        email.ilike.%${query}%,
        phone.ilike.%${query}%,
        patient_number.ilike.%${query}%
      `)
    }

    // Apply filters
    if (filters?.isActive !== undefined) {
      queryBuilder = queryBuilder.eq('is_active', filters.isActive)
    }

    const { data: patients, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return {
        success: false,
        error: 'Failed to search patients'
      }
    }

    return {
      success: true,
      data: patients as any
    }

  } catch (error) {
    console.error('Error in searchPatients:', error)
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

/**
 * Get patient with computed properties (like Apexo)
 * Includes: appointments, payments, outstanding amounts
 */
export async function getPatientWithComputedProps(patientId: string): Promise<PatientActionResult> {
  try {
    const { clinicId } = await requireAuth()
    const supabase = createClient()

    // Get patient with related data
    const { data: patient, error } = await supabase
      .from('patients')
      .select(`
        *,
        appointments:appointments(
          *,
          payments:payments(amount, status)
        )
      `)
      .eq('id', patientId)
      .eq('clinic_id', clinicId)
      .single()

    if (error || !patient) {
      return {
        success: false,
        error: 'Patient not found'
      }
    }

    // Calculate computed properties (similar to Apexo's computed fields)
    const now = new Date()
    const birthYear = patient.date_of_birth ? new Date(patient.date_of_birth).getFullYear() : null
    const age = birthYear ? now.getFullYear() - birthYear : null

    // Calculate financial totals
    const totalPayments = patient.appointments?.reduce((sum: number, apt: any) => {
      const aptPayments = apt.payments?.reduce((aptSum: number, payment: any) => {
        return payment.status === 'confirmed' ? aptSum + payment.amount : aptSum
      }, 0) || 0
      return sum + aptPayments
    }, 0) || 0

    const totalBilled = patient.appointments?.reduce((sum: number, apt: any) => {
      return sum + (apt.final_price || 0)
    }, 0) || 0

    const outstandingAmount = totalBilled - totalPayments
    const overpaidAmount = totalPayments > totalBilled ? totalPayments - totalBilled : 0

    // Find last and next appointments
    const appointments = patient.appointments?.sort((a: any, b: any) =>
      new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
    ) || []

    const lastAppointment = appointments
      .filter((apt: any) => new Date(apt.appointment_date) < now)
      .pop()

    const nextAppointment = appointments
      .find((apt: any) => new Date(apt.appointment_date) > now && apt.status !== 'cancelled')

    return {
      success: true,
      data: {
        ...patient,
        age,
        totalPayments,
        outstandingAmount,
        overpaidAmount,
        lastAppointment,
        nextAppointment,
        appointments
      } as any
    }

  } catch (error) {
    console.error('Error in getPatientWithComputedProps:', error)
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}