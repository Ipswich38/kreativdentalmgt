// Payment Processing Service for Philippine Dental Clinics

import {
  PaymentTransaction,
  PaymentMethodType,
  PaymentCategory,
  PaymentStatus,
  VerificationStatus,
  WorkflowStage,
  PaymentFormData,
  PaymentValidationResult,
  PhilippinePaymentValidator,
  PaymentDetails,
  CashPaymentDetails,
  BankTransferDetails,
  DigitalWalletDetails,
  CardPaymentDetails,
  CheckPaymentDetails
} from '@/types/payment';
import { currency } from '@/lib/localization';

export class PaymentService {

  /**
   * Process a payment transaction with validation
   */
  static async processPayment(
    formData: PaymentFormData,
    clinicId: string,
    patientId: string,
    receivedBy: string,
    invoiceId?: string
  ): Promise<{ success: boolean; transaction?: PaymentTransaction; errors?: string[] }> {

    try {
      // Step 1: Validate payment data
      const validation = this.validatePaymentData(formData);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors.map(e => e.message)
        };
      }

      // Step 2: Generate payment number
      const paymentNumber = await this.generatePaymentNumber(clinicId, formData.paymentMethod);

      // Step 3: Determine payment category
      const paymentCategory = this.getPaymentCategory(formData.paymentMethod);

      // Step 4: Create transaction record
      const transaction: PaymentTransaction = {
        id: crypto.randomUUID(),
        clinicId,
        patientId,
        invoiceId,
        paymentNumber,
        paymentDate: formData.paymentDate,
        amount: formData.amount,
        paymentMethod: formData.paymentMethod,
        paymentCategory,
        transactionReference: formData.transactionReference
          ? PhilippinePaymentValidator.formatPaymentReference(
              formData.paymentMethod,
              formData.transactionReference
            )
          : undefined,
        paymentDetails: this.buildPaymentDetails(formData),
        verificationStatus: this.getInitialVerificationStatus(formData.paymentMethod),
        status: this.getInitialPaymentStatus(formData.paymentMethod),
        workflowStage: WorkflowStage.SUBMITTED,
        receiptUrl: undefined, // Will be set after receipt upload
        supportingDocuments: [],
        notes: formData.notes,
        receivedBy,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Step 5: Save to database (this would be implemented with Supabase)
      // await this.savePaymentTransaction(transaction);

      // Step 6: Trigger verification workflow for non-cash payments
      if (formData.paymentMethod !== PaymentMethodType.CASH) {
        await this.initiateVerificationWorkflow(transaction);
      }

      return {
        success: true,
        transaction
      };

    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        errors: ['An error occurred while processing the payment. Please try again.']
      };
    }
  }

  /**
   * Validate payment form data
   */
  private static validatePaymentData(formData: PaymentFormData): PaymentValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Validate amount
    if (!formData.amount || formData.amount <= 0) {
      errors.push({
        field: 'amount',
        message: 'Payment amount must be greater than zero',
        code: 'INVALID_AMOUNT'
      });
    }

    // Validate payment date
    if (!formData.paymentDate) {
      errors.push({
        field: 'paymentDate',
        message: 'Payment date is required',
        code: 'MISSING_DATE'
      });
    } else if (formData.paymentDate > new Date()) {
      errors.push({
        field: 'paymentDate',
        message: 'Payment date cannot be in the future',
        code: 'FUTURE_DATE'
      });
    }

    // Validate transaction reference
    const referenceValidation = PhilippinePaymentValidator.validatePaymentReference(
      formData.paymentMethod,
      formData.transactionReference || ''
    );

    errors.push(...referenceValidation.errors);
    warnings.push(...referenceValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get payment category based on method
   */
  private static getPaymentCategory(method: PaymentMethodType): PaymentCategory {
    const categoryMap: Record<PaymentMethodType, PaymentCategory> = {
      [PaymentMethodType.CASH]: PaymentCategory.CASH,
      [PaymentMethodType.BANK_TRANSFER]: PaymentCategory.BANK,
      [PaymentMethodType.ONLINE_BANKING]: PaymentCategory.BANK,
      [PaymentMethodType.INSTAPAY]: PaymentCategory.BANK,
      [PaymentMethodType.PESONET]: PaymentCategory.BANK,
      [PaymentMethodType.GCASH]: PaymentCategory.DIGITAL_WALLET,
      [PaymentMethodType.PAYMAYA]: PaymentCategory.DIGITAL_WALLET,
      [PaymentMethodType.GRABPAY]: PaymentCategory.DIGITAL_WALLET,
      [PaymentMethodType.SHOPEEPAY]: PaymentCategory.DIGITAL_WALLET,
      [PaymentMethodType.CREDIT_CARD]: PaymentCategory.CARD,
      [PaymentMethodType.DEBIT_CARD]: PaymentCategory.CARD,
      [PaymentMethodType.CHECK]: PaymentCategory.ALTERNATIVE,
      [PaymentMethodType.INSTALLMENT]: PaymentCategory.ALTERNATIVE,
      [PaymentMethodType.CRYPTOCURRENCY]: PaymentCategory.ALTERNATIVE,
      [PaymentMethodType.BUY_NOW_PAY_LATER]: PaymentCategory.ALTERNATIVE,
      [PaymentMethodType.STORE_CREDIT]: PaymentCategory.ALTERNATIVE
    };

    return categoryMap[method] || PaymentCategory.ALTERNATIVE;
  }

  /**
   * Build payment details based on method
   */
  private static buildPaymentDetails(formData: PaymentFormData): PaymentDetails {
    switch (formData.paymentMethod) {
      case PaymentMethodType.CASH:
        return {
          type: 'cash',
          ...formData.paymentDetails
        } as CashPaymentDetails;

      case PaymentMethodType.BANK_TRANSFER:
      case PaymentMethodType.INSTAPAY:
      case PaymentMethodType.PESONET:
      case PaymentMethodType.ONLINE_BANKING:
        return {
          type: 'bank_transfer',
          referenceNumber: formData.transactionReference || '',
          transferType: this.getBankTransferType(formData.paymentMethod),
          ...formData.paymentDetails
        } as BankTransferDetails;

      case PaymentMethodType.GCASH:
      case PaymentMethodType.PAYMAYA:
      case PaymentMethodType.GRABPAY:
      case PaymentMethodType.SHOPEEPAY:
        return {
          type: 'digital_wallet',
          walletProvider: this.getWalletProvider(formData.paymentMethod),
          walletReference: formData.transactionReference || '',
          walletTransactionId: formData.transactionReference || '',
          ...formData.paymentDetails
        } as DigitalWalletDetails;

      case PaymentMethodType.CREDIT_CARD:
      case PaymentMethodType.DEBIT_CARD:
        return {
          type: 'card',
          approvalCode: formData.transactionReference || '',
          ...formData.paymentDetails
        } as CardPaymentDetails;

      case PaymentMethodType.CHECK:
        return {
          type: 'check',
          checkNumber: formData.transactionReference || '',
          checkDate: formData.paymentDate,
          checkStatus: 'pending',
          ...formData.paymentDetails
        } as CheckPaymentDetails;

      default:
        return {
          type: 'cash'
        } as CashPaymentDetails;
    }
  }

  /**
   * Get initial verification status based on payment method
   */
  private static getInitialVerificationStatus(method: PaymentMethodType): VerificationStatus {
    // Cash payments are automatically verified
    if (method === PaymentMethodType.CASH) {
      return VerificationStatus.VERIFIED;
    }

    // All other payments require verification
    return VerificationStatus.PENDING;
  }

  /**
   * Get initial payment status based on method
   */
  private static getInitialPaymentStatus(method: PaymentMethodType): PaymentStatus {
    // Cash payments are immediately confirmed
    if (method === PaymentMethodType.CASH) {
      return PaymentStatus.CONFIRMED;
    }

    // Digital and card payments are pending verification
    return PaymentStatus.PENDING;
  }

  /**
   * Generate payment number
   */
  private static async generatePaymentNumber(
    clinicId: string,
    paymentMethod: PaymentMethodType
  ): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    // Get method prefix
    const methodPrefix = this.getPaymentMethodPrefix(paymentMethod);

    // Get sequential number for today (would be from database)
    const sequence = '001'; // This would be calculated from database

    return `PAY-${methodPrefix}-${year}${month}${day}-${sequence}`;
  }

  /**
   * Get payment method prefix for numbering
   */
  private static getPaymentMethodPrefix(method: PaymentMethodType): string {
    const prefixMap: Record<PaymentMethodType, string> = {
      [PaymentMethodType.CASH]: 'CASH',
      [PaymentMethodType.BANK_TRANSFER]: 'BANK',
      [PaymentMethodType.ONLINE_BANKING]: 'OBNK',
      [PaymentMethodType.INSTAPAY]: 'INST',
      [PaymentMethodType.PESONET]: 'PESO',
      [PaymentMethodType.GCASH]: 'GCSH',
      [PaymentMethodType.PAYMAYA]: 'PMYA',
      [PaymentMethodType.GRABPAY]: 'GRAB',
      [PaymentMethodType.SHOPEEPAY]: 'SHOP',
      [PaymentMethodType.CREDIT_CARD]: 'CRDT',
      [PaymentMethodType.DEBIT_CARD]: 'DEBT',
      [PaymentMethodType.CHECK]: 'CHCK',
      [PaymentMethodType.INSTALLMENT]: 'INST',
      [PaymentMethodType.CRYPTOCURRENCY]: 'CRPT',
      [PaymentMethodType.BUY_NOW_PAY_LATER]: 'BNPL',
      [PaymentMethodType.STORE_CREDIT]: 'CRED'
    };

    return prefixMap[method] || 'OTHR';
  }

  /**
   * Helper methods for payment details
   */
  private static getBankTransferType(method: PaymentMethodType): 'instapay' | 'pesonet' | 'wire' | 'online_banking' {
    switch (method) {
      case PaymentMethodType.INSTAPAY: return 'instapay';
      case PaymentMethodType.PESONET: return 'pesonet';
      case PaymentMethodType.ONLINE_BANKING: return 'online_banking';
      default: return 'wire';
    }
  }

  private static getWalletProvider(method: PaymentMethodType): 'gcash' | 'paymaya' | 'grabpay' | 'shopeepay' {
    switch (method) {
      case PaymentMethodType.GCASH: return 'gcash';
      case PaymentMethodType.PAYMAYA: return 'paymaya';
      case PaymentMethodType.GRABPAY: return 'grabpay';
      case PaymentMethodType.SHOPEEPAY: return 'shopeepay';
      default: return 'gcash';
    }
  }

  /**
   * Initiate verification workflow for non-cash payments
   */
  private static async initiateVerificationWorkflow(transaction: PaymentTransaction): Promise<void> {
    // TODO: Implement verification workflow
    // This would include:
    // 1. API calls to payment providers to verify transaction
    // 2. Queue for manual verification
    // 3. Automatic approval for certain transaction types
    // 4. Notifications to staff for pending verifications

    console.log(`Initiating verification workflow for payment ${transaction.paymentNumber}`);
  }

  /**
   * Format payment amount for display
   */
  static formatAmount(amount: number): string {
    return currency.formatPHP(amount / 100); // Convert from centavos to pesos
  }

  /**
   * Get payment method display name
   */
  static getPaymentMethodDisplayName(method: PaymentMethodType): string {
    const displayNames: Record<PaymentMethodType, string> = {
      [PaymentMethodType.CASH]: 'Cash',
      [PaymentMethodType.BANK_TRANSFER]: 'Bank Transfer',
      [PaymentMethodType.ONLINE_BANKING]: 'Online Banking',
      [PaymentMethodType.INSTAPAY]: 'InstaPay',
      [PaymentMethodType.PESONET]: 'PesoNet',
      [PaymentMethodType.GCASH]: 'GCash',
      [PaymentMethodType.PAYMAYA]: 'PayMaya',
      [PaymentMethodType.GRABPAY]: 'GrabPay',
      [PaymentMethodType.SHOPEEPAY]: 'ShopeePay',
      [PaymentMethodType.CREDIT_CARD]: 'Credit Card',
      [PaymentMethodType.DEBIT_CARD]: 'Debit Card',
      [PaymentMethodType.CHECK]: 'Check',
      [PaymentMethodType.INSTALLMENT]: 'Installment',
      [PaymentMethodType.CRYPTOCURRENCY]: 'Cryptocurrency',
      [PaymentMethodType.BUY_NOW_PAY_LATER]: 'Buy Now, Pay Later',
      [PaymentMethodType.STORE_CREDIT]: 'Store Credit'
    };

    return displayNames[method] || method;
  }

  /**
   * Get status display information
   */
  static getStatusDisplay(status: PaymentStatus): { label: string; color: string; bgColor: string } {
    const statusMap = {
      [PaymentStatus.PENDING]: { label: 'Pending', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
      [PaymentStatus.PROCESSING]: { label: 'Processing', color: 'text-blue-600', bgColor: 'bg-blue-100' },
      [PaymentStatus.VERIFIED]: { label: 'Verified', color: 'text-teal-600', bgColor: 'bg-teal-100' },
      [PaymentStatus.CONFIRMED]: { label: 'Confirmed', color: 'text-green-600', bgColor: 'bg-green-100' },
      [PaymentStatus.FAILED]: { label: 'Failed', color: 'text-red-600', bgColor: 'bg-red-100' },
      [PaymentStatus.CANCELLED]: { label: 'Cancelled', color: 'text-gray-600', bgColor: 'bg-gray-100' },
      [PaymentStatus.REFUNDED]: { label: 'Refunded', color: 'text-purple-600', bgColor: 'bg-purple-100' },
      [PaymentStatus.DISPUTED]: { label: 'Disputed', color: 'text-orange-600', bgColor: 'bg-orange-100' }
    };

    return statusMap[status] || { label: 'Unknown', color: 'text-gray-600', bgColor: 'bg-gray-100' };
  }
}

