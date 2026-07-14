import { z } from "zod";
import { logger } from "@/lib/observability/logger";
import type {
  CRMAdapter,
  CRMAdapterConfig,
  CRMContact,
  CRMLeadRef,
  CRMTaskRef,
  ContactQuery,
  CreateLeadInput,
  CreateTaskInput,
  UpdateLeadInput,
} from "../types";

const PROVIDER = "hubspot";
const BASE_URL = "https://api.hubapi.com";

// ---------------------------------------------------------------------------
// Zod schemas for HubSpot API responses
// ---------------------------------------------------------------------------

const HubSpotContactSchema = z.object({
  id: z.string(),
  properties: z.object({
    firstname: z.string().optional().default(""),
    lastname: z.string().optional().default(""),
    email: z.string().optional().default(""),
    phone: z.string().optional().default(""),
    company: z.string().optional().default(""),
    hs_lead_status: z.string().optional().default(""),
    createdate: z.string().optional(),
    lastmodifieddate: z.string().optional(),
  }),
});

const HubSpotCreateResponseSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
});

const HubSpotSearchResponseSchema = z.object({
  total: z.number(),
  results: z.array(HubSpotContactSchema),
});

const HubSpotTaskResponseSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
});

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class HubSpotCRMAdapter implements CRMAdapter {
  private readonly apiKey: string;
  private readonly tenantId: string;

  constructor(config: CRMAdapterConfig) {
    const apiKey = config.credentials["apiKey"];
    if (!apiKey) {
      throw new Error("HubSpot adapter requires 'apiKey' in credentials");
    }
    this.apiKey = apiKey;
    this.tenantId = config.tenantId;
    logger.info("HubSpotCRMAdapter initialised", { tenantId: this.tenantId });
  }

  // -----------------------------------------------------------------------
  // createLead
  // -----------------------------------------------------------------------
  async createLead(lead: CreateLeadInput): Promise<CRMLeadRef> {
    const body = {
      properties: {
        firstname: lead.firstName,
        lastname: lead.lastName,
        ...(lead.email && { email: lead.email }),
        ...(lead.phone && { phone: lead.phone }),
        ...(lead.company && { company: lead.company }),
        ...(lead.source && { hs_lead_status: lead.source }),
        ...(lead.notes && { hs_content_membership_notes: lead.notes }),
      },
    };

    const res = await this.request("POST", "/crm/v3/objects/contacts", body);
    const parsed = HubSpotCreateResponseSchema.parse(res);

    logger.info("HubSpot lead created", { id: parsed.id, tenantId: this.tenantId });
    return {
      id: parsed.id,
      externalId: parsed.id,
      provider: PROVIDER,
      createdAt: new Date(parsed.createdAt),
    };
  }

  // -----------------------------------------------------------------------
  // updateLead
  // -----------------------------------------------------------------------
  async updateLead(id: string, data: UpdateLeadInput): Promise<void> {
    const properties: Record<string, string> = {};
    if (data.firstName !== undefined) properties.firstname = data.firstName;
    if (data.lastName !== undefined) properties.lastname = data.lastName;
    if (data.email !== undefined) properties.email = data.email;
    if (data.phone !== undefined) properties.phone = data.phone;
    if (data.company !== undefined) properties.company = data.company;
    if (data.status !== undefined) properties.hs_lead_status = data.status;
    if (data.notes !== undefined) properties.hs_content_membership_notes = data.notes;

    await this.request("PATCH", `/crm/v3/objects/contacts/${encodeURIComponent(id)}`, { properties });
    logger.info("HubSpot lead updated", { id, tenantId: this.tenantId });
  }

  // -----------------------------------------------------------------------
  // getContact
  // -----------------------------------------------------------------------
  async getContact(query: ContactQuery): Promise<CRMContact | null> {
    const filters: Array<{ propertyName: string; operator: string; value: string }> = [];

    if (query.email) {
      filters.push({ propertyName: "email", operator: "EQ", value: query.email });
    } else if (query.phone) {
      filters.push({ propertyName: "phone", operator: "EQ", value: query.phone });
    } else if (query.externalId) {
      filters.push({ propertyName: "hs_object_id", operator: "EQ", value: query.externalId });
    } else {
      logger.warn("getContact called with empty query");
      return null;
    }

    const body = {
      filterGroups: [{ filters }],
      properties: [
        "firstname",
        "lastname",
        "email",
        "phone",
        "company",
        "hs_lead_status",
        "createdate",
        "lastmodifieddate",
      ],
      limit: 1,
    };

    const res = await this.request("POST", "/crm/v3/objects/contacts/search", body);
    const parsed = HubSpotSearchResponseSchema.parse(res);

    if (parsed.total === 0 || parsed.results.length === 0) {
      return null;
    }

    const c = parsed.results[0];
    return {
      id: c.id,
      externalId: c.id,
      firstName: c.properties.firstname,
      lastName: c.properties.lastname,
      email: c.properties.email,
      phone: c.properties.phone,
      company: c.properties.company,
      status: c.properties.hs_lead_status,
      createdAt: c.properties.createdate ? new Date(c.properties.createdate) : new Date(),
      updatedAt: c.properties.lastmodifieddate ? new Date(c.properties.lastmodifieddate) : new Date(),
    };
  }

  // -----------------------------------------------------------------------
  // createTask
  // -----------------------------------------------------------------------
  async createTask(task: CreateTaskInput): Promise<CRMTaskRef> {
    const properties: Record<string, string> = {
      hs_task_subject: task.title,
      hs_task_status: "NOT_STARTED",
    };

    if (task.description) properties.hs_task_body = task.description;
    if (task.dueDate) properties.hs_timestamp = task.dueDate.toISOString();
    if (task.priority) {
      const priorityMap: Record<string, string> = { low: "LOW", medium: "MEDIUM", high: "HIGH" };
      properties.hs_task_priority = priorityMap[task.priority] ?? "MEDIUM";
    }

    const body: Record<string, unknown> = { properties };

    if (task.associatedLeadId) {
      body.associations = [
        {
          to: { id: task.associatedLeadId },
          types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 204 }],
        },
      ];
    }

    const res = await this.request("POST", "/crm/v3/objects/tasks", body);
    const parsed = HubSpotTaskResponseSchema.parse(res);

    logger.info("HubSpot task created", { id: parsed.id, tenantId: this.tenantId });
    return {
      id: parsed.id,
      externalId: parsed.id,
      provider: PROVIDER,
      createdAt: new Date(parsed.createdAt),
    };
  }

  // -----------------------------------------------------------------------
  // Internal HTTP helper
  // -----------------------------------------------------------------------
  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const url = `${BASE_URL}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      logger.error("HubSpot API error", {
        status: response.status,
        method,
        path,
        body: text.slice(0, 500),
      });
      throw new Error(`HubSpot API ${method} ${path} failed with status ${response.status}`);
    }

    return response.json();
  }
}
