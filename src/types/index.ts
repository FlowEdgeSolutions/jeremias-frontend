export type Segment = "ENERGIEBERATER" | "ENDKUNDE" | "HEIZUNGSBAUER" | "HANDWERKER_KOOPERATION" | "PROJEKTGESCHAEFT";

export type PipelineStage = 
  | "LEAD_LIST" 
  | "FOLLOW_UP" 
  | "STAGE" 
  | "KUNDE" 
  | "BESTANDSKUNDE";

export type ProjectStatus = 
  | "NEU"
  | "IN_BEARBEITUNG" 
  | "REVISION" 
  | "FERTIGGESTELLT" 
  | "ARCHIV"
  | "PROBLEM";

export type QcStatus = "PENDING" | "APPROVED" | "REJECTED";

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE";

export type UserRole = "admin" | "sales" | "project_member" | "customer";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  is_active?: boolean;
  customer_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  salutation?: string;
  email: string;
  phone?: string;
  company_name?: string;
  segment: Segment;
  stage: PipelineStage;
  order_count: number;
  total_revenue: number;
  created_at: string;
  updated_at: string;
  // Legacy frontend fields for compatibility
  createdAt?: Date;
  lastActivityAt?: Date;
  orderCount?: number;
  totalRevenue?: number;
  portalAccess?: boolean;
}

export interface Project {
  id: string;
  customer_id: string;
  product_code: string;
  product_name: string;
  project_number?: string;
  status: ProjectStatus;
  qc_status: QcStatus;
  assigned_user_ids?: string[];
  credits?: string;
  credit_factor?: string;
  content?: string;
  files?: Array<{id: string; filename: string; size: number; uploaded_at: string; source?: 'customer' | 'creation' | 'detail'}>;
  customer_notes?: string;
  internal_notes?: string;
  deadline?: string;
  additional_email?: string;
  // Objektadresse
  project_street?: string;
  project_zip_code?: string;
  project_city?: string;
  project_country?: string;
  payload?: Record<string, unknown>;
  order_confirmation_sent?: boolean;
  order_confirmation_sent_at?: string;
  created_at: string;
  updated_at: string;
  // Legacy frontend fields for compatibility
  customerId?: string;
  customerName?: string;
  productCode?: string;
  productName?: string;
  qcStatus?: QcStatus;
  assignedUserIds?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Invoice {
  id: string;
  customer_id: string;
  project_id?: string;
  invoice_number?: string;
  amount: number;
  currency?: string;
  status: InvoiceStatus;
  due_date?: string;
  paid_at?: string;
  created_at: string;
  updated_at?: string;
  // Sevdesk Invoice for PDF/Link
  sevdesk_invoice_id?: string;
  sevdesk_invoice_pdf_url?: string;
  sevdesk_invoice_url?: string;
  // Legacy frontend fields for compatibility
  customerId?: string;
  projectId?: string;
  dueDate?: Date;
  paidAt?: Date;
  createdAt?: Date;
}

export interface Message {
  id: string;
  project_id: string;
  sender_id: string;
  sender_type: "CUSTOMER" | "INTERNAL";
  text: string;
  created_at: string;
  // Legacy frontend fields for compatibility
  projectId?: string;
  senderType?: "CUSTOMER" | "INTERNAL";
  senderName?: string;
  createdAt?: Date;
}

export interface ProjectRule {
  id: string;
  product_code: string;
  product_name: string;
  assigned_user_ids: string[];
  // Legacy frontend fields for compatibility
  productCode?: string;
  productName?: string;
  assignedUserIds?: string[];
}

export interface Lead {
  id: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  segment: Segment;
  stage: PipelineStage;
  street?: string;
  house_number?: string;
  city?: string;
  postal_code?: string;
  tax_number?: string;
  notes?: string;
  created_at: string;
}

export interface Note {
  id: string;
  customer_id: string;
  user_id: string;
  text: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerDetails {
  customer: {
    id: string;
    name: string;
    first_name?: string;
    last_name?: string;
    company_name?: string;
    salutation?: string;
    email: string;
    phone?: string;
    website?: string;
    street?: string;
    house_number?: string;
    city?: string;
    postal_code?: string;
    tax_number?: string;
    segment: Segment;
    stage: PipelineStage;
    created_at: string;
    updated_at: string;
  };
  metrics: {
    total_revenue: number;
    average_monthly_revenue?: number;
    average_two_months?: number;
    trend_percent?: number;
    last_activity?: string;
    days_since_activity?: number;
    activity_status: 'green' | 'yellow' | 'red';
    order_count: number;
  };
  product_interests: {
    "3D_MODELLIERUNG_HUELLE": number;
    "3D_MODELLIERUNG_RAEUME": number;
    "LCA_QNG": number;
    "ISFP_ERSTELLUNG": number;
    "WAERMEBRUECKEN": number;
    "HEIZLAST": number;
    "HEIZLAST_HYDRAULISCH": number;
  };
  projects_count: number;
  invoices_count: number;
}

export interface ProductOption {
  code: string;
  name: string;
  description: string;
}

// ============= Email Account Types =============

export type EmailProvider = "gmail" | "microsoft";

export type EmailAccountStatus = 
  | "pending" 
  | "active" 
  | "auth_failed" 
  | "error" 
  | "disconnected";

export interface EmailAccount {
  id: string;
  provider: EmailProvider;
  email: string | null;
  display_name: string | null;
  is_primary: boolean;
  status: EmailAccountStatus;
  status_display: string;
  last_status_check: string | null;
  last_error: string | null;
  needs_reauth: boolean;
  created_at: string;
}

export interface EmailAccountsListResponse {
  accounts: EmailAccount[];
  total_count: number;
  has_connected_accounts: boolean;
}

export interface ConnectAccountResponse {
  auth_url: string;
  account_id: string;
  provider: EmailProvider;
  message: string;
}
