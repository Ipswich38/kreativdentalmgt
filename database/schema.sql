-- Dental Practice Management System - Multi-Tenant Database Schema
-- Designed for Supabase PostgreSQL
-- Philippine Localization Included

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ==============================================
-- MULTI-TENANT CORE TABLES
-- ==============================================

-- Clinics (Tenant) Table
CREATE TABLE clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    custom_domain VARCHAR(255) UNIQUE,

    -- Contact Information
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    mobile_phone VARCHAR(20),
    website VARCHAR(255),

    -- Philippine Address
    street TEXT NOT NULL,
    barangay VARCHAR(100),
    city VARCHAR(100) NOT NULL,
    province VARCHAR(100) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    region VARCHAR(100) NOT NULL,
    coordinates JSONB, -- {latitude: number, longitude: number}

    -- Business Information
    business_type VARCHAR(50) NOT NULL DEFAULT 'sole_proprietorship',
    business_registration_number VARCHAR(100),
    tin VARCHAR(20), -- Tax Identification Number
    prc_license_number VARCHAR(100),
    doh_license_number VARCHAR(100),

    -- PhilHealth Information
    philhealth_provider JSONB,

    -- Operating Hours
    operating_hours JSONB NOT NULL DEFAULT '{}',

    -- Subscription Information
    subscription_plan_id UUID,
    subscription_status VARCHAR(20) NOT NULL DEFAULT 'trial',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    monthly_active_users INTEGER DEFAULT 0,
    monthly_patients INTEGER DEFAULT 0,
    storage_used BIGINT DEFAULT 0, -- in bytes

    -- Settings
    settings JSONB NOT NULL DEFAULT '{}',

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false,

    -- Metadata
    owner_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Indexes
    CONSTRAINT valid_subdomain CHECK (subdomain ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'),
    CONSTRAINT valid_subscription_status CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled', 'suspended'))
);

-- Users Table (Multi-tenant aware)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

    -- Authentication
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,

    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),

    -- Role & Permissions
    role VARCHAR(50) NOT NULL,
    permissions JSONB DEFAULT '[]',

    -- Professional Information
    professional_title VARCHAR(100),
    license_number VARCHAR(100),
    specialization VARCHAR(100),

    -- Contact
    phone VARCHAR(20),
    mobile_phone VARCHAR(20),

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    last_login TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(clinic_id, email),
    CONSTRAINT valid_role CHECK (role IN ('super_admin', 'clinic_admin', 'office_manager', 'dentist', 'specialist_dentist', 'dental_assistant', 'receptionist'))
);

-- Subscription Plans
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Pricing in Philippine Peso (stored in centavos)
    monthly_price INTEGER NOT NULL, -- in centavos (₱1.00 = 100)
    annual_price INTEGER,

    -- Features
    features JSONB NOT NULL DEFAULT '[]',

    -- Limits
    max_users INTEGER NOT NULL,
    max_patients INTEGER NOT NULL,
    storage_limit BIGINT NOT NULL, -- in bytes
    max_monthly_appointments INTEGER,
    max_monthly_invoices INTEGER,

    -- Feature Flags
    has_advanced_reports BOOLEAN DEFAULT false,
    has_inventory_management BOOLEAN DEFAULT false,
    has_treatment_planning BOOLEAN DEFAULT false,
    has_philhealth_integration BOOLEAN DEFAULT false,
    has_custom_branding BOOLEAN DEFAULT false,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================
-- PATIENT MANAGEMENT
-- ==============================================

-- Patients Table
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

    -- Patient Identifier (clinic-specific)
    patient_number VARCHAR(50) NOT NULL,

    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    suffix VARCHAR(20),

    -- Demographics
    date_of_birth DATE,
    gender VARCHAR(10),
    civil_status VARCHAR(20),
    nationality VARCHAR(50) DEFAULT 'Filipino',

    -- Contact Information
    email VARCHAR(255),
    phone VARCHAR(20),
    mobile_phone VARCHAR(20),

    -- Philippine Address
    street TEXT,
    barangay VARCHAR(100),
    city VARCHAR(100),
    province VARCHAR(100),
    zip_code VARCHAR(10),
    region VARCHAR(100),

    -- Emergency Contact
    emergency_contact JSONB,

    -- Medical Information
    medical_history JSONB,
    allergies TEXT[],
    medications TEXT[],

    -- Insurance Information
    philhealth_number VARCHAR(20),
    hmo_provider VARCHAR(100),
    hmo_card_number VARCHAR(50),

    -- Philippine-specific
    senior_citizen_id VARCHAR(50),
    pwd_id VARCHAR(50), -- Person with Disability ID

    -- Referral Information
    referred_by VARCHAR(255),
    referral_source VARCHAR(100),

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Metadata
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(clinic_id, patient_number),
    CONSTRAINT valid_gender CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'))
);

-- ==============================================
-- APPOINTMENT MANAGEMENT
-- ==============================================

-- Appointments Table
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    dentist_id UUID NOT NULL REFERENCES users(id),

    -- Appointment Details
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,

    -- Appointment Information
    appointment_type VARCHAR(100) NOT NULL,
    chief_complaint TEXT,
    notes TEXT,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',

    -- Treatment Information
    treatments_planned TEXT[],
    treatments_completed TEXT[],

    -- Billing
    estimated_cost INTEGER, -- in centavos
    actual_cost INTEGER, -- in centavos

    -- Reminders
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMPTZ,

    -- Cancellation/Rescheduling
    cancellation_reason TEXT,
    rescheduled_from UUID REFERENCES appointments(id),

    -- Metadata
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')),
    CONSTRAINT valid_times CHECK (start_time < end_time)
);

-- ==============================================
-- TREATMENT MANAGEMENT
-- ==============================================

-- Treatment Categories
CREATE TABLE treatment_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7), -- hex color code

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(clinic_id, name)
);

-- Treatment Templates
CREATE TABLE treatment_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    category_id UUID REFERENCES treatment_categories(id),

    -- Treatment Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    procedure_code VARCHAR(50),

    -- Pricing (in centavos)
    base_price INTEGER NOT NULL,
    senior_citizen_price INTEGER,
    pwd_price INTEGER,

    -- Duration
    estimated_duration INTEGER, -- in minutes

    -- Clinical Information
    tooth_numbers INTEGER[],
    surfaces TEXT[],

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(clinic_id, name)
);

-- Patient Treatments
CREATE TABLE patient_treatments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id),
    template_id UUID REFERENCES treatment_templates(id),
    dentist_id UUID NOT NULL REFERENCES users(id),

    -- Treatment Details
    treatment_name VARCHAR(255) NOT NULL,
    tooth_numbers INTEGER[],
    surfaces TEXT[],

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'planned',

    -- Clinical Notes
    diagnosis TEXT,
    procedure_notes TEXT,
    post_op_instructions TEXT,

    -- Pricing
    quoted_price INTEGER, -- in centavos
    actual_price INTEGER, -- in centavos
    discount_applied INTEGER DEFAULT 0, -- in centavos
    discount_type VARCHAR(50), -- 'senior_citizen', 'pwd', 'promotional', etc.

    -- Dates
    date_started DATE,
    date_completed DATE,
    follow_up_date DATE,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_treatment_status CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled'))
);

-- ==============================================
-- BILLING & PAYMENTS
-- ==============================================

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

    -- Invoice Details
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,

    -- Amounts (in centavos)
    subtotal INTEGER NOT NULL DEFAULT 0,
    tax_amount INTEGER NOT NULL DEFAULT 0, -- VAT
    discount_amount INTEGER NOT NULL DEFAULT 0,
    total_amount INTEGER NOT NULL DEFAULT 0,

    -- Discount Information
    senior_citizen_discount INTEGER DEFAULT 0,
    pwd_discount INTEGER DEFAULT 0,
    promotional_discount INTEGER DEFAULT 0,

    -- Payment Information
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    payment_terms INTEGER DEFAULT 30, -- days

    -- Philippine Tax Compliance
    is_vat_inclusive BOOLEAN DEFAULT true,
    withholding_tax INTEGER DEFAULT 0,

    -- Notes
    notes TEXT,
    payment_instructions TEXT,

    -- Status
    is_cancelled BOOLEAN DEFAULT false,
    cancellation_reason TEXT,

    -- Metadata
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(clinic_id, invoice_number),
    CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled'))
);

-- Invoice Items
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    treatment_id UUID REFERENCES patient_treatments(id),

    -- Item Details
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price INTEGER NOT NULL, -- in centavos
    total_price INTEGER NOT NULL, -- in centavos

    -- Treatment Reference
    tooth_numbers INTEGER[],
    procedure_code VARCHAR(50),

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payments (Flexible Schema for Future Payment Methods)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id),

    -- Payment Details
    payment_number VARCHAR(100) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount INTEGER NOT NULL, -- in centavos

    -- Payment Method (Flexible)
    payment_method VARCHAR(50) NOT NULL,
    payment_category VARCHAR(20) NOT NULL DEFAULT 'digital', -- 'cash', 'digital', 'bank', 'crypto', etc.

    -- Transaction References (REQUIRED for non-cash payments)
    transaction_reference VARCHAR(255), -- Main reference number
    external_transaction_id VARCHAR(255), -- Payment gateway transaction ID
    authorization_code VARCHAR(100), -- For card payments

    -- Flexible Payment Details (JSON for extensibility)
    payment_details JSONB NOT NULL DEFAULT '{}', -- Stores method-specific data

    -- Verification Details
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    verification_notes TEXT,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,

    -- Bank Transfer Specific
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    routing_number VARCHAR(20),

    -- Digital Wallet References
    digital_wallet_type VARCHAR(50), -- gcash, paymaya, grabpay, etc.
    digital_wallet_reference VARCHAR(100),

    -- Card Payment Details
    card_type VARCHAR(20), -- visa, mastercard, amex
    card_last_four VARCHAR(4),
    card_approval_code VARCHAR(20),

    -- Check Details
    check_number VARCHAR(50),
    check_bank VARCHAR(100),
    check_date DATE,

    -- Receipt & Documentation
    receipt_url TEXT,
    receipt_number VARCHAR(100),
    supporting_documents JSONB DEFAULT '[]', -- Array of document URLs

    -- Notes
    notes TEXT,
    internal_notes TEXT, -- Staff-only notes

    -- Status & Workflow
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    workflow_stage VARCHAR(50) DEFAULT 'submitted', -- submitted, verified, approved, deposited, etc.

    -- Financial Reconciliation
    reconciliation_status VARCHAR(20) DEFAULT 'pending',
    reconciled_at TIMESTAMPTZ,
    reconciled_by UUID REFERENCES users(id),
    bank_statement_date DATE,

    -- Metadata (Extensible)
    metadata JSONB DEFAULT '{}', -- For future custom fields
    tags TEXT[], -- For categorization and filtering

    -- Audit Fields
    received_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints (Flexible for future payment methods)
    UNIQUE(clinic_id, payment_number),
    CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'processing', 'confirmed', 'failed', 'cancelled', 'refunded', 'disputed')),
    CONSTRAINT valid_verification_status CHECK (verification_status IN ('pending', 'verified', 'rejected', 'requires_review')),
    CONSTRAINT valid_payment_category CHECK (payment_category IN ('cash', 'digital', 'bank', 'card', 'crypto', 'other')),
    CONSTRAINT non_cash_requires_reference CHECK (
        (payment_method = 'cash') OR
        (payment_method != 'cash' AND (transaction_reference IS NOT NULL OR external_transaction_id IS NOT NULL))
    )
);

-- ==============================================
-- INVENTORY MANAGEMENT (OPTIONAL FEATURE)
-- ==============================================

-- Inventory Categories
CREATE TABLE inventory_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(clinic_id, name)
);

-- Inventory Items
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    category_id UUID REFERENCES inventory_categories(id),

    -- Item Information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100),
    barcode VARCHAR(100),

    -- Supplier Information
    supplier_name VARCHAR(255),
    supplier_contact TEXT,

    -- Pricing (in centavos)
    unit_cost INTEGER,
    selling_price INTEGER,

    -- Stock Information
    current_stock INTEGER NOT NULL DEFAULT 0,
    minimum_stock INTEGER DEFAULT 0,
    maximum_stock INTEGER,
    unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'pieces',

    -- Expiration Tracking
    tracks_expiry BOOLEAN DEFAULT false,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(clinic_id, sku)
);

-- ==============================================
-- EXTENSIBLE FEATURES FRAMEWORK
-- ==============================================

-- Custom Fields (For extending any entity with custom data)
CREATE TABLE custom_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

    -- Field Configuration
    entity_type VARCHAR(50) NOT NULL, -- 'patient', 'appointment', 'treatment', etc.
    field_name VARCHAR(100) NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    field_type VARCHAR(30) NOT NULL, -- 'text', 'number', 'date', 'select', 'checkbox', 'file'

    -- Field Options (for select, checkbox, etc.)
    field_options JSONB DEFAULT '[]',

    -- Validation Rules
    validation_rules JSONB DEFAULT '{}',

    -- Display Settings
    is_required BOOLEAN DEFAULT false,
    is_searchable BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(clinic_id, entity_type, field_name),
    CONSTRAINT valid_field_type CHECK (field_type IN ('text', 'textarea', 'number', 'decimal', 'date', 'datetime', 'select', 'multiselect', 'checkbox', 'radio', 'file', 'email', 'phone', 'url'))
);

-- Custom Field Values (Stores actual custom field data)
CREATE TABLE custom_field_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    custom_field_id UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,

    -- Entity Reference
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,

    -- Value Storage (Flexible)
    text_value TEXT,
    number_value DECIMAL,
    date_value DATE,
    datetime_value TIMESTAMPTZ,
    boolean_value BOOLEAN,
    json_value JSONB,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(clinic_id, custom_field_id, entity_id)
);

-- Notifications & Communications System
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

    -- Recipient
    user_id UUID REFERENCES users(id),
    patient_id UUID REFERENCES patients(id),

    -- Notification Details
    type VARCHAR(50) NOT NULL, -- 'appointment_reminder', 'payment_due', 'system_update', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,

    -- Delivery Channels
    channels JSONB NOT NULL DEFAULT '["in_app"]', -- ['email', 'sms', 'in_app', 'push']

    -- Status Tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,

    -- Related Entity
    entity_type VARCHAR(50),
    entity_id UUID,

    -- Delivery Attempts
    delivery_attempts JSONB DEFAULT '[]',

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_notification_status CHECK (status IN ('pending', 'scheduled', 'sent', 'delivered', 'failed', 'cancelled'))
);

-- Templates System (For forms, documents, communications)
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

    -- Template Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- 'email', 'sms', 'document', 'form', 'report'
    category VARCHAR(100),

    -- Template Content
    content JSONB NOT NULL, -- Stores template structure/content
    variables JSONB DEFAULT '[]', -- Available variables for replacement

    -- Styling/Layout
    styling JSONB DEFAULT '{}',

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,

    -- Version Control
    version INTEGER DEFAULT 1,
    parent_template_id UUID REFERENCES templates(id),

    -- Metadata
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(clinic_id, name, type)
);

-- File Storage & Documents Management
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

    -- Document Details
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64), -- For duplicate detection

    -- Classification
    document_type VARCHAR(50) NOT NULL, -- 'patient_record', 'treatment_photo', 'xray', 'consent_form', etc.
    category VARCHAR(100),
    tags TEXT[],

    -- Related Entity
    entity_type VARCHAR(50),
    entity_id UUID,

    -- Access Control
    is_public BOOLEAN DEFAULT false,
    access_level VARCHAR(20) DEFAULT 'clinic', -- 'public', 'clinic', 'staff', 'specific_users'
    allowed_users UUID[],

    -- Document Metadata
    metadata JSONB DEFAULT '{}',
    ocr_text TEXT, -- For searchable documents

    -- Status
    status VARCHAR(20) DEFAULT 'active',

    -- Audit
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_document_status CHECK (status IN ('active', 'archived', 'deleted')),
    CONSTRAINT valid_access_level CHECK (access_level IN ('public', 'clinic', 'staff', 'specific_users'))
);

-- System Settings & Configuration (Extensible)
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE, -- NULL for global settings

    -- Setting Details
    setting_key VARCHAR(255) NOT NULL,
    setting_value JSONB,
    setting_type VARCHAR(30) NOT NULL, -- 'string', 'number', 'boolean', 'json', 'encrypted'

    -- Categorization
    category VARCHAR(100),
    subcategory VARCHAR(100),

    -- Metadata
    description TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false, -- Can be accessed by frontend

    -- Version Control
    version INTEGER DEFAULT 1,
    previous_value JSONB,

    -- Audit
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(clinic_id, setting_key),
    CONSTRAINT valid_setting_type CHECK (setting_type IN ('string', 'number', 'boolean', 'json', 'encrypted', 'array'))
);

-- ==============================================
-- AUDIT & LOGGING (ENHANCED)
-- ==============================================

-- Activity Logs (Enhanced for better tracking)
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(100),

    -- Activity Details
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,

    -- Change Tracking
    old_values JSONB,
    new_values JSONB,

    -- Request Details
    description TEXT,
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10),
    request_path TEXT,

    -- Response Details
    status_code INTEGER,
    response_time_ms INTEGER,

    -- Categorization
    category VARCHAR(50), -- 'authentication', 'patient_data', 'financial', 'system'
    severity VARCHAR(20) DEFAULT 'info', -- 'debug', 'info', 'warning', 'error', 'critical'

    -- Additional Context
    metadata JSONB DEFAULT '{}',
    tags TEXT[],

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_severity CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical'))
);

-- System Health & Monitoring
CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,

    -- Metric Details
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL,
    metric_unit VARCHAR(20),

    -- Categorization
    category VARCHAR(50), -- 'performance', 'usage', 'error_rate', 'storage'

    -- Time Series Data
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    time_bucket INTERVAL, -- For aggregated metrics

    -- Additional Data
    metadata JSONB DEFAULT '{}',

    -- Indexes for time-series queries
    UNIQUE(clinic_id, metric_name, timestamp)
);

-- Error Logs (For debugging and monitoring)
CREATE TABLE error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id),
    user_id UUID REFERENCES users(id),

    -- Error Details
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,

    -- Context
    request_path TEXT,
    request_method VARCHAR(10),
    request_body JSONB,
    query_params JSONB,

    -- Environment
    user_agent TEXT,
    ip_address INET,

    -- Classification
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'new', -- 'new', 'investigating', 'resolved', 'ignored'

    -- Resolution
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_error_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT valid_error_status CHECK (status IN ('new', 'investigating', 'resolved', 'ignored'))
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- Clinics indexes
CREATE INDEX idx_clinics_subdomain ON clinics(subdomain);
CREATE INDEX idx_clinics_custom_domain ON clinics(custom_domain);
CREATE INDEX idx_clinics_owner_id ON clinics(owner_id);

-- Users indexes
CREATE INDEX idx_users_clinic_id ON users(clinic_id);
CREATE INDEX idx_users_email ON users(clinic_id, email);
CREATE INDEX idx_users_role ON users(clinic_id, role);

-- Patients indexes
CREATE INDEX idx_patients_clinic_id ON patients(clinic_id);
CREATE INDEX idx_patients_patient_number ON patients(clinic_id, patient_number);
CREATE INDEX idx_patients_name ON patients(clinic_id, first_name, last_name);
CREATE INDEX idx_patients_phone ON patients(clinic_id, mobile_phone);

-- Appointments indexes
CREATE INDEX idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_dentist_id ON appointments(dentist_id);
CREATE INDEX idx_appointments_date ON appointments(clinic_id, appointment_date);
CREATE INDEX idx_appointments_status ON appointments(clinic_id, status);

-- Invoices indexes
CREATE INDEX idx_invoices_clinic_id ON invoices(clinic_id);
CREATE INDEX idx_invoices_patient_id ON invoices(patient_id);
CREATE INDEX idx_invoices_number ON invoices(clinic_id, invoice_number);
CREATE INDEX idx_invoices_status ON invoices(clinic_id, payment_status);
CREATE INDEX idx_invoices_date ON invoices(clinic_id, invoice_date);

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

-- Enable RLS on all multi-tenant tables
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (to be customized based on specific needs)

-- Users can only access data from their clinic
CREATE POLICY clinic_isolation_users ON users
    USING (clinic_id = current_setting('app.current_clinic_id')::uuid);

CREATE POLICY clinic_isolation_patients ON patients
    USING (clinic_id = current_setting('app.current_clinic_id')::uuid);

CREATE POLICY clinic_isolation_appointments ON appointments
    USING (clinic_id = current_setting('app.current_clinic_id')::uuid);

CREATE POLICY clinic_isolation_invoices ON invoices
    USING (clinic_id = current_setting('app.current_clinic_id')::uuid);

-- ==============================================
-- TRIGGERS AND FUNCTIONS
-- ==============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_clinics_updated_at BEFORE UPDATE ON clinics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_treatment_categories_updated_at BEFORE UPDATE ON treatment_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_treatment_templates_updated_at BEFORE UPDATE ON treatment_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patient_treatments_updated_at BEFORE UPDATE ON patient_treatments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_categories_updated_at BEFORE UPDATE ON inventory_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- INITIAL DATA
-- ==============================================

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, monthly_price, max_users, max_patients, storage_limit, features) VALUES
('Basic', 'Perfect for small dental practices', 299900, 5, 500, 1073741824, '["appointments", "patients", "basic_billing", "basic_reports"]'),
('Professional', 'For growing dental practices', 599900, 15, 2000, 5368709120, '["appointments", "patients", "advanced_billing", "inventory_management", "advanced_reports", "treatment_planning"]'),
('Enterprise', 'For large dental clinics', 999900, 50, 10000, 21474836480, '["appointments", "patients", "advanced_billing", "inventory_management", "advanced_reports", "treatment_planning", "philhealth_integration", "custom_branding", "api_access"]');

-- Insert default treatment categories
-- Note: These will be added per clinic during onboarding

-- Insert default treatment templates
-- Note: These will be added per clinic during onboarding