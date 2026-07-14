export interface CRMLeadRef {
  id: string;
  externalId: string;
  provider: string;
  createdAt: Date;
}

export interface CreateLeadInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateLeadInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface ContactQuery {
  email?: string;
  phone?: string;
  externalId?: string;
}

export interface CRMContact {
  id: string;
  externalId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  dueDate?: Date;
  assignedTo?: string;
  associatedLeadId?: string;
  priority?: "low" | "medium" | "high";
}

export interface CRMTaskRef {
  id: string;
  externalId: string;
  provider: string;
  createdAt: Date;
}

export interface CRMAdapterConfig {
  connectionId: string;
  tenantId: string;
  credentials: Record<string, string>;
}

export interface CRMAdapter {
  createLead(lead: CreateLeadInput): Promise<CRMLeadRef>;
  updateLead(id: string, data: UpdateLeadInput): Promise<void>;
  getContact(query: ContactQuery): Promise<CRMContact | null>;
  createTask(task: CreateTaskInput): Promise<CRMTaskRef>;
}
