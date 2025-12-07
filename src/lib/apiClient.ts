import { 
  Customer, 
  CustomerDetails,
  Note,
  Project, 
  Invoice, 
  Message, 
  User,
  Lead,
  PipelineStage,
  ProjectStatus,
  QcStatus,
  Segment,
  InvoiceStatus
} from "@/types";
import { API_CONFIG, TOKEN_KEY } from "@/config/api";

const API_BASE_URL = API_CONFIG.BASE_URL;

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

  try {
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
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new ApiError(
        0,
        `Backend-Server nicht erreichbar. Bitte prüfe, ob der Server unter ${API_BASE_URL} läuft.`
      );
    }
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }
    // Wrap other errors
    throw new ApiError(0, error instanceof Error ? error.message : "Unbekannter Fehler");
  }
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

  async deleteCustomer(id: string): Promise<void> {
    return fetchApi<void>(`/customers/${id}`, {
      method: "DELETE",
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
  product_specification?: string;
  net_price?: string;
  processing_days?: number;
  credits?: string;
  content?: string;
  files?: Array<{id: string; filename: string; size: number; uploaded_at: string}>;
  customer_notes?: string;
  internal_notes?: string;
  payload?: Record<string, unknown>;
  assigned_user_id: string;  // Required: Employee to assign
  send_order_confirmation?: boolean;  // Whether to send order confirmation email (default: true)
}

export interface ProjectUpdateRequest {
  product_code?: string;
  product_name?: string;
  product_specification?: string;
  net_price?: string;
  processing_days?: number;
  status?: ProjectStatus;
  qc_status?: QcStatus;
  credits?: string;
  content?: string;
  files?: Array<{id: string; filename: string; size: number; uploaded_at: string}>;
  customer_notes?: string;
  internal_notes?: string;
  deadline?: string;
  payload?: Record<string, unknown>;
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
// USERS API (Employees)
// ============================================================================

export interface EmployeeCredits {
  id: string;
  name: string;
  email: string;
  role: string;
  total_credits: number;
  completed_projects: number;
  in_progress_projects: number;
}

export const usersApi = {
  async getUsers(): Promise<User[]> {
    return fetchApi<User[]>("/users");
  },

  async getEmployees(): Promise<User[]> {
    return fetchApi<User[]>("/users/employees");
  },

  async getEmployeeCredits(): Promise<EmployeeCredits[]> {
    return fetchApi<EmployeeCredits[]>("/users/credits");
  },
};

// ============================================================================
// Export combined API client
// ============================================================================

// ============================================================================
// PAYMENTS API (Stripe)
// ============================================================================

export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" | "CANCELLED";

export interface Payment {
  id: string;
  customer_id: string;
  project_id?: string;
  invoice_id?: string;
  stripe_payment_intent_id?: string;
  stripe_checkout_session_id?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  description?: string;
  product_name?: string;
  payment_method?: string;
  receipt_url?: string;
  created_at: string;
  paid_at?: string;
}

export interface PaymentSummary {
  total_revenue: number;
  total_pending: number;
  total_refunded: number;
  completed_count: number;
  pending_count: number;
  failed_count: number;
}

export interface CheckoutSessionRequest {
  customer_id: string;
  project_id?: string;
  product_name: string;
  amount: number;
  success_url: string;
  cancel_url: string;
}

export interface CheckoutSessionResponse {
  checkout_url: string;
  session_id: string;
}

export interface StripeConfig {
  publishable_key: string;
}

export const paymentsApi = {
  async getPayments(customerId?: string, status?: PaymentStatus): Promise<Payment[]> {
    const params = new URLSearchParams();
    if (customerId) params.append("customer_id", customerId);
    if (status) params.append("status_filter", status);
    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchApi<Payment[]>(`/payments${query}`);
  },

  async getPayment(id: string): Promise<Payment> {
    return fetchApi<Payment>(`/payments/${id}`);
  },

  async getSummary(): Promise<PaymentSummary> {
    return fetchApi<PaymentSummary>("/payments/summary");
  },

  async getStripeConfig(): Promise<StripeConfig> {
    return fetchApi<StripeConfig>("/payments/config");
  },

  async createCheckoutSession(data: CheckoutSessionRequest): Promise<CheckoutSessionResponse> {
    return fetchApi<CheckoutSessionResponse>("/payments/checkout", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// ============================================================================
// CUSTOMER PORTAL API
// ============================================================================

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  company_name?: string;
  phone?: string;
}

export interface CustomerStats {
  projects_count: number;
  invoices_count: number;
  unpaid_invoices_count: number;
  total_amount: number;
}

export interface CustomerProject {
  id: string;
  product_name: string;
  product_code: string;
  status: string;
  qc_status: string;
  created_at: string;
}

export interface CustomerInvoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface CustomerProfileUpdate {
  name?: string;
  email?: string;
  company_name?: string;
  phone?: string;
}

export const customerPortalApi = {
  async getProfile(): Promise<CustomerProfile> {
    return fetchApi<CustomerProfile>("/customer/me");
  },

  async getStats(): Promise<CustomerStats> {
    return fetchApi<CustomerStats>("/customer/stats");
  },

  async getProjects(): Promise<CustomerProject[]> {
    return fetchApi<CustomerProject[]>("/customer/projects");
  },

  async getInvoices(): Promise<CustomerInvoice[]> {
    return fetchApi<CustomerInvoice[]>("/customer/invoices");
  },

  async updateProfile(data: CustomerProfileUpdate): Promise<CustomerProfile> {
    return fetchApi<CustomerProfile>("/customer/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async createPaymentSession(invoiceId: string): Promise<{ checkout_url: string; invoice_id: string }> {
    return fetchApi<{ checkout_url: string; invoice_id: string }>(`/customer/invoices/${invoiceId}/pay`, {
      method: "POST",
    });
  },
};

export const apiClient = {
  auth: authApi,
  leads: leadsApi,
  customers: customersApi,
  projects: projectsApi,
  invoices: invoicesApi,
  messages: messagesApi,
  qc: qcApi,
  users: usersApi,
  payments: paymentsApi,
  customerPortal: customerPortalApi,
};

export { ApiError, getToken, setToken, removeToken };
