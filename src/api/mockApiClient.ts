import { 
  Customer, 
  Project, 
  Invoice, 
  Message, 
  ProjectRule, 
  User,
  PipelineStage,
  ProjectStatus,
  QcStatus,
  ProductOption
} from "@/types";

// Mock Users
export const mockUsers: User[] = [
  { id: "u1", name: "Admin User", email: "admin@firma.de", role: "admin" },
  { id: "u2", name: "Max Müller", email: "max@firma.de", role: "project_member" },
  { id: "u3", name: "Lisa Schmidt", email: "lisa@firma.de", role: "project_member" },
  { id: "u4", name: "Kunde GmbH", email: "kunde@example.com", role: "customer" },
];

// Mock Customers
export const mockCustomers: Customer[] = [
  {
    id: "c1",
    name: "Energieberatung Nord GmbH",
    email: "info@eb-nord.de",
    phone: "+49 40 12345678",
    segment: "ENERGIEBERATER",
    stage: "LEAD_LIST",
    createdAt: new Date("2024-01-15"),
    lastActivityAt: new Date("2024-11-15"),
    orderCount: 0,
    totalRevenue: 0,
    portalAccess: false,
  },
  {
    id: "c2",
    name: "Familie Mustermann",
    email: "max.mustermann@example.com",
    phone: "+49 30 98765432",
    segment: "ENDKUNDE",
    stage: "FOLLOW_UP",
    createdAt: new Date("2024-02-10"),
    lastActivityAt: new Date("2024-11-10"),
    orderCount: 1,
    totalRevenue: 850,
    portalAccess: false,
  },
  {
    id: "c3",
    name: "Heizung & Sanitär Meier",
    email: "info@heizung-meier.de",
    phone: "+49 89 55667788",
    segment: "HEIZUNGSBAUER",
    stage: "KUNDE",
    createdAt: new Date("2024-03-05"),
    lastActivityAt: new Date("2024-11-18"),
    orderCount: 8,
    totalRevenue: 12400,
    portalAccess: true,
  },
  {
    id: "c4",
    name: "Bauträger XYZ AG",
    email: "projekt@xyz-bau.de",
    phone: "+49 221 44556677",
    segment: "PROJEKTGESCHAEFT",
    stage: "BESTANDSKUNDE",
    createdAt: new Date("2023-10-01"),
    lastActivityAt: new Date("2024-11-19"),
    orderCount: 25,
    totalRevenue: 48500,
    portalAccess: true,
  },
  {
    id: "c5",
    name: "Öko-Energieberatung Süd",
    email: "info@oeko-sued.de",
    phone: "+49 711 33445566",
    segment: "ENERGIEBERATER",
    stage: "PRE_STAGE",
    createdAt: new Date("2024-04-20"),
    lastActivityAt: new Date("2024-11-12"),
    orderCount: 2,
    totalRevenue: 1800,
    portalAccess: false,
  },
];

// Mock Projects
export const mockProjects: Project[] = [
  {
    id: "p1",
    customerId: "c2",
    customerName: "Familie Mustermann",
    productCode: "3DMODEL",
    productName: "3D-Modell",
    status: "IN_BEARBEITUNG",
    qcStatus: "PENDING",
    assignedUserIds: ["u2"],
    createdAt: new Date("2024-11-01"),
    updatedAt: new Date("2024-11-18"),
  },
  {
    id: "p2",
    customerId: "c3",
    customerName: "Heizung & Sanitär Meier",
    productCode: "HEIZLAST",
    productName: "Heizlastberechnung",
    status: "REVISION",
    qcStatus: "REJECTED",
    assignedUserIds: ["u3"],
    createdAt: new Date("2024-10-25"),
    updatedAt: new Date("2024-11-17"),
  },
  {
    id: "p3",
    customerId: "c4",
    customerName: "Bauträger XYZ AG",
    productCode: "PAKET",
    productName: "Komplett-Paket",
    status: "IN_BEARBEITUNG",
    qcStatus: "PENDING",
    assignedUserIds: ["u2", "u3"],
    createdAt: new Date("2024-11-10"),
    updatedAt: new Date("2024-11-19"),
  },
  {
    id: "p4",
    customerId: "c3",
    customerName: "Heizung & Sanitär Meier",
    productCode: "3DMODEL",
    productName: "3D-Modell",
    status: "FERTIGGESTELLT",
    qcStatus: "APPROVED",
    assignedUserIds: ["u2"],
    createdAt: new Date("2024-10-05"),
    updatedAt: new Date("2024-10-20"),
  },
];

// Mock Invoices
export const mockInvoices: Invoice[] = [
  {
    id: "inv1",
    customerId: "c2",
    projectId: "p1",
    amount: 850,
    status: "SENT",
    dueDate: new Date("2024-12-01"),
    createdAt: new Date("2024-11-01"),
  },
  {
    id: "inv2",
    customerId: "c3",
    projectId: "p4",
    amount: 1200,
    status: "PAID",
    dueDate: new Date("2024-11-15"),
    paidAt: new Date("2024-11-12"),
    createdAt: new Date("2024-10-20"),
  },
  {
    id: "inv3",
    customerId: "c4",
    projectId: "p3",
    amount: 5500,
    status: "SENT",
    dueDate: new Date("2024-11-25"),
    createdAt: new Date("2024-11-10"),
  },
  {
    id: "inv4",
    customerId: "c3",
    amount: 980,
    status: "OVERDUE",
    dueDate: new Date("2024-10-30"),
    createdAt: new Date("2024-10-01"),
  },
];

// Mock Messages
export const mockMessages: Message[] = [
  {
    id: "msg1",
    projectId: "p1",
    senderType: "CUSTOMER",
    senderName: "Max Mustermann",
    text: "Hallo, wann kann ich mit den ersten Entwürfen rechnen?",
    createdAt: new Date("2024-11-15T10:30:00"),
  },
  {
    id: "msg2",
    projectId: "p1",
    senderType: "INTERNAL",
    senderName: "Max Müller",
    text: "Die ersten Entwürfe sind bis Ende der Woche fertig!",
    createdAt: new Date("2024-11-15T14:20:00"),
  },
  {
    id: "msg3",
    projectId: "p2",
    senderType: "INTERNAL",
    senderName: "Lisa Schmidt",
    text: "Bitte überprüfen Sie die aktualisierten Berechnungen.",
    createdAt: new Date("2024-11-17T09:15:00"),
  },
];

// Mock Project Rules
export const mockProjectRules: ProjectRule[] = [
  {
    id: "r1",
    productCode: "3DMODEL",
    productName: "3D-Modell",
    assignedUserIds: ["u2"],
  },
  {
    id: "r2",
    productCode: "HEIZLAST",
    productName: "Heizlastberechnung",
    assignedUserIds: ["u3"],
  },
  {
    id: "r3",
    productCode: "PAKET",
    productName: "Komplett-Paket",
    assignedUserIds: ["u2", "u3"],
  },
];

// Product Options
export const mockProductOptions: ProductOption[] = [
  { code: "3DMODEL", name: "3D-Modell", description: "Detailliertes 3D-Modell des Gebäudes" },
  { code: "HEIZLAST", name: "Heizlastberechnung", description: "Professionelle Heizlastberechnung nach DIN" },
  { code: "GRUNDRISS", name: "Grundrissplanung", description: "Digitale Grundrisse und Pläne" },
  { code: "PAKET", name: "Komplett-Paket", description: "Alle Services in einem Paket" },
];

// Mock API Client
// TODO: Replace these with real API calls to Python/FastAPI backend
class MockApiClient {
  // Customers
  async getCustomers(): Promise<Customer[]> {
    // TODO: Replace with GET /api/customers
    return Promise.resolve([...mockCustomers]);
  }

  async updateCustomerStage(customerId: string, stage: PipelineStage): Promise<Customer> {
    // TODO: Replace with PATCH /api/customers/{customerId}/stage
    const customer = mockCustomers.find(c => c.id === customerId);
    if (!customer) throw new Error("Customer not found");
    customer.stage = stage;
    customer.lastActivityAt = new Date();
    return Promise.resolve(customer);
  }

  async unlockPortalAccess(customerId: string): Promise<Customer> {
    // TODO: Replace with POST /api/customers/{customerId}/unlock-portal-access
    const customer = mockCustomers.find(c => c.id === customerId);
    if (!customer) throw new Error("Customer not found");
    customer.portalAccess = true;
    return Promise.resolve(customer);
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    // TODO: Replace with GET /api/projects
    return Promise.resolve([...mockProjects]);
  }

  async updateProjectStatus(projectId: string, status: ProjectStatus, qcStatus?: QcStatus): Promise<Project> {
    // TODO: Replace with PATCH /api/projects/{projectId}/status
    const project = mockProjects.find(p => p.id === projectId);
    if (!project) throw new Error("Project not found");
    project.status = status;
    if (qcStatus) project.qcStatus = qcStatus;
    project.updatedAt = new Date();
    return Promise.resolve(project);
  }

  // Messages
  async getMessages(projectId: string): Promise<Message[]> {
    // TODO: Replace with GET /api/projects/{projectId}/messages
    return Promise.resolve(mockMessages.filter(m => m.projectId === projectId));
  }

  async sendMessage(projectId: string, text: string, senderType: "CUSTOMER" | "INTERNAL", senderName: string): Promise<Message> {
    // TODO: Replace with POST /api/projects/{projectId}/messages
    const newMessage: Message = {
      id: `msg${Date.now()}`,
      projectId,
      senderType,
      senderName,
      text,
      createdAt: new Date(),
    };
    mockMessages.push(newMessage);
    return Promise.resolve(newMessage);
  }

  // Invoices
  async getInvoices(): Promise<Invoice[]> {
    // TODO: Replace with GET /api/invoices
    return Promise.resolve([...mockInvoices]);
  }

  // Project Rules
  async getProjectRules(): Promise<ProjectRule[]> {
    // TODO: Replace with GET /api/project-rules
    return Promise.resolve([...mockProjectRules]);
  }

  async createProjectRule(rule: Omit<ProjectRule, "id">): Promise<ProjectRule> {
    // TODO: Replace with POST /api/project-rules
    const newRule: ProjectRule = {
      ...rule,
      id: `r${Date.now()}`,
    };
    mockProjectRules.push(newRule);
    return Promise.resolve(newRule);
  }

  // Products
  async getProductOptions(): Promise<ProductOption[]> {
    // TODO: Replace with GET /api/products
    return Promise.resolve([...mockProductOptions]);
  }

  // Orders
  async createOrder(orderData: any): Promise<Project> {
    // TODO: Replace with POST /api/orders
    const newProject: Project = {
      id: `p${Date.now()}`,
      customerId: orderData.customerId,
      customerName: orderData.customerName,
      productCode: orderData.productCode,
      productName: orderData.productName,
      status: "IN_BEARBEITUNG",
      qcStatus: "PENDING",
      assignedUserIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockProjects.push(newProject);
    return Promise.resolve(newProject);
  }

  // Users
  async getUsers(): Promise<User[]> {
    // TODO: Replace with GET /api/users
    return Promise.resolve([...mockUsers]);
  }
}

export const apiClient = new MockApiClient();
