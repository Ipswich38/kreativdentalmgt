# Dental Clinic Management System - Architecture Guide

This document outlines the recommended file structure and architectural patterns for the Next.js 15 dental clinic management application based on Apexo domain model analysis.

## Project Structure Overview

```
src/
├── app/                          # Next.js 15 App Router
│   ├── (auth)/                   # Authentication routes group
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/              # Main application routes
│   │   ├── dashboard/
│   │   │   ├── page.tsx          # Dashboard overview
│   │   │   └── loading.tsx
│   │   │
│   │   ├── patients/             # Patient management
│   │   │   ├── page.tsx          # Patient list
│   │   │   ├── new/
│   │   │   │   └── page.tsx      # New patient form
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx      # Patient details
│   │   │   │   ├── edit/
│   │   │   │   │   └── page.tsx  # Edit patient
│   │   │   │   ├── appointments/
│   │   │   │   │   └── page.tsx  # Patient appointments
│   │   │   │   ├── payments/
│   │   │   │   │   └── page.tsx  # Patient payments
│   │   │   │   └── dental-chart/
│   │   │   │       └── page.tsx  # Dental chart view
│   │   │   ├── loading.tsx
│   │   │   └── error.tsx
│   │   │
│   │   ├── appointments/         # Appointment management
│   │   │   ├── page.tsx          # Appointment list
│   │   │   ├── calendar/
│   │   │   │   └── page.tsx      # Calendar view
│   │   │   ├── new/
│   │   │   │   └── page.tsx      # New appointment
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx      # Appointment details
│   │   │   │   ├── edit/
│   │   │   │   │   └── page.tsx  # Edit appointment
│   │   │   │   └── checkin/
│   │   │   │       └── page.tsx  # Patient check-in
│   │   │   └── conflicts/
│   │   │       └── page.tsx      # Appointment conflicts
│   │   │
│   │   ├── treatments/           # Treatment management
│   │   │   ├── page.tsx          # Treatment templates
│   │   │   ├── categories/
│   │   │   │   └── page.tsx      # Treatment categories
│   │   │   ├── new/
│   │   │   │   └── page.tsx      # New treatment
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # Treatment details
│   │   │       └── edit/
│   │   │           └── page.tsx  # Edit treatment
│   │   │
│   │   ├── billing/              # Financial management
│   │   │   ├── page.tsx          # Billing overview
│   │   │   ├── invoices/
│   │   │   │   ├── page.tsx      # Invoice list
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx  # New invoice
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx  # Invoice details
│   │   │   │       └── edit/
│   │   │   │           └── page.tsx
│   │   │   ├── payments/
│   │   │   │   ├── page.tsx      # Payment list
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx  # Record payment
│   │   │   │   ├── verify/
│   │   │   │   │   └── page.tsx  # Verify payments
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx  # Payment details
│   │   │   ├── expenses/
│   │   │   │   ├── page.tsx      # Expense list
│   │   │   │   └── new/
│   │   │   │       └── page.tsx  # New expense
│   │   │   └── reports/
│   │   │       ├── page.tsx      # Financial reports
│   │   │       ├── income/
│   │   │       │   └── page.tsx  # Income reports
│   │   │       └── profit/
│   │   │           └── page.tsx  # Profit analysis
│   │   │
│   │   ├── staff/                # Staff management
│   │   │   ├── page.tsx          # Staff list
│   │   │   ├── new/
│   │   │   │   └── page.tsx      # New staff member
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx      # Staff details
│   │   │   │   ├── edit/
│   │   │   │   │   └── page.tsx  # Edit staff
│   │   │   │   ├── schedule/
│   │   │   │   │   └── page.tsx  # Staff schedule
│   │   │   │   └── performance/
│   │   │   │       └── page.tsx  # Performance metrics
│   │   │   └── permissions/
│   │   │       └── page.tsx      # Role permissions
│   │   │
│   │   ├── reports/              # Analytics and reports
│   │   │   ├── page.tsx          # Reports overview
│   │   │   ├── patients/
│   │   │   │   └── page.tsx      # Patient reports
│   │   │   ├── appointments/
│   │   │   │   └── page.tsx      # Appointment analytics
│   │   │   ├── financial/
│   │   │   │   └── page.tsx      # Financial analytics
│   │   │   └── custom/
│   │   │       └── page.tsx      # Custom reports
│   │   │
│   │   ├── settings/             # Clinic settings
│   │   │   ├── page.tsx          # General settings
│   │   │   ├── clinic/
│   │   │   │   └── page.tsx      # Clinic profile
│   │   │   ├── payment-methods/
│   │   │   │   └── page.tsx      # Payment methods
│   │   │   ├── notifications/
│   │   │   │   └── page.tsx      # Notification settings
│   │   │   ├── integrations/
│   │   │   │   └── page.tsx      # Third-party integrations
│   │   │   └── backup/
│   │   │       └── page.tsx      # Data backup
│   │   │
│   │   └── layout.tsx            # Dashboard layout
│   │
│   ├── api/                      # API routes (if needed)
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   └── route.ts
│   │   │   ├── logout/
│   │   │   │   └── route.ts
│   │   │   └── me/
│   │   │       └── route.ts
│   │   ├── webhooks/             # External webhooks
│   │   │   ├── supabase/
│   │   │   │   └── route.ts
│   │   │   └── payments/
│   │   │       └── route.ts
│   │   └── export/               # Data export endpoints
│   │       ├── patients/
│   │       │   └── route.ts
│   │       └── reports/
│   │           └── route.ts
│   │
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page (redirect to dashboard)
│   ├── loading.tsx               # Global loading
│   ├── error.tsx                 # Global error
│   └── not-found.tsx             # 404 page
│
├── components/                   # Reusable UI components
│   ├── ui/                       # Base UI components (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── form.tsx
│   │   ├── table.tsx
│   │   ├── calendar.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── select.tsx
│   │   ├── textarea.tsx
│   │   ├── checkbox.tsx
│   │   ├── radio-group.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── tabs.tsx
│   │   ├── alert.tsx
│   │   ├── toast.tsx
│   │   └── loading-spinner.tsx
│   │
│   ├── layout/                   # Layout components
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   ├── navigation.tsx
│   │   ├── breadcrumb.tsx
│   │   ├── user-menu.tsx
│   │   ├── clinic-switcher.tsx
│   │   └── mobile-nav.tsx
│   │
│   ├── forms/                    # Domain-specific forms
│   │   ├── patient-form.tsx
│   │   ├── appointment-form.tsx
│   │   ├── payment-form.tsx
│   │   ├── treatment-form.tsx
│   │   ├── staff-form.tsx
│   │   ├── invoice-form.tsx
│   │   └── clinic-settings-form.tsx
│   │
│   ├── tables/                   # Data tables
│   │   ├── patients-table.tsx
│   │   ├── appointments-table.tsx
│   │   ├── payments-table.tsx
│   │   ├── staff-table.tsx
│   │   ├── treatments-table.tsx
│   │   └── data-table.tsx        # Generic data table
│   │
│   ├── charts/                   # Chart components
│   │   ├── revenue-chart.tsx
│   │   ├── appointment-chart.tsx
│   │   ├── patient-chart.tsx
│   │   └── dashboard-charts.tsx
│   │
│   ├── dental/                   # Dental-specific components
│   │   ├── tooth-chart.tsx
│   │   ├── dental-chart.tsx
│   │   ├── treatment-planner.tsx
│   │   ├── tooth-selector.tsx
│   │   └── surface-selector.tsx
│   │
│   ├── calendar/                 # Calendar components
│   │   ├── appointment-calendar.tsx
│   │   ├── day-view.tsx
│   │   ├── week-view.tsx
│   │   ├── month-view.tsx
│   │   └── time-slot.tsx
│   │
│   ├── payments/                 # Payment components
│   │   ├── payment-method-selector.tsx
│   │   ├── payment-verification.tsx
│   │   ├── payment-receipt.tsx
│   │   ├── payment-history.tsx
│   │   └── payment-summary.tsx
│   │
│   ├── search/                   # Search components
│   │   ├── patient-search.tsx
│   │   ├── appointment-search.tsx
│   │   ├── global-search.tsx
│   │   └── search-filters.tsx
│   │
│   └── shared/                   # Generic shared components
│       ├── confirmation-dialog.tsx
│       ├── delete-dialog.tsx
│       ├── file-upload.tsx
│       ├── date-picker.tsx
│       ├── time-picker.tsx
│       ├── currency-input.tsx
│       ├── phone-input.tsx
│       ├── email-input.tsx
│       ├── image-gallery.tsx
│       ├── document-viewer.tsx
│       ├── error-boundary.tsx
│       ├── empty-state.tsx
│       ├── no-data.tsx
│       └── loading-state.tsx
│
├── lib/                          # Library code and utilities
│   ├── actions/                  # Server actions
│   │   ├── patient-actions.ts    # ✓ Created
│   │   ├── appointment-actions.ts # ✓ Created
│   │   ├── payment-actions.ts    # ✓ Created
│   │   ├── staff-actions.ts
│   │   ├── treatment-actions.ts
│   │   ├── invoice-actions.ts
│   │   ├── expense-actions.ts
│   │   └── clinic-actions.ts
│   │
│   ├── supabase/                 # Supabase configuration
│   │   ├── client.ts
│   │   ├── server.ts
│   │   ├── middleware.ts
│   │   └── types.ts
│   │
│   ├── services/                 # Domain services
│   │   ├── patient-service.ts
│   │   ├── appointment-service.ts
│   │   ├── payment-service.ts    # ✓ Exists
│   │   ├── billing-service.ts
│   │   ├── notification-service.ts
│   │   ├── analytics-service.ts
│   │   ├── export-service.ts
│   │   └── backup-service.ts
│   │
│   ├── validation/               # Zod schemas
│   │   ├── patient.ts
│   │   ├── appointment.ts
│   │   ├── payment.ts
│   │   ├── staff.ts
│   │   ├── treatment.ts
│   │   ├── invoice.ts
│   │   └── clinic.ts
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── use-patients.ts
│   │   ├── use-appointments.ts
│   │   ├── use-payments.ts
│   │   ├── use-staff.ts
│   │   ├── use-treatments.ts
│   │   ├── use-search.ts
│   │   ├── use-calendar.ts
│   │   ├── use-dental-chart.ts
│   │   └── use-debounce.ts
│   │
│   ├── utils/                    # Utility functions
│   │   ├── cn.ts                 # Class name utility
│   │   ├── date.ts               # Date utilities
│   │   ├── currency.ts           # Currency formatting
│   │   ├── phone.ts              # Phone number utilities
│   │   ├── validation.ts         # Validation helpers
│   │   ├── format.ts             # Formatting utilities
│   │   ├── search.ts             # Search utilities
│   │   └── constants.ts          # Application constants
│   │
│   ├── auth.ts                   # ✓ Exists
│   ├── auth-utils.ts             # ✓ Created
│   ├── rbac.ts                   # ✓ Exists
│   ├── localization.ts           # ✓ Exists
│   └── multi-tenant.ts           # ✓ Exists
│
├── types/                        # TypeScript type definitions
│   ├── apexo-domain.ts           # ✓ Created (based on Apexo analysis)
│   ├── auth.ts                   # ✓ Exists
│   ├── clinic.ts                 # ✓ Exists
│   ├── payment.ts                # ✓ Exists
│   ├── database.ts               # Supabase generated types
│   ├── api.ts                    # API response types
│   └── global.d.ts               # Global type declarations
│
├── config/                       # Configuration files
│   ├── database.ts               # Database configuration
│   ├── auth.ts                   # Authentication configuration
│   ├── payments.ts               # Payment method configuration
│   ├── notifications.ts          # Notification settings
│   └── features.ts               # Feature flags
│
└── middleware.ts                 # Next.js middleware
```

## Key Architectural Decisions

### 1. Domain-Driven Structure

The application follows domain-driven design principles with clear separation of concerns:

- **Patient Management**: All patient-related functionality
- **Appointment Management**: Scheduling and appointment workflows
- **Billing & Payments**: Financial operations with Philippine payment methods
- **Staff Management**: User and role management
- **Treatment Management**: Treatment templates and planning

### 2. Server Actions Architecture

Based on Apexo workflows, server actions are organized by domain:

- **patient-actions.ts**: Create, update, search patients with computed properties
- **appointment-actions.ts**: Create appointments with conflict detection
- **payment-actions.ts**: Record payments with Philippine validation
- Each action includes validation, authorization, and audit logging

### 3. Component Organization

Components are organized by purpose and reusability:

- **ui/**: Base components (shadcn/ui)
- **forms/**: Domain-specific forms with Zod validation
- **tables/**: Data display components
- **dental/**: Specialized dental components (tooth charts, treatment planning)
- **calendar/**: Appointment scheduling components

### 4. Type Safety

Comprehensive TypeScript coverage:

- **apexo-domain.ts**: Domain models based on Apexo analysis
- Zod schemas for validation
- Supabase generated types
- Computed properties interfaces (like Apexo)

### 5. Multi-Tenant Architecture

Built-in multi-tenancy support:

- Clinic-based data isolation
- Row-level security policies
- Tenant context in all operations
- Supabase RLS integration

## Next Steps

1. **Generate remaining server actions** for staff, treatments, invoices
2. **Implement core UI components** starting with patient management
3. **Set up calendar/scheduling** components with conflict detection
4. **Build payment processing** with Philippine payment method support
5. **Create dental chart** components for visual treatment planning
6. **Implement reporting** and analytics features

This architecture provides a solid foundation for a production-ready dental clinic management system based on the proven Apexo domain model with enhancements for the Philippine market.