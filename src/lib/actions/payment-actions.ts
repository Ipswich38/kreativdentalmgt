// Payment Processing Server Actions
// Based on enhanced payment model beyond Apexo's embedded payment system

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  CreatePaymentSchema,
  UpdatePaymentSchema,
  type CreatePaymentFormData,
  type UpdatePaymentFormData,
  type Payment,
  type PaymentMethodType,
  PaymentWithReferencesSchema
} from '@/types/apexo-domain'
import { getCurrentClinicId, requireAuth } from '@/lib/auth-utils'

export type PaymentActionResult = {
  success: boolean
  data?: Payment | Payment[]
  error?: string
  fieldErrors?: Record<string, string[]>
  validationErrors?: string[]
}

/**
 * Record a new payment with Philippine payment method validation
 * Workflow enhanced from Apexo's embedded payment model
 */
export async function recordPayment(
  formData: CreatePaymentFormData
): Promise<PaymentActionResult> {
  try {
    const { user, clinicId } = await requireAuth()

    // Validate input data with enhanced validation for Philippine payment methods
    const validationResult = PaymentWithReferencesSchema.safeParse({
      ...formData,
      clinicId,
      receivedBy: user.id
    })

    if (!validationResult.success) {
      return {
        success: false,
        error: 'Validation failed',
        fieldErrors: validationResult.error.flatten().fieldErrors
      }
    }

    const paymentData = validationResult.data
    const supabase = createClient()

    // Additional Philippine payment method validation
    const paymentValidation = validatePaymentMethod(
      paymentData.paymentMethod,
      paymentData.transactionReference,
      paymentData.amount
    )

    if (!paymentValidation.isValid) {
      return {
        success: false,
        error: 'Payment validation failed',
        validationErrors: paymentValidation.errors
      }
    }

    // Verify patient exists and belongs to clinic
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, first_name, last_name')
      .eq('id', paymentData.patientId)
      .eq('clinic_id', clinicId)
      .single()

    if (patientError || !patient) {
      return {
        success: false,
        error: 'Patient not found or access denied'
      }
    }

    // Generate payment number
    const paymentNumber = await generatePaymentNumber(clinicId)

    // Determine verification status based on payment method
    const verificationStatus = paymentData.paymentMethod === 'cash'
      ? 'verified'
      : 'pending'

    // Create payment record
    const { data: payment, error: createError } = await supabase
      .from('payments')
      .insert({
        clinic_id: clinicId,
        patient_id: paymentData.patientId,
        invoice_id: paymentData.invoiceId,
        payment_number: paymentNumber,
        payment_date: paymentData.paymentDate,
        amount: paymentData.amount,
        payment_method: paymentData.paymentMethod,
        payment_category: paymentData.paymentCategory,
        transaction_reference: paymentData.transactionReference,
        external_transaction_id: paymentData.externalTransactionId,
        authorization_code: paymentData.authorizationCode,
        verification_status: verificationStatus,
        payment_details: paymentData.paymentDetails,
        receipt_url: paymentData.receiptUrl,
        supporting_documents: paymentData.supportingDocuments,
        notes: paymentData.notes,
        internal_notes: paymentData.internalNotes,
        received_by: user.id,
        status: 'pending'
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating payment:', createError)
      return {
        success: false,
        error: 'Failed to record payment'
      }
    }

    // Auto-verify cash payments
    if (paymentData.paymentMethod === 'cash') {
      await supabase
        .from('payments')
        .update({
          status: 'confirmed',
          verified_by: user.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', payment.id)
    }

    // Update appointment payment status if linked
    if (paymentData.appointmentId) {
      await updateAppointmentPaymentStatus(paymentData.appointmentId, clinicId)
    }

    // Update invoice payment status if linked
    if (paymentData.invoiceId) {
      await updateInvoicePaymentStatus(paymentData.invoiceId, clinicId)
    }

    // Log the payment
    await supabase
      .from('activity_logs')
      .insert({
        clinic_id: clinicId,
        user_id: user.id,
        action: 'create',
        resource_type: 'payment',
        resource_id: payment.id,
        description: `Recorded ${paymentData.paymentMethod} payment of ₱${(paymentData.amount / 100).toFixed(2)} for ${patient.first_name} ${patient.last_name}`
      })

    revalidatePath('/dashboard/payments')
    revalidatePath('/dashboard/patients')
    revalidatePath('/dashboard/billing')

    return {
      success: true,
      data: payment as Payment
    }

  } catch (error) {
    console.error('Error in recordPayment:', error)
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

/**
 * Verify payment transaction (for non-cash payments)
 */
export async function verifyPayment(
  paymentId: string,
  verificationNotes?: string,
  verified: boolean = true
): Promise<PaymentActionResult> {
  try {
    const { user, clinicId } = await requireAuth()
    const supabase = createClient()

    // Verify payment exists and user has access
    const { data: existingPayment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('clinic_id', clinicId)
      .single()

    if (fetchError || !existingPayment) {
      return {
        success: false,
        error: 'Payment not found or access denied'
      }
    }

    // Check if payment is already verified
    if (existingPayment.verification_status === 'verified') {
      return {
        success: false,
        error: 'Payment is already verified'
      }
    }

    // Update payment verification status
    const updateData: any = {
      verification_status: verified ? 'verified' : 'rejected',
      verification_notes: verificationNotes,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (verified) {
      updateData.status = 'confirmed'
    } else {
      updateData.status = 'failed'
    }

    const { data: payment, error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', paymentId)
      .eq('clinic_id', clinicId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating payment verification:', updateError)
      return {
        success: false,
        error: 'Failed to update payment verification'
      }
    }

    // Update related appointment/invoice if payment was verified
    if (verified) {
      if (existingPayment.appointment_id) {
        await updateAppointmentPaymentStatus(existingPayment.appointment_id, clinicId)
      }
      if (existingPayment.invoice_id) {
        await updateInvoicePaymentStatus(existingPayment.invoice_id, clinicId)
      }
    }

    // Log the verification
    await supabase
      .from('activity_logs')
      .insert({
        clinic_id: clinicId,
        user_id: user.id,
        action: verified ? 'verify' : 'reject',
        resource_type: 'payment',
        resource_id: paymentId,
        description: `${verified ? 'Verified' : 'Rejected'} payment ${existingPayment.payment_number}: ${verificationNotes || 'No notes provided'}`
      })

    revalidatePath('/dashboard/payments')
    revalidatePath('/dashboard/billing')

    return {
      success: true,
      data: payment as Payment
    }

  } catch (error) {
    console.error('Error in verifyPayment:', error)
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

/**
 * Get payments requiring verification
 */
export async function getPaymentsForVerification(): Promise<PaymentActionResult> {
  try {
    const { clinicId } = await requireAuth()
    const supabase = createClient()

    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        patient:patients(first_name, last_name),
        received_by_user:users!payments_received_by_fkey(first_name, last_name)
      `)
      .eq('clinic_id', clinicId)
      .eq('verification_status', 'pending')
      .neq('payment_method', 'cash') // Cash payments are auto-verified
      .order('created_at', { ascending: false })

    if (error) {
      return {
        success: false,
        error: 'Failed to fetch payments for verification'
      }
    }

    return {
      success: true,
      data: payments as Payment[]
    }

  } catch (error) {
    console.error('Error in getPaymentsForVerification:', error)
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

/**
 * Get patient payment history with computed balances
 */
export async function getPatientPaymentHistory(patientId: string): Promise<PaymentActionResult> {
  try {
    const { clinicId } = await requireAuth()
    const supabase = createClient()

    // Get payments with related data
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        appointment:appointments(appointment_date, estimated_cost, actual_cost),
        invoice:invoices(invoice_number, total_amount),
        received_by_user:users!payments_received_by_fkey(first_name, last_name)
      `)
      .eq('clinic_id', clinicId)
      .eq('patient_id', patientId)
      .order('payment_date', { ascending: false })

    if (error) {
      return {
        success: false,
        error: 'Failed to fetch payment history'
      }
    }

    // Calculate running balance
    let runningBalance = 0
    const paymentsWithBalance = payments?.map(payment => {
      if (payment.status === 'confirmed') {
        runningBalance += payment.amount
      }
      return {
        ...payment,
        runningBalance,
        formattedAmount: `₱${(payment.amount / 100).toFixed(2)}`
      }
    }).reverse() // Show chronological order

    return {
      success: true,
      data: paymentsWithBalance as Payment[]
    }

  } catch (error) {
    console.error('Error in getPatientPaymentHistory:', error)
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

// Helper Functions

/**
 * Validate payment method based on Philippine payment standards
 */
function validatePaymentMethod(
  paymentMethod: PaymentMethodType,
  transactionReference?: string,
  amount?: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Cash payments don't need validation
  if (paymentMethod === 'cash') {
    return { isValid: true, errors: [] }
  }

  // All non-cash payments require transaction reference
  if (!transactionReference) {
    errors.push('Transaction reference is required for non-cash payments')
    return { isValid: false, errors }
  }

  // Method-specific validation
  switch (paymentMethod) {
    case 'gcash':
      if (!/^\d{13}$/.test(transactionReference)) {
        errors.push('GCash reference must be 13 digits')
      }
      break

    case 'paymaya':
      if (!/^[A-Z0-9]{6,20}$/.test(transactionReference)) {
        errors.push('PayMaya reference must be 6-20 alphanumeric characters')
      }
      break

    case 'bank_transfer':
      if (transactionReference.length < 6 || transactionReference.length > 30) {
        errors.push('Bank transfer reference must be 6-30 characters')
      }
      break

    case 'check':
      if (!/^\d{6,12}$/.test(transactionReference)) {
        errors.push('Check number must be 6-12 digits')
      }
      break
  }

  return { isValid: errors.length === 0, errors }
}

/**
 * Generate unique payment number
 */
async function generatePaymentNumber(clinicId: string): Promise<string> {
  const supabase = createClient()
  const today = new Date()
  const year = today.getFullYear()
  const month = (today.getMonth() + 1).toString().padStart(2, '0')

  // Get last payment number for this month
  const { data: lastPayment } = await supabase
    .from('payments')
    .select('payment_number')
    .eq('clinic_id', clinicId)
    .like('payment_number', `PAY-${year}${month}-%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  let sequence = 1
  if (lastPayment) {
    const lastSequence = parseInt(lastPayment.payment_number.split('-')[2])
    sequence = lastSequence + 1
  }

  return `PAY-${year}${month}-${sequence.toString().padStart(4, '0')}`
}

/**
 * Update appointment payment status
 */
async function updateAppointmentPaymentStatus(appointmentId: string, clinicId: string) {
  const supabase = createClient()

  // Calculate total confirmed payments for appointment
  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .eq('appointment_id', appointmentId)
    .eq('status', 'confirmed')

  const totalPaid = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0

  // Get appointment cost
  const { data: appointment } = await supabase
    .from('appointments')
    .select('actual_cost, estimated_cost')
    .eq('id', appointmentId)
    .single()

  const totalCost = appointment?.actual_cost || appointment?.estimated_cost || 0

  // Update appointment payment status
  // This could be used to set a payment_status field on appointments if needed
}

/**
 * Update invoice payment status
 */
async function updateInvoicePaymentStatus(invoiceId: string, clinicId: string) {
  const supabase = createClient()

  // Calculate total confirmed payments for invoice
  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .eq('invoice_id', invoiceId)
    .eq('status', 'confirmed')

  const totalPaid = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0

  // Get invoice total
  const { data: invoice } = await supabase
    .from('invoices')
    .select('total_amount')
    .eq('id', invoiceId)
    .single()

  const totalAmount = invoice?.total_amount || 0

  // Determine payment status
  let paymentStatus = 'pending'
  if (totalPaid >= totalAmount) {
    paymentStatus = 'paid'
  } else if (totalPaid > 0) {
    paymentStatus = 'partial'
  }

  // Update invoice payment status
  await supabase
    .from('invoices')
    .update({ payment_status: paymentStatus })
    .eq('id', invoiceId)
}