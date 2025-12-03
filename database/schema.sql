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

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id),

    -- Payment Details
    payment_number VARCHAR(100) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount INTEGER NOT NULL, -- in centavos

    -- Payment Method
    payment_method VARCHAR(50) NOT NULL,
    payment_reference VARCHAR(255),

    -- Philippine Payment Methods
    gcash_reference VARCHAR(100),
    paymaya_reference VARCHAR(100),
    bank_name VARCHAR(100),
    check_number VARCHAR(50),

    -- Notes
    notes TEXT,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed',

    -- Metadata
    received_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE(clinic_id, payment_number),
    CONSTRAINT valid_payment_method CHECK (payment_method IN ('cash', 'credit_card', 'debit_card', 'gcash', 'paymaya', 'bank_transfer', 'check', 'installment')),
    CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'confirmed', 'cancelled', 'refunded'))
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
-- AUDIT & LOGGING
-- ==============================================

-- Activity Logs
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),

    -- Activity Details
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,

    -- Details
    description TEXT,
    ip_address INET,
    user_agent TEXT,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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