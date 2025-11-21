import { 
  Customer, 
  CustomerDetails,
  Note,
  Project, 
  Invoice, 
  Message, 
  ProjectRule,
  User,
  Lead,
  PipelineStage,
  ProjectStatus,
  QcStatus,
  Segment,
  InvoiceStatus
} from "@/types";

const API_BASE_URL = "http://localhost:8080/api";
const TOKEN_KEY = "jeremia_token";

// Error handling
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// Helper: Get token from localStorage
function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// Helper: Set token in localStorage
function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

// Helper: Remove token from localStorage
function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Helper: Make authenticated fetch request
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      // Response is not JSON, use default message
    }

    throw new ApiError(response.status, errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

// ============================================================================
// AUTH API
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: string;
  customer_id?: string;
}

export const authApi = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetchApi<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    
    // Save token
    setToken(response.access_token);
    
    return response;
  },

  async register(data: RegisterRequest): Promise<User> {
    return fetchApi<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async me(): Promise<User> {
    return fetchApi<User>("/auth/me");
  },

  logout(): void {
    removeToken();
  },
};

// ============================================================================
// LEADS API
// ============================================================================

export interface LeadFilters {
  segment?: Segment;
  search?: string;
}

export interface LeadCreateRequest {
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  segment: Segment;
  stage?: PipelineStage;
  street?: string;
  house_number?: string;
  city?: string;
  postal_code?: string;
  tax_number?: string;
  notes?: string;
}

export interface LeadUpdateRequest {
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  segment?: Segment;
  stage?: PipelineStage;
  street?: string;
  house_number?: string;
  city?: string;
  postal_code?: string;
  tax_number?: string;
  notes?: string;
}

export const leadsApi = {
  async getLeads(filters?: LeadFilters): Promise<Lead[]> {
    const params = new URLSearchParams();
    if (filters?.segment) params.append("segment", filters.segment);
    if (filters?.search) params.append("search", filters.search);

    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchApi<Lead[]>(`/leads${query}`);
  },

  async getLead(id: string): Promise<Lead> {
    return fetchApi<Lead>(`/leads/${id}`);
  },

  async createLead(data: LeadCreateRequest): Promise<Lead> {
    return fetchApi<Lead>("/leads", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateLead(id: string, data: LeadUpdateRequest): Promise<Lead> {
    return fetchApi<Lead>(`/leads/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteLead(id: string): Promise<void> {
    return fetchApi<void>(`/leads/${id}`, {
      method: "DELETE",
    });
  },
};

// ============================================================================
// CUSTOMERS API
// ============================================================================

export interface CustomerFilters {
  segment?: Segment;
  stage?: PipelineStage;
  search?: string;
}

export interface CustomerCreateRequest {
  name: string;
  email: string;
  phone?: string;
  segment: Segment;
  stage?: PipelineStage;
}

export interface CustomerUpdateRequest {
  first_name?: string;
  last_name?: string;
  company_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  street?: string;
  house_number?: string;
  city?: string;
  postal_code?: string;
  tax_number?: string;
  segment?: Segment;
  stage?: PipelineStage;
}

export interface UnlockPortalAccessResponse {
  message: string;
  user_id: string;
  email: string;
  temporary_password: string;
  note: string;
}

export const customersApi = {
  async getCustomers(filters?: CustomerFilters): Promise<Customer[]> {
    const params = new URLSearchParams();
    if (filters?.segment) params.append("segment", filters.segment);
    if (filters?.stage) params.append("stage", filters.stage);
    if (filters?.search) params.append("search", filters.search);

    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchApi<Customer[]>(`/customers${query}`);
  },

  async getCustomer(id: string): Promise<Customer> {
    return fetchApi<Customer>(`/customers/${id}`);
  },

  async getCustomerDetails(id: string): Promise<CustomerDetails> {
    return fetchApi<CustomerDetails>(`/customers/${id}/details`);
  },

  async createCustomer(data: CustomerCreateRequest): Promise<Customer> {
    return fetchApi<Customer>("/customers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateCustomer(id: string, data: CustomerUpdateRequest): Promise<Customer> {
    return fetchApi<Customer>(`/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async changeStage(id: string, newStage: PipelineStage): Promise<Customer> {
    return fetchApi<Customer>(`/customers/${id}/change-stage`, {
      method: "POST",
      body: JSON.stringify({ new_stage: newStage }),
    });
  },

  async unlockPortalAccess(id: string, initialPassword?: string): Promise<UnlockPortalAccessResponse> {
    return fetchApi<UnlockPortalAccessResponse>(`/customers/${id}/unlock-portal-access`, {
      method: "POST",
      body: JSON.stringify({ initial_password: initialPassword }),
    });
  },

  // Notes
  async getNotes(customerId: string): Promise<Note[]> {
    return fetchApi<Note[]>(`/customers/${customerId}/notes`);
  },

  async createNote(customerId: string, text: string): Promise<Note> {
    return fetchApi<Note>(`/customers/${customerId}/notes`, {
      method: "POST",
      body: JSON.stringify({ customer_id: customerId, text }),
    });
  },

  async updateNote(noteId: string, text: string): Promise<Note> {
    return fetchApi<Note>(`/customers/notes/${noteId}`, {
      method: "PATCH",
      body: JSON.stringify({ text }),
    });
  },

  async deleteNote(noteId: string): Promise<void> {
    return fetchApi<void>(`/customers/notes/${noteId}`, {
      method: "DELETE",
    });
  },
};

// ============================================================================
// PROJECTS API
// ============================================================================

export interface ProjectFilters {
  status?: ProjectStatus;
  customer_id?: string;
  assigned_to?: string;
}

export interface ProjectCreateRequest {
  customer_id: string;
  product_code: string;
  product_name: string;
  payload?: Record<string, any>;
}

export interface ProjectUpdateRequest {
  product_code?: string;
  product_name?: string;
  status?: ProjectStatus;
  qc_status?: QcStatus;
  payload?: Record<string, any>;
}

export const projectsApi = {
  async getProjects(filters?: ProjectFilters): Promise<Project[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.customer_id) params.append("customer_id", filters.customer_id);
    if (filters?.assigned_to) params.append("assigned_to", filters.assigned_to);

    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchApi<Project[]>(`/projects${query}`);
  },

  async getProject(id: string): Promise<Project> {
    return fetchApi<Project>(`/projects/${id}`);
  },

  async createProject(data: ProjectCreateRequest): Promise<Project> {
    return fetchApi<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateProject(id: string, data: ProjectUpdateRequest): Promise<Project> {
    return fetchApi<Project>(`/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async setStatus(id: string, status: ProjectStatus): Promise<Project> {
    return fetchApi<Project>(`/projects/${id}/set-status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
  },
};

// ============================================================================
// INVOICES API
// ============================================================================

export interface InvoiceFilters {
  customer_id?: string;
  status?: InvoiceStatus;
}

export interface InvoiceCreateRequest {
  customer_id: string;
  project_id?: string;
  amount: number;
  currency?: string;
  status?: InvoiceStatus;
  due_date?: string; // ISO date string
}

export interface InvoiceSummary {
  total_revenue: number;
  open_amount: number;
  open_count: number;
  paid_count: number;
  overdue_count: number;
  draft_count: number;
}

export const invoicesApi = {
  async getInvoices(filters?: InvoiceFilters): Promise<Invoice[]> {
    const params = new URLSearchParams();
    if (filters?.customer_id) params.append("customer_id", filters.customer_id);
    if (filters?.status) params.append("status", filters.status);

    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchApi<Invoice[]>(`/invoices${query}`);
  },

  async getInvoice(id: string): Promise<Invoice> {
    return fetchApi<Invoice>(`/invoices/${id}`);
  },

  async createInvoice(data: InvoiceCreateRequest): Promise<Invoice> {
    return fetchApi<Invoice>("/invoices", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async markPaid(id: string): Promise<Invoice> {
    return fetchApi<Invoice>(`/invoices/${id}/mark-paid`, {
      method: "POST",
    });
  },

  async getSummary(): Promise<InvoiceSummary> {
    return fetchApi<InvoiceSummary>("/invoices/summary");
  },
};

// ============================================================================
// MESSAGES API
// ============================================================================

export interface MessageCreateRequest {
  text: string;
}

export const messagesApi = {
  async getMessages(projectId: string): Promise<Message[]> {
    return fetchApi<Message[]>(`/projects/${projectId}/messages`);
  },

  async createMessage(projectId: string, text: string): Promise<Message> {
    return fetchApi<Message>(`/projects/${projectId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },
};

// ============================================================================
// QC API
// ============================================================================

export const qcApi = {
  async getQcProjects(qcStatus: QcStatus = "PENDING"): Promise<Project[]> {
    return fetchApi<Project[]>(`/qc/projects?qc_status=${qcStatus}`);
  },

  async approveProject(id: string): Promise<Project> {
    return fetchApi<Project>(`/qc/projects/${id}/approve`, {
      method: "POST",
    });
  },

  async rejectProject(id: string): Promise<Project> {
    return fetchApi<Project>(`/qc/projects/${id}/reject`, {
      method: "POST",
    });
  },
};

// ============================================================================
// PROJECT RULES API
// ============================================================================

export interface ProjectRuleCreateRequest {
  product_code: string;
  product_name: string;
  user_ids: string[];
}

export const projectRulesApi = {
  async getProjectRules(): Promise<ProjectRule[]> {
    return fetchApi<ProjectRule[]>("/project-rules");
  },

  async getProjectRule(id: string): Promise<ProjectRule> {
    return fetchApi<ProjectRule>(`/project-rules/${id}`);
  },

  async createProjectRule(data: ProjectRuleCreateRequest): Promise<ProjectRule> {
    return fetchApi<ProjectRule>("/project-rules", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async deleteProjectRule(id: string): Promise<void> {
    return fetchApi<void>(`/project-rules/${id}`, {
      method: "DELETE",
    });
  },
};

// ============================================================================
// Export combined API client
// ============================================================================

export const apiClient = {
  auth: authApi,
  leads: leadsApi,
  customers: customersApi,
  projects: projectsApi,
  invoices: invoicesApi,
  messages: messagesApi,
  qc: qcApi,
  projectRules: projectRulesApi,
};

export { ApiError, getToken, setToken, removeToken };
