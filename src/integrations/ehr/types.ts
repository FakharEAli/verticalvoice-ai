/**
 * EHR Integration Types
 *
 * Defines the adapter interface and shared types for Electronic Health Record
 * system integrations. All EHR adapters (demo, Epic, Cerner, etc.) implement
 * the EHRAdapter interface.
 */

// ---------------------------------------------------------------------------
// Patient
// ---------------------------------------------------------------------------

export interface PatientRef {
  id: string;
  externalId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  email?: string;
  mrn?: string;
}

export interface PatientSearchQuery {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  phone?: string;
  mrn?: string;
}

// ---------------------------------------------------------------------------
// Appointment types
// ---------------------------------------------------------------------------

export interface EHRAppointmentType {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  requiresReferral: boolean;
}

// ---------------------------------------------------------------------------
// Appointment creation & reference
// ---------------------------------------------------------------------------

export interface CreateEHRAppointmentInput {
  patientId: string;
  providerId: string;
  appointmentTypeId: string;
  scheduledAt: string;
  reason?: string;
  notes?: string;
  duration_minutes?: number;
}

export interface AppointmentRef {
  id: string;
  externalId: string;
  provider: string;
  status: string;
  scheduledAt: string;
}

// ---------------------------------------------------------------------------
// Provider schedule
// ---------------------------------------------------------------------------

export interface ScheduleSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  appointmentId?: string;
}

export interface ProviderSchedule {
  providerId: string;
  date: string;
  slots: ScheduleSlot[];
}

// ---------------------------------------------------------------------------
// Adapter configuration
// ---------------------------------------------------------------------------

export interface EHRAdapterConfig {
  connectionId: string;
  tenantId: string;
  credentials: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Adapter interface
// ---------------------------------------------------------------------------

export interface EHRAdapter {
  searchPatient(query: PatientSearchQuery): Promise<PatientRef[]>;
  getAppointmentTypes(): Promise<EHRAppointmentType[]>;
  createAppointment(appt: CreateEHRAppointmentInput): Promise<AppointmentRef>;
  getProviderSchedule(providerId: string, date: string): Promise<ProviderSchedule>;
}
