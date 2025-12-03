// Enhanced Payment System Types for Philippine Market

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  name: string;
  category: PaymentCategory;
  enabled: boolean;
  processingFee?: number; // in centavos
  requiresReference: boolean;
  configuration?: PaymentMethodConfig;
}

export enum PaymentMethodType {
  // Manual/Traditional
  CASH = 'cash',
  CHECK = 'check',

  // Bank Transfers
  BANK_TRANSFER = 'bank_transfer',
  ONLINE_BANKING = 'online_banking',
  INSTAPAY = 'instapay',
  PESONET = 'pesonet',

  // Digital Wallets (Philippine)
  GCASH = 'gcash',
  PAYMAYA = 'paymaya',
  GRABPAY = 'grabpay',
  SHOPEEPAY = 'shopeepay',

  // Credit/Debit Cards
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',

  // Alternative Payments
  INSTALLMENT = 'installment',
  CRYPTOCURRENCY = 'cryptocurrency',

  // Future Payment Methods
  BUY_NOW_PAY_LATER = 'buy_now_pay_later',
  STORE_CREDIT = 'store_credit'
}

export enum PaymentCategory {
  CASH = 'cash',
  DIGITAL_WALLET = 'digital_wallet',
  BANK = 'bank',
  CARD = 'card',
  ALTERNATIVE = 'alternative'
}

export interface PaymentMethodConfig {
  // Bank Transfer Details
  bankDetails?: PhilippineBankAccount[];

  // Digital Wallet Configuration
  walletConfig?: DigitalWalletConfig;

  // Card Processing
  cardConfig?: CardProcessingConfig;

  // Validation Rules
  validationRules?: PaymentValidationRules;
}

export interface PhilippineBankAccount {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  accountType: 'savings' | 'checking' | 'current';
  branchName?: string;
  branchCode?: string;

  // For wire transfers
  swiftCode?: string;
  routingNumber?: string;

  // Instant transfer capabilities
  isInstapayEnabled: boolean;
  isPesonetEnabled: boolean;

  // Online banking portal
  onlineBankingUrl?: string;
}

export interface DigitalWalletConfig {
  merchantId?: string;
  qrCodeUrl?: string;
  deepLinkUrl?: string;

  // API Configuration
  apiEndpoint?: string;
  webhookUrl?: string;
}

export interface CardProcessingConfig {
  acceptedCardTypes: string[];
  merchantId?: string;
  terminalId?: string;

  // 3D Secure settings
  requires3DSecure: boolean;
}

export interface PaymentValidationRules {
  minAmount?: number; // in centavos
  maxAmount?: number; // in centavos
  requiresApproval?: boolean;
  verificationRequired?: boolean;

  // Reference format validation
  referenceFormat?: RegExp;
  referenceMinLength?: number;
  referenceMaxLength?: number;
}

// Payment Transaction Types
export interface PaymentTransaction {
  id: string;
  clinicId: string;
  patientId: string;
  invoiceId?: string;

  // Payment Details
  paymentNumber: string;
  paymentDate: Date;
  amount: number; // in centavos

  // Payment Method
  paymentMethod: PaymentMethodType;
  paymentCategory: PaymentCategory;

  // REQUIRED: Transaction References for non-cash payments
  transactionReference?: string;
  externalTransactionId?: string;
  authorizationCode?: string;

  // Payment-specific details
  paymentDetails: PaymentDetails;

  // Verification & Status
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
  verifiedBy?: string;
  verifiedAt?: Date;

  // Status tracking
  status: PaymentStatus;
  workflowStage: WorkflowStage;

  // Documentation
  receiptUrl?: string;
  supportingDocuments: string[];

  // Notes
  notes?: string;
  internalNotes?: string;

  // Audit
  receivedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Union type for payment-specific details
export type PaymentDetails =
  | CashPaymentDetails
  | BankTransferDetails
  | DigitalWalletDetails
  | CardPaymentDetails
  | CheckPaymentDetails;

export interface CashPaymentDetails {
  type: 'cash';
  denomination?: CashDenomination[];
  changeGiven?: number; // in centavos
  cashierNotes?: string;
}

export interface CashDenomination {
  value: number; // in centavos
  count: number;
}

export interface BankTransferDetails {
  type: 'bank_transfer';
  bankName: string;
  accountNumber: string;
  accountName?: string;
  transferType: 'instapay' | 'pesonet' | 'wire' | 'online_banking';

  // Required reference numbers
  referenceNumber: string; // Bank reference number
  confirmationCode?: string; // Bank confirmation code

  // Banking details
  transferFee?: number;
  transferDate?: Date;
}

export interface DigitalWalletDetails {
  type: 'digital_wallet';
  walletProvider: 'gcash' | 'paymaya' | 'grabpay' | 'shopeepay';

  // Required reference numbers
  walletReference: string; // Wallet transaction reference
  walletTransactionId: string; // Wallet transaction ID

  // Wallet-specific data
  senderNumber?: string; // For GCash/PayMaya
  receiverNumber?: string;
  walletFee?: number;
}

export interface CardPaymentDetails {
  type: 'card';
  cardType: 'visa' | 'mastercard' | 'amex' | 'jcb' | 'unionpay';
  cardLastFour: string;

  // Required reference numbers
  approvalCode: string;
  rrn?: string; // Retrieval Reference Number

  // Card processing details
  terminalId?: string;
  batchNumber?: string;
  processingFee?: number;
}

export interface CheckPaymentDetails {
  type: 'check';

  // Required check information
  checkNumber: string;
  checkDate: Date;
  checkBank: string;

  // Optional details
  checkAmount?: number;
  accountNumber?: string;
  routingNumber?: string;

  // Status tracking
  checkStatus: 'pending' | 'cleared' | 'bounced' | 'hold';
  clearedDate?: Date;
}

// Enums for payment status tracking
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  VERIFIED = 'verified',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  DISPUTED = 'disputed'
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  REQUIRES_REVIEW = 'requires_review'
}

export enum WorkflowStage {
  SUBMITTED = 'submitted',
  REFERENCE_VERIFIED = 'reference_verified',
  BANK_CONFIRMED = 'bank_confirmed',
  APPROVED = 'approved',
  DEPOSITED = 'deposited',
  RECONCILED = 'reconciled'
}

// Payment form validation
export interface PaymentFormData {
  amount: number;
  paymentMethod: PaymentMethodType;
  paymentDate: Date;

  // Required for non-cash payments
  transactionReference?: string;

  // Payment-specific fields
  paymentDetails: Partial<PaymentDetails>;

  // Optional fields
  notes?: string;
  receiptFile?: File;
  supportingDocuments?: File[];
}

// Validation schemas
export interface PaymentValidationResult {
  isValid: boolean;
  errors: PaymentValidationError[];
  warnings: PaymentValidationWarning[];
}

export interface PaymentValidationError {
  field: string;
  message: string;
  code: string;
}

export interface PaymentValidationWarning {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

// Philippine banking validation utilities
export class PhilippinePaymentValidator {

  static validatePaymentReference(
    paymentMethod: PaymentMethodType,
    reference: string
  ): PaymentValidationResult {
    const errors: PaymentValidationError[] = [];
    const warnings: PaymentValidationWarning[] = [];

    // Cash payments don't require references
    if (paymentMethod === PaymentMethodType.CASH) {
      return { isValid: true, errors, warnings };
    }

    // All non-cash payments require a reference
    if (!reference || reference.trim().length === 0) {
      errors.push({
        field: 'transactionReference',
        message: 'Transaction reference is required for non-cash payments',
        code: 'REFERENCE_REQUIRED'
      });
    }

    // Method-specific validation
    switch (paymentMethod) {
      case PaymentMethodType.GCASH:
        if (!/^\d{13}$/.test(reference)) {
          errors.push({
            field: 'transactionReference',
            message: 'GCash reference must be 13 digits',
            code: 'INVALID_GCASH_REFERENCE'
          });
        }
        break;

      case PaymentMethodType.PAYMAYA:
        if (!/^[A-Z0-9]{6,20}$/.test(reference)) {
          errors.push({
            field: 'transactionReference',
            message: 'PayMaya reference must be 6-20 alphanumeric characters',
            code: 'INVALID_PAYMAYA_REFERENCE'
          });
        }
        break;

      case PaymentMethodType.BANK_TRANSFER:
      case PaymentMethodType.INSTAPAY:
      case PaymentMethodType.PESONET:
        if (reference.length < 6 || reference.length > 30) {
          errors.push({
            field: 'transactionReference',
            message: 'Bank transfer reference must be 6-30 characters',
            code: 'INVALID_BANK_REFERENCE'
          });
        }
        break;

      case PaymentMethodType.CHECK:
        if (!/^\d{6,12}$/.test(reference)) {
          errors.push({
            field: 'transactionReference',
            message: 'Check number must be 6-12 digits',
            code: 'INVALID_CHECK_NUMBER'
          });
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static getRequiredFields(paymentMethod: PaymentMethodType): string[] {
    const baseFields = ['amount', 'paymentDate'];

    if (paymentMethod === PaymentMethodType.CASH) {
      return baseFields;
    }

    // All non-cash payments require transaction reference
    return [...baseFields, 'transactionReference'];
  }

  static formatPaymentReference(
    paymentMethod: PaymentMethodType,
    reference: string
  ): string {
    switch (paymentMethod) {
      case PaymentMethodType.GCASH:
        return reference.replace(/\D/g, ''); // Remove non-digits

      case PaymentMethodType.PAYMAYA:
        return reference.toUpperCase().replace(/[^A-Z0-9]/g, '');

      case PaymentMethodType.BANK_TRANSFER:
      case PaymentMethodType.INSTAPAY:
      case PaymentMethodType.PESONET:
        return reference.trim().toUpperCase();

      default:
        return reference.trim();
    }
  }
}