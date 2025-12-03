// Appointment Management Server Actions
// Based on Apexo Appointment workflows with conflict detection

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  CreateAppointmentSchema,
  UpdateAppointmentSchema,
  type CreateAppointmentFormData,
  type UpdateAppointmentFormData,
  type Appointment
} from '@/types/apexo-domain'
import { getCurrentClinicId, requireAuth } from '@/lib/auth-utils'

export type AppointmentActionResult = {
  success: boolean
  data?: Appointment | Appointment[]
  error?: string
  fieldErrors?: Record<string, string[]>
  conflicts?: AppointmentConflict[]
}

export interface AppointmentConflict {
  appointmentId: string
  patientName: string
  startTime: string
  endTime: string
  dentistName: string
}

/**
 * Create a new appointment with conflict detection
 * Workflow from Apexo: Create appointment with dentist availability check
 */
export async function createAppointment(
  formData: CreateAppointmentFormData
): Promise<AppointmentActionResult> {
  try {
    const { user, clinicId } = await requireAuth()

    // Validate input data
    const validationResult = CreateAppointmentSchema.safeParse({
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

    const appointmentData = validationResult.data
    const supabase = createClient()

    // Convert Apexo time format (Unix timestamp and minutes) to PostgreSQL format
    const appointmentDate = new Date(appointmentData.date)
    const startTime = minutesToTimeString(appointmentData.time)
    const endTime = minutesToTimeString(appointmentData.time + 60) // Default 60 minutes

    // Check for appointment conflicts (similar to Apexo's conflict detection)
    const conflicts = await checkAppointmentConflicts(
      clinicId,
      appointmentData.staffIds,
      appointmentDate,
      startTime,
      endTime
    )

    if (conflicts.length > 0) {
      return {
        success: false,
        error: 'Appointment conflicts detected',
        conflicts
      }
    }

    // Verify patient exists and belongs to clinic
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('id', appointmentData.patientId)
      .eq('clinic_id', clinicId)
      .single()

    if (patientError || !patient) {
      return {
        success: false,
        error: 'Patient not found or access denied'
      }
    }

    // Create the appointment
    const { data: appointment, error: createError } = await supabase
      .from('appointments')
      .insert({
        clinic_id: clinicId,
        patient_id: appointmentData.patientId,
        dentist_id: appointmentData.staffIds[0] || user.id,
        appointment_date: appointmentDate.toISOString().split('T')[0],
        start_time: startTime,
        end_time: endTime,
        duration_minutes: 60,
        appointment_type: 'consultation', // Default type
        chief_complaint: appointmentData.complaint,
        notes: appointmentData.notes,
        status: appointmentData.status,
        treatments_planned: [], // Will be updated later
        estimated_cost: appointmentData.finalPrice || 0,
        created_by: user.id
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating appointment:', createError)
      return {
        success: false,
        error: 'Failed to create appointment'
      }
    }

    // Add staff associations if multiple staff members
    if (appointmentData.staffIds.length > 1) {
      const staffAssociations = appointmentData.staffIds.slice(1).map(staffId => ({
        appointment_id: appointment.id,
        staff_id: staffId,
        role: 'assistant'
      }))

      await supabase
        .from('appointment_staff')
        .insert(staffAssociations)
    }

    // Create prescriptions if provided
    if (appointmentData.prescriptions.length > 0) {
      const prescriptions = appointmentData.prescriptions.map(pres => ({
        clinic_id: clinicId,
        appointment_id: appointment.id,
        patient_id: appointmentData.patientId,
        prescribed_by_id: appointmentData.staffIds[0] || user.id,
        medication_name: pres.prescription,
        instructions: pres.prescription
      }))

      await supabase
        .from('prescriptions')
        .insert(prescriptions)
    }

    // Log the activity
    await supabase
      .from('activity_logs')
      .insert({
        clinic_id: clinicId,
        user_id: user.id,
        action: 'create',
        resource_type: 'appointment',
        resource_id: appointment.id,
        description: `Created appointment for patient ${appointmentData.patientId}`
      })

    revalidatePath('/dashboard/appointments')
    revalidatePath('/dashboard/calendar')

    return {
      success: true,
      data: appointment as Appointment
    }

  } catch (error) {
    console.error('Error in createAppointment:', error)
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

/**
 * Update appointment with conflict checking
 * Workflow from Apexo: Update with validation and conflict detection
 */
export async function updateAppointment(
  appointmentId: string,
  formData: UpdateAppointmentFormData
): Promise<AppointmentActionResult> {
  try {
    const { user, clinicId } = await requireAuth()

    // Validate input data
    const validationResult = UpdateAppointmentSchema.safeParse(formData)

    if (!validationResult.success) {
      return {
        success: false,
        error: 'Validation failed',
        fieldErrors: validationResult.error.flatten().fieldErrors
      }
    }

    const updateData = validationResult.data
    const supabase = createClient()

    // Verify appointment exists and user has access
    const { data: existingAppointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('clinic_id', clinicId)
      .single()

    if (fetchError || !existingAppointment) {
      return {
        success: false,
        error: 'Appointment not found or access denied'
      }
    }

    // Build update object
    const updateObject: any = { updated_at: new Date().toISOString() }

    // Check for time/date conflicts if time is being changed
    if (updateData.date !== undefined || updateData.time !== undefined) {
      const newDate = updateData.date
        ? new Date(updateData.date)
        : new Date(existingAppointment.appointment_date)

      const newStartTime = updateData.time !== undefined
        ? minutesToTimeString(updateData.time)
        : existingAppointment.start_time

      const newEndTime = updateData.time !== undefined
        ? minutesToTimeString(updateData.time + 60)
        : existingAppointment.end_time

      // Check conflicts excluding current appointment
      const conflicts = await checkAppointmentConflicts(
        clinicId,
        updateData.staffIds || [existingAppointment.dentist_id],
        newDate,
        newStartTime,
        newEndTime,
        appointmentId // Exclude current appointment
      )

      if (conflicts.length > 0) {
        return {
          success: false,
          error: 'Appointment conflicts detected',
          conflicts
        }
      }

      updateObject.appointment_date = newDate.toISOString().split('T')[0]
      updateObject.start_time = newStartTime
      updateObject.end_time = newEndTime
    }

    if (updateData.complaint !== undefined) {
      updateObject.chief_complaint = updateData.complaint
    }

    if (updateData.diagnosis !== undefined) {
      updateObject.diagnosis = updateData.diagnosis
    }

    if (updateData.notes !== undefined) {
      updateObject.notes = updateData.notes
    }

    if (updateData.status !== undefined) {
      updateObject.status = updateData.status
    }

    if (updateData.finalPrice !== undefined) {
      updateObject.actual_cost = updateData.finalPrice
    }

    if (updateData.isDone !== undefined) {
      updateObject.status = updateData.isDone ? 'completed' : 'scheduled'
    }

    // Update appointment
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update(updateObject)
      .eq('id', appointmentId)
      .eq('clinic_id', clinicId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating appointment:', updateError)
      return {
        success: false,
        error: 'Failed to update appointment'
      }
    }

    // Update staff associations if changed
    if (updateData.staffIds !== undefined) {
      // Remove existing associations
      await supabase
        .from('appointment_staff')
        .delete()
        .eq('appointment_id', appointmentId)

      // Add new associations
      if (updateData.staffIds.length > 1) {
        const staffAssociations = updateData.staffIds.slice(1).map(staffId => ({
          appointment_id: appointmentId,
          staff_id: staffId,
          role: 'assistant'
        }))

        await supabase
          .from('appointment_staff')
          .insert(staffAssociations)
      }

      // Update primary dentist
      await supabase
        .from('appointments')
        .update({ dentist_id: updateData.staffIds[0] })
        .eq('id', appointmentId)
    }

    // Log the change
    await supabase
      .from('activity_logs')
      .insert({
        clinic_id: clinicId,
        user_id: user.id,
        action: 'update',
        resource_type: 'appointment',
        resource_id: appointmentId,
        old_values: existingAppointment,
        new_values: updatedAppointment,
        description: `Updated appointment ${appointmentId}`
      })

    revalidatePath('/dashboard/appointments')
    revalidatePath('/dashboard/calendar')
    revalidatePath(`/dashboard/appointments/${appointmentId}`)

    return {
      success: true,
      data: updatedAppointment as Appointment
    }

  } catch (error) {
    console.error('Error in updateAppointment:', error)
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

/**
 * Cancel appointment
 * Workflow from Apexo: Appointment cancellation with reason
 */
export async function cancelAppointment(
  appointmentId: string,
  reason?: string
): Promise<AppointmentActionResult> {
  try {
    const { user, clinicId } = await requireAuth()
    const supabase = createClient()

    const { data: appointment, error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .eq('clinic_id', clinicId)
      .select()
      .single()

    if (error) {
      return {
        success: false,
        error: 'Failed to cancel appointment'
      }
    }

    // Log the cancellation
    await supabase
      .from('activity_logs')
      .insert({
        clinic_id: clinicId,
        user_id: user.id,
        action: 'cancel',
        resource_type: 'appointment',
        resource_id: appointmentId,
        description: `Cancelled appointment: ${reason || 'No reason provided'}`
      })

    revalidatePath('/dashboard/appointments')
    revalidatePath('/dashboard/calendar')

    return {
      success: true,
      data: appointment as Appointment
    }

  } catch (error) {
    console.error('Error in cancelAppointment:', error)
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

/**
 * Get appointments for a specific date range
 * Workflow from Apexo: Calendar view with computed properties
 */
export async function getAppointmentsByDateRange(
  startDate: Date,
  endDate: Date,
  dentistId?: string
): Promise<AppointmentActionResult> {
  try {
    const { clinicId } = await requireAuth()
    const supabase = createClient()

    let query = supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(id, first_name, last_name, phone),
        dentist:users!appointments_dentist_id_fkey(id, first_name, last_name),
        treatment:treatment_templates(name),
        payments:payments(amount, status)
      `)
      .eq('clinic_id', clinicId)
      .gte('appointment_date', startDate.toISOString().split('T')[0])
      .lte('appointment_date', endDate.toISOString().split('T')[0])
      .order('appointment_date')
      .order('start_time')

    if (dentistId) {
      query = query.eq('dentist_id', dentistId)
    }

    const { data: appointments, error } = await query

    if (error) {
      return {
        success: false,
        error: 'Failed to fetch appointments'
      }
    }

    // Add computed properties similar to Apexo
    const appointmentsWithComputedProps = appointments?.map(apt => ({
      ...apt,
      isPaid: (apt.payments?.filter((p: any) => p.status === 'confirmed')
        .reduce((sum: number, p: any) => sum + p.amount, 0) || 0) >= (apt.actual_cost || 0),
      outstandingAmount: Math.max(0, (apt.actual_cost || 0) -
        (apt.payments?.filter((p: any) => p.status === 'confirmed')
          .reduce((sum: number, p: any) => sum + p.amount, 0) || 0)),
      formattedTime: `${apt.start_time} - ${apt.end_time}`,
      isUpcoming: new Date(`${apt.appointment_date}T${apt.start_time}`) > new Date(),
      isPast: new Date(`${apt.appointment_date}T${apt.end_time}`) < new Date()
    }))

    return {
      success: true,
      data: appointmentsWithComputedProps as Appointment[]
    }

  } catch (error) {
    console.error('Error in getAppointmentsByDateRange:', error)
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

// Helper Functions

/**
 * Convert minutes from midnight to time string
 */
function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`
}

/**
 * Check for appointment conflicts
 */
async function checkAppointmentConflicts(
  clinicId: string,
  staffIds: string[],
  date: Date,
  startTime: string,
  endTime: string,
  excludeAppointmentId?: string
): Promise<AppointmentConflict[]> {
  const supabase = createClient()

  let query = supabase
    .from('appointments')
    .select(`
      id,
      start_time,
      end_time,
      patient:patients(first_name, last_name),
      dentist:users!appointments_dentist_id_fkey(first_name, last_name)
    `)
    .eq('clinic_id', clinicId)
    .eq('appointment_date', date.toISOString().split('T')[0])
    .neq('status', 'cancelled')
    .in('dentist_id', staffIds)

  if (excludeAppointmentId) {
    query = query.neq('id', excludeAppointmentId)
  }

  const { data: existingAppointments } = await query

  const conflicts: AppointmentConflict[] = []

  existingAppointments?.forEach(existing => {
    // Check for time overlap
    const existingStart = timeStringToMinutes(existing.start_time)
    const existingEnd = timeStringToMinutes(existing.end_time)
    const newStart = timeStringToMinutes(startTime)
    const newEnd = timeStringToMinutes(endTime)

    if (
      (newStart >= existingStart && newStart < existingEnd) ||
      (newEnd > existingStart && newEnd <= existingEnd) ||
      (newStart <= existingStart && newEnd >= existingEnd)
    ) {
      conflicts.push({
        appointmentId: existing.id,
        patientName: `${existing.patient.first_name} ${existing.patient.last_name}`,
        startTime: existing.start_time,
        endTime: existing.end_time,
        dentistName: `${existing.dentist.first_name} ${existing.dentist.last_name}`
      })
    }
  })

  return conflicts
}

/**
 * Convert time string to minutes from midnight
 */
function timeStringToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number)
  return hours * 60 + minutes
}