import { logger } from "@/lib/observability/logger";
import type {
  CRMAdapter,
  CRMContact,
  CRMLeadRef,
  CRMTaskRef,
  ContactQuery,
  CreateLeadInput,
  CreateTaskInput,
  UpdateLeadInput,
} from "../types";

const PROVIDER = "demo";

function seedContacts(): Map<string, CRMContact> {
  const now = new Date();
  const contacts: CRMContact[] = [
    {
      id: "demo-contact-1",
      externalId: "demo-ext-1",
      firstName: "Sarah",
      lastName: "Mitchell",
      email: "sarah.mitchell@example.com",
      phone: "+15551234001",
      company: "Mitchell Family Trust",
      status: "active",
      createdAt: now,
      updatedAt: now,
      metadata: { interest: "buying", propertyType: "single-family", budget: "450000" },
    },
    {
      id: "demo-contact-2",
      externalId: "demo-ext-2",
      firstName: "James",
      lastName: "Thornton",
      email: "james.thornton@example.com",
      phone: "+15551234002",
      company: "Thornton Properties LLC",
      status: "active",
      createdAt: now,
      updatedAt: now,
      metadata: { interest: "selling", propertyType: "condo", listingPrice: "325000" },
    },
    {
      id: "demo-contact-3",
      externalId: "demo-ext-3",
      firstName: "Maria",
      lastName: "Chen",
      email: "maria.chen@example.com",
      phone: "+15551234003",
      company: "",
      status: "lead",
      createdAt: now,
      updatedAt: now,
      metadata: { interest: "buying", propertyType: "townhouse", preApproved: "true" },
    },
    {
      id: "demo-contact-4",
      externalId: "demo-ext-4",
      firstName: "Robert",
      lastName: "Alvarez",
      email: "robert.alvarez@example.com",
      phone: "+15551234004",
      company: "Alvarez Realty Group",
      status: "active",
      createdAt: now,
      updatedAt: now,
      metadata: { interest: "selling", propertyType: "multi-family", units: "4" },
    },
  ];

  const map = new Map<string, CRMContact>();
  for (const c of contacts) {
    map.set(c.id, c);
  }
  return map;
}

export class DemoCRMAdapter implements CRMAdapter {
  private leads = new Map<string, CreateLeadInput & { id: string; externalId: string; createdAt: Date }>();
  private contacts: Map<string, CRMContact>;
  private tasks = new Map<string, CreateTaskInput & { id: string; externalId: string; createdAt: Date }>();

  constructor() {
    this.contacts = seedContacts();
    logger.info("DemoCRMAdapter initialised with seeded contacts", { count: this.contacts.size });
  }

  async createLead(lead: CreateLeadInput): Promise<CRMLeadRef> {
    const id = crypto.randomUUID();
    const externalId = `demo-lead-${id}`;
    const createdAt = new Date();

    this.leads.set(id, { ...lead, id, externalId, createdAt });

    // Also register as a contact so getContact can find them
    this.contacts.set(id, {
      id,
      externalId,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      company: lead.company ?? "",
      status: "lead",
      createdAt,
      updatedAt: createdAt,
      metadata: lead.metadata,
    });

    logger.debug("Demo lead created", { id, externalId });
    return { id, externalId, provider: PROVIDER, createdAt };
  }

  async updateLead(id: string, data: UpdateLeadInput): Promise<void> {
    const existing = this.leads.get(id);
    if (!existing) {
      throw new Error(`Lead not found: ${id}`);
    }

    Object.assign(existing, data);

    // Keep contact record in sync
    const contact = this.contacts.get(id);
    if (contact) {
      if (data.firstName !== undefined) contact.firstName = data.firstName;
      if (data.lastName !== undefined) contact.lastName = data.lastName;
      if (data.email !== undefined) contact.email = data.email;
      if (data.phone !== undefined) contact.phone = data.phone;
      if (data.company !== undefined) contact.company = data.company;
      if (data.status !== undefined) contact.status = data.status;
      if (data.metadata !== undefined) contact.metadata = data.metadata;
      contact.updatedAt = new Date();
    }

    logger.debug("Demo lead updated", { id });
  }

  async getContact(query: ContactQuery): Promise<CRMContact | null> {
    for (const contact of this.contacts.values()) {
      if (query.externalId && contact.externalId === query.externalId) return contact;
      if (query.email && contact.email === query.email) return contact;
      if (query.phone && contact.phone === query.phone) return contact;
    }
    return null;
  }

  async createTask(task: CreateTaskInput): Promise<CRMTaskRef> {
    const id = crypto.randomUUID();
    const externalId = `demo-task-${id}`;
    const createdAt = new Date();

    this.tasks.set(id, { ...task, id, externalId, createdAt });

    logger.debug("Demo task created", { id, externalId, title: task.title });
    return { id, externalId, provider: PROVIDER, createdAt };
  }
}
