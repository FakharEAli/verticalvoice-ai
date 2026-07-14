/**
 * Demo EHR Adapter
 *
 * In-memory EHR adapter seeded with synthetic patients, providers, and
 * appointment types. Used for development, testing, and demos before a
 * real EHR integration (Epic, Cerner, etc.) is wired up.
 */

import { logger } from "@/lib/observability/logger";
import type {
  AppointmentRef,
  CreateEHRAppointmentInput,
  EHRAdapter,
  EHRAdapterConfig,
  EHRAppointmentType,
  PatientRef,
  PatientSearchQuery,
  ProviderSchedule,
  ScheduleSlot,
} from "@/integrations/ehr/types";

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

interface DemoProvider {
  id: string;
  name: string;
  specialty: string;
}

const SEED_PATIENTS: PatientRef[] = [
  {
    id: "pat-001",
    externalId: "EXT-10001",
    firstName: "Maria",
    lastName: "Garcia",
    dateOfBirth: "1985-03-15",
    phone: "+15551234567",
    email: "maria.garcia@example.com",
    mrn: "MRN-001234",
  },
  {
    id: "pat-002",
    externalId: "EXT-10002",
    firstName: "James",
    lastName: "Wilson",
    dateOfBirth: "1972-11-28",
    phone: "+15559876543",
    email: "james.wilson@example.com",
    mrn: "MRN-005678",
  },
  {
    id: "pat-003",
    externalId: "EXT-10003",
    firstName: "Aisha",
    lastName: "Patel",
    dateOfBirth: "1990-07-04",
    phone: "+15552223344",
    email: "aisha.patel@example.com",
    mrn: "MRN-009012",
  },
  {
    id: "pat-004",
    externalId: "EXT-10004",
    firstName: "Robert",
    lastName: "Chen",
    dateOfBirth: "1968-01-22",
    phone: "+15553334455",
    mrn: "MRN-003456",
  },
  {
    id: "pat-005",
    externalId: "EXT-10005",
    firstName: "Sarah",
    lastName: "Thompson",
    dateOfBirth: "1995-09-10",
    phone: "+15554445566",
    email: "sarah.t@example.com",
    mrn: "MRN-007890",
  },
  {
    id: "pat-006",
    externalId: "EXT-10006",
    firstName: "David",
    lastName: "Nguyen",
    dateOfBirth: "1982-05-30",
    phone: "+15555556677",
    email: "david.nguyen@example.com",
    mrn: "MRN-002345",
  },
];

const SEED_PROVIDERS: DemoProvider[] = [
  { id: "prov-001", name: "Dr. Smith", specialty: "Family Medicine" },
  { id: "prov-002", name: "Dr. Patel", specialty: "Cardiology" },
  { id: "prov-003", name: "Dr. Lee", specialty: "Dermatology" },
];

const SEED_APPOINTMENT_TYPES: EHRAppointmentType[] = [
  {
    id: "appt-type-001",
    name: "New Patient Visit",
    description: "Initial visit for new patients including full history and examination",
    durationMinutes: 60,
    requiresReferral: false,
  },
  {
    id: "appt-type-002",
    name: "Follow-up",
    description: "Follow-up visit for existing patients",
    durationMinutes: 30,
    requiresReferral: false,
  },
  {
    id: "appt-type-003",
    name: "Annual Physical",
    description: "Comprehensive annual wellness examination",
    durationMinutes: 45,
    requiresReferral: false,
  },
  {
    id: "appt-type-004",
    name: "Urgent Visit",
    description: "Same-day appointment for urgent medical concerns",
    durationMinutes: 20,
    requiresReferral: false,
  },
];

// ---------------------------------------------------------------------------
// Adapter implementation
// ---------------------------------------------------------------------------

export class DemoEHRAdapter implements EHRAdapter {
  private patients: PatientRef[];
  private appointments: AppointmentRef[] = [];
  private config: EHRAdapterConfig;

  constructor(config: EHRAdapterConfig) {
    this.config = config;
    this.patients = [...SEED_PATIENTS];
    logger.info("DemoEHRAdapter initialized", {
      tenantId: config.tenantId,
      patientCount: this.patients.length,
      providerCount: SEED_PROVIDERS.length,
    });
  }

  // -----------------------------------------------------------------------
  // searchPatient
  // -----------------------------------------------------------------------

  async searchPatient(query: PatientSearchQuery): Promise<PatientRef[]> {
    logger.debug("DemoEHRAdapter.searchPatient", { query });

    const results = this.patients.filter((p) => {
      if (query.firstName && !p.firstName.toLowerCase().includes(query.firstName.toLowerCase())) {
        return false;
      }
      if (query.lastName && !p.lastName.toLowerCase().includes(query.lastName.toLowerCase())) {
        return false;
      }
      if (query.dateOfBirth && p.dateOfBirth !== query.dateOfBirth) {
        return false;
      }
      if (query.phone && !p.phone.includes(query.phone)) {
        return false;
      }
      if (query.mrn && p.mrn !== query.mrn) {
        return false;
      }
      return true;
    });

    logger.info("DemoEHRAdapter.searchPatient results", {
      query,
      resultCount: results.length,
    });

    return results;
  }

  // -----------------------------------------------------------------------
  // getAppointmentTypes
  // -----------------------------------------------------------------------

  async getAppointmentTypes(): Promise<EHRAppointmentType[]> {
    logger.debug("DemoEHRAdapter.getAppointmentTypes");
    return SEED_APPOINTMENT_TYPES;
  }

  // -----------------------------------------------------------------------
  // createAppointment
  // -----------------------------------------------------------------------

  async createAppointment(appt: CreateEHRAppointmentInput): Promise<AppointmentRef> {
    logger.info("DemoEHRAdapter.createAppointment", { appt });

    const provider = SEED_PROVIDERS.find((p) => p.id === appt.providerId);
    const providerName = provider ? provider.name : appt.providerId;

    const ref: AppointmentRef = {
      id: crypto.randomUUID(),
      externalId: `DEMO-${Date.now()}`,
      provider: providerName,
      status: "scheduled",
      scheduledAt: appt.scheduledAt,
    };

    this.appointments.push(ref);

    logger.info("DemoEHRAdapter.createAppointment created", {
      appointmentId: ref.id,
      externalId: ref.externalId,
      provider: ref.provider,
    });

    return ref;
  }

  // -----------------------------------------------------------------------
  // getProviderSchedule
  // -----------------------------------------------------------------------

  async getProviderSchedule(providerId: string, date: string): Promise<ProviderSchedule> {
    logger.debug("DemoEHRAdapter.getProviderSchedule", { providerId, date });

    const slots = generateScheduleSlots(date);

    logger.info("DemoEHRAdapter.getProviderSchedule", {
      providerId,
      date,
      totalSlots: slots.length,
      availableSlots: slots.filter((s) => s.available).length,
    });

    return { providerId, date, slots };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate realistic 30-minute schedule slots from 09:00 to 17:00 for a
 * given date. Some slots are deterministically marked as booked to simulate
 * a partially-filled day.
 */
function generateScheduleSlots(date: string): ScheduleSlot[] {
  const slots: ScheduleSlot[] = [];
  const startHour = 9;
  const endHour = 17;
  const slotMinutes = 30;

  for (let hour = startHour; hour < endHour; hour++) {
    for (let min = 0; min < 60; min += slotMinutes) {
      const startTime = `${date}T${pad(hour)}:${pad(min)}:00`;
      const endMin = min + slotMinutes;
      const endH = endMin >= 60 ? hour + 1 : hour;
      const endM = endMin >= 60 ? endMin - 60 : endMin;
      const endTime = `${date}T${pad(endH)}:${pad(endM)}:00`;

      // Deterministic booking: use a simple hash of the time string so
      // the schedule is stable across calls for the same date.
      const hash = simpleHash(startTime);
      const booked = hash % 4 === 0; // ~25% of slots booked

      const slot: ScheduleSlot = {
        startTime,
        endTime,
        available: !booked,
      };

      if (booked) {
        slot.appointmentId = `existing-${hash.toString(16).slice(0, 8)}`;
      }

      slots.push(slot);
    }
  }

  return slots;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
