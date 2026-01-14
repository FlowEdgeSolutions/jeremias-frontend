import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { projectsApi, customersApi, invoicesApi, qcApi, filesApi } from "@/lib/apiClient";
import type { ProjectUpdateRequest, ProjectFileInfo } from "@/lib/apiClient";
import { Project, Customer, ProjectStatus, User, Invoice } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Save, Upload, FileText, Trash2, AlertTriangle, Mic, MicOff, Plus, CheckCircle2, XCircle, Mail, Send, Paperclip, Reply, FileDown, X, Inbox, Eye, ExternalLink } from "lucide-react";
import { RichTextEditor } from "@/components/common/RichTextEditor";
import { API_CONFIG, TOKEN_KEY } from "@/config/api";

interface EmailMessage {
  id: string;
  from: string;
  from_name: string;
  to: string;
  subject: string;
  body_text: string;
  body_html?: string;
  date: string;
  snippet?: string;
  is_read?: boolean;
  is_outgoing: boolean;
  has_attachments?: boolean;
  attachments?: Array<{ id: string; filename: string; size: number }>;
}

interface EmailAccount {
  id: string;
  email: string;
  provider: string;
  is_primary: boolean;
}

interface EmailAttachment {
  id: string;
  filename: string;
  data: string;  // Base64 encoded
  content_type: string;
  size: number;
}

interface Signature {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  NEU: "Neu",
  IN_BEARBEITUNG: "In Bearbeitung",
  REVISION: "Revision",
  FERTIGGESTELLT: "Fertiggestellt",
  ARCHIV: "Archiviert",
  PROBLEM: "Problem",
};

const STATUS_COLORS: Record<ProjectStatus, string> = {
  NEU: "bg-gray-500",
  IN_BEARBEITUNG: "bg-blue-500",
  REVISION: "bg-yellow-500",
  FERTIGGESTELLT: "bg-green-500",
  ARCHIV: "bg-gray-500",
  PROBLEM: "bg-red-500",
};

export const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectInvoice, setProjectInvoice] = useState<Invoice | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [qcActionLoading, setQcActionLoading] = useState(false);

  type ProjectNote = { id: string; text: string; created_at: string };

  const extractProjectNotesFromPayload = (payload?: Record<string, unknown>) => {
    const empty = { customer: [] as ProjectNote[], internal: [] as ProjectNote[] };
    if (!payload) return empty;
    const crmNotes = payload["crm_notes"];
    if (!crmNotes || typeof crmNotes !== "object" || Array.isArray(crmNotes)) return empty;
    const crmNotesRecord = crmNotes as Record<string, unknown>;

    const normalize = (value: unknown): ProjectNote[] => {
      if (!Array.isArray(value)) return [];
      return value
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const record = entry as Record<string, unknown>;
          const noteId = typeof record["id"] === "string" ? record["id"] : null;
          const text = typeof record["text"] === "string" ? record["text"] : null;
          const createdAt = typeof record["created_at"] === "string" ? record["created_at"] : null;
          if (!noteId || !text || !createdAt) return null;
          return { id: noteId, text, created_at: createdAt } as ProjectNote;
        })
        .filter(Boolean) as ProjectNote[];
    };

    return {
      customer: normalize(crmNotesRecord["customer"]),
      internal: normalize(crmNotesRecord["internal"]),
    };
  };

  const buildPayloadWithProjectNotes = (
    basePayload: Record<string, unknown> | undefined,
    notes: { customer: ProjectNote[]; internal: ProjectNote[] }
  ) => {
    return {
      ...(basePayload || {}),
      crm_notes: {
        customer: notes.customer,
        internal: notes.internal,
      },
    } satisfies Record<string, unknown>;
  };

  const extractOutputTextFromPayload = (payload?: Record<string, unknown>) => {
    if (!payload) return "";
    const value = payload["output_text"];
    return typeof value === "string" ? value : "";
  };

  const buildPayloadWithOutputText = (basePayload: Record<string, unknown> | undefined, nextOutputText: string) => {
    return {
      ...(basePayload || {}),
      output_text: nextOutputText,
    } satisfies Record<string, unknown>;
  };
  
  // Editable fields
  const [projectNumber, setProjectNumber] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("IN_BEARBEITUNG");
  const [credits, setCredits] = useState("");
  const [content, setContent] = useState("");
  const [outputText, setOutputText] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [deadline, setDeadline] = useState<string>(""); // Frist/Deadline
  const [additionalEmail, setAdditionalEmail] = useState<string>(""); // Optional: Additional project-specific email
  
  // Objektadresse
  const [projectStreet, setProjectStreet] = useState<string>("");
  const [projectZipCode, setProjectZipCode] = useState<string>("");
  const [projectCity, setProjectCity] = useState<string>("");
  const [projectCountry, setProjectCountry] = useState<string>("Deutschland");
  
  // Notes lists and input
  const [customerNotesList, setCustomerNotesList] = useState<Array<{id: string; text: string; created_at: string}>>([]);
  const [internalNotesList, setInternalNotesList] = useState<Array<{id: string; text: string; created_at: string}>>([]);
  const [newCustomerNote, setNewCustomerNote] = useState("");
  const [newInternalNote, setNewInternalNote] = useState("");
  
  const [projectFiles, setProjectFiles] = useState<ProjectFileInfo[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesUploading, setFilesUploading] = useState(false);
  
  // Determine if credits can be manually edited based on product
  const [allowCustomCredits, setAllowCustomCredits] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [activeNoteField, setActiveNoteField] = useState<'customer' | 'internal' | null>(null);
  
  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ProjectStatus | null>(null);
  const [checklistConfirmed, setChecklistConfirmed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Email communication state
  const [customerEmails, setCustomerEmails] = useState<EmailMessage[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [showComposeBox, setShowComposeBox] = useState(false);
  const [composeForm, setComposeForm] = useState({ to: "", subject: "", body: "", accountId: "" });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [selectedSignatureId, setSelectedSignatureId] = useState("");
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const inputFileInputRef = useRef<HTMLInputElement>(null);
  const outputFileInputRef = useRef<HTMLInputElement>(null);

  const formatErrorMessage = (error: unknown) => {
    const err = error as { status?: number; message?: string };
    const message = err?.message || "Unbekannter Fehler";
    const status = typeof err?.status === "number" && err.status > 0 ? ` (HTTP ${err.status})` : "";
    return `Fehler${status}: ${message}`;
  };

  useEffect(() => {
    if (!id) return;
    loadProject();
    loadEmailAccounts();
    
    // Load signatures from localStorage
    const savedSignatures = localStorage.getItem("email_signatures");
    if (savedSignatures) {
      setSignatures(JSON.parse(savedSignatures));
    }
  }, [id]);
  
  const loadEmailAccounts = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/email/accounts`, {
        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
      });
      
      if (!response.ok) return;
      
      const data = await response.json();
      const accounts = (data.accounts || [])
        .filter((acc: { email: string | null; status: string }) => acc.email && acc.email.trim() !== "" && acc.status === "active")
        .map((acc: { id: string; email: string; provider: string; is_primary: boolean }) => ({
          id: acc.id,
          email: acc.email,
          provider: acc.provider,
          is_primary: acc.is_primary,
        }));
      
      setEmailAccounts(accounts);
      
      // Set default account - prioritize Microsoft
      const microsoftAccounts = accounts.filter((a: EmailAccount) => a.provider === "microsoft");
      const primaryMicrosoft = microsoftAccounts.find((a: EmailAccount) => a.is_primary) || microsoftAccounts[0];
      const primaryAccount = primaryMicrosoft || accounts.find((a: EmailAccount) => a.is_primary) || accounts[0];
      
      if (primaryAccount) {
        setComposeForm(prev => ({ ...prev, accountId: primaryAccount.id }));
      }
    } catch (error) {
      console.error("Error loading email accounts:", error);
    }
  };
  
  // Load customer emails when customer is loaded (including additional project email)
  useEffect(() => {
    const emailsToLoad = [customer?.email, additionalEmail].filter(Boolean) as string[];
    if (emailsToLoad.length > 0) {
      loadCustomerEmails(emailsToLoad);
    }
  }, [customer, additionalEmail]);

  // Auto-save effect
  useEffect(() => {
    if (!id || !project) return;

    const timeoutId = setTimeout(() => {
      handleAutoSave();
    }, 2000); // Speichert 2 Sekunden nach der letzten Änderung

    return () => clearTimeout(timeoutId);
  }, [
    status,
    credits,
    content,
    outputText,
    customerNotes,
    internalNotes,
    deadline,
    additionalEmail,
    projectStreet,
    projectZipCode,
    projectCity,
    projectCountry,
  ]);

  const loadProject = async () => {
    if (!id) return;
    const isUuidLike = /^[0-9a-fA-F-]{32,36}$/.test(id);
    if (!isUuidLike) {
      toast.error("Fehler beim Laden: Ungültige Projekt-ID");
      return;
    }
    
    try {
      setLoading(true);
      const projectData = await projectsApi.getProject(id);
      setProject(projectData);
      
      // Load customer data
      const customerData = await customersApi.getCustomer(projectData.customer_id);
      setCustomer(customerData);
      
      // Populate form
      setProjectNumber(projectData.project_number || "");
      setStatus(projectData.status);
      setCredits(projectData.credits || "");
      setContent(projectData.content || "");
      setOutputText(extractOutputTextFromPayload(projectData.payload));
      setCustomerNotes(projectData.customer_notes || "");
      setInternalNotes(projectData.internal_notes || "");
      setDeadline(projectData.deadline || "");
      setAdditionalEmail(projectData.additional_email || "");

      const loadedNotes = extractProjectNotesFromPayload(projectData.payload);
      setCustomerNotesList(loadedNotes.customer);
      setInternalNotesList(loadedNotes.internal);
      
      // Objektadresse
      setProjectStreet(projectData.project_street || "");
      setProjectZipCode(projectData.project_zip_code || "");
      setProjectCity(projectData.project_city || "");
      setProjectCountry(projectData.project_country || "Deutschland");
      
      // Check if product allows custom credits
      const creditsAllowedProducts = ["HEIZLAST", "HEIZLAST_HYDRAULISCH", "ISFP_ERSTELLUNG", "INDIVIDUELL"];
      setAllowCustomCredits(creditsAllowedProducts.includes(projectData.product_code));

      // Load files for this project
      try {
        setFilesLoading(true);
        const files = await filesApi.listProjectFiles(projectData.id);
        setProjectFiles(files || []);
      } catch (err) {
        console.error("Failed to load project files:", err);
        setProjectFiles([]);
      } finally {
        setFilesLoading(false);
      }

      // Load invoice for this project (if available)
      try {
        setInvoiceLoading(true);
        const invoices = await invoicesApi.getInvoices({ customer_id: projectData.customer_id });
        const inv = invoices.find((i) => (i.project_id || i.projectId) === projectData.id) || null;
        setProjectInvoice(inv);
      } catch (err) {
        console.error("Failed to load project invoice:", err);
        setProjectInvoice(null);
      } finally {
        setInvoiceLoading(false);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler beim Laden: " + message);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoicePdfBlob = async (invoice: Invoice): Promise<Blob> => {
    if (!invoice.sevdesk_invoice_id) {
      throw new Error("Keine Sevdesk-Rechnung verfügbar");
    }
    const response = await fetch(`${API_CONFIG.BASE_URL}/invoices/${invoice.id}/pdf`, {
      headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
    });
    if (!response.ok) {
      throw new Error(`PDF konnte nicht geladen werden (HTTP ${response.status})`);
    }
    return response.blob();
  };

  const openInvoicePdf = async (invoice: Invoice) => {
    try {
      const blob = await fetchInvoicePdfBlob(invoice);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error(message);
    }
  };

  const downloadInvoicePdf = async (invoice: Invoice) => {
    try {
      const blob = await fetchInvoicePdfBlob(invoice);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Rechnung-${invoice.invoice_number || invoice.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error(message);
    }
  };

  const loadCustomerEmails = async (emails: string[]) => {
    try {
      setLoadingEmails(true);
      
      // Load emails from all provided addresses using Microsoft mail endpoint
      const allEmails: EmailMessage[] = [];
      
      for (const email of emails) {
        if (!email) continue;
        
        // Use correct Microsoft mail endpoint
        const response = await fetch(`${API_CONFIG.BASE_URL}/microsoft-mail/customer-emails?email=${encodeURIComponent(email)}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          allEmails.push(...(data.emails || []));
        }
      }
      
      // Sort by date (newest first) and remove duplicates by ID
      const uniqueEmails = allEmails.reduce((acc, email) => {
        if (!acc.find(e => e.id === email.id)) {
          acc.push(email);
        }
        return acc;
      }, [] as EmailMessage[]);
      
      uniqueEmails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setCustomerEmails(uniqueEmails);
    } catch (error) {
      console.error("Error loading customer emails:", error);
      // Stille Fehlerbehandlung - E-Mails sind optional
    } finally {
      setLoadingEmails(false);
    }
  };
  
  const loadEmailDetails = async (emailId: string) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/microsoft-mail/emails/${emailId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
        },
      });
      const data = await response.json();
      setSelectedEmail(data);
      setShowReplyBox(false);
    } catch (error) {
      toast.error("Fehler beim Laden der E-Mail");
    }
  };
  
  const downloadEmailAttachment = async (emailId: string, attachmentId: string, filename: string) => {
    try {
      const endpoint = `${API_CONFIG.BASE_URL}/microsoft-mail/emails/${emailId}/attachments/${attachmentId}`;
      
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Fehler beim Herunterladen");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`${filename} heruntergeladen`);
    } catch (error) {
      toast.error("Fehler beim Herunterladen des Anhangs");
    }
  };
  
  const replyToEmail = () => {
    if (!selectedEmail) return;
    
    const defaultSig = signatures.find(s => s.isDefault);
    const quotedText = selectedEmail.body_text?.split("\n").join("\n> ") || "";
    const quotedSection = `\n\n---\nAm ${new Date(selectedEmail.date).toLocaleString("de-DE")} schrieb ${selectedEmail.from_name}:\n> ${quotedText}`;
    
    setComposeForm({
      to: selectedEmail.from,
      subject: `Re: ${selectedEmail.subject}`,
      body: defaultSig ? `\n\n${defaultSig.content}${quotedSection}` : quotedSection,
      accountId: composeForm.accountId,
    });
    setAttachments([]);
    setShowReplyBox(true);
  };

  // Attachment handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`Datei "${file.name}" ist zu groß (max. 10 MB)`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setAttachments(prev => [...prev, {
          id: crypto.randomUUID(),
          filename: file.name,
          data: base64,
          content_type: file.type || 'application/octet-stream',
          size: file.size,
        }]);
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const openComposeEmailDialog = () => {
    if (!customer) return;
    
    const defaultSig = signatures.find(s => s.isDefault);
    const projectRef = projectNumber ? `[Projekt ${projectNumber}] ` : "";
    
    // Prioritize Microsoft accounts
    const microsoftAccounts = emailAccounts.filter(a => a.provider === "microsoft");
    const primaryMicrosoft = microsoftAccounts.find(a => a.is_primary) || microsoftAccounts[0];
    const primaryAccount = primaryMicrosoft || emailAccounts.find(a => a.is_primary) || emailAccounts[0];
    
    setComposeForm({
      to: customer.email || "",
      subject: `${projectRef}${project?.product_name || ""}`,
      body: defaultSig ? `\n\n${defaultSig.content}` : "",
      accountId: primaryAccount?.id || "",
    });
    if (defaultSig) {
      setSelectedSignatureId(defaultSig.id);
    }
    setAttachments([]);
    setExpandedEmailId(null);
    setShowReplyBox(false);
    setShowComposeBox(true);
  };

  const handleSendEmail = async () => {
    if (!composeForm.to || !composeForm.subject) {
      toast.error("Bitte Empfänger und Betreff ausfüllen");
      return;
    }
    
    try {
      setSendingEmail(true);
      
      // Determine which endpoint to use based on selected account
      const selectedAccount = emailAccounts.find(a => a.id === composeForm.accountId);
      const provider = selectedAccount?.provider || "microsoft";
      const endpoint = provider === "gmail" ? "gmail/send" : "microsoft-mail/send";
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
        },
        body: JSON.stringify({
          to: composeForm.to,
          subject: composeForm.subject,
          body: composeForm.body,
          account_id: composeForm.accountId,
          is_html: true,
          attachments: attachments.length > 0 ? attachments.map(a => ({
            filename: a.filename,
            data: a.data,
            content_type: a.content_type,
          })) : undefined,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || "Fehler beim Senden der E-Mail";
        throw new Error(errorMessage);
      }
      
      const sentFrom = selectedAccount?.email || "unbekannt";
      const attachmentText = attachments.length > 0 ? ` mit ${attachments.length} Anhang/Anhängen` : "";
      toast.success(`E-Mail erfolgreich gesendet von ${sentFrom}${attachmentText}!`);
      
      setShowComposeBox(false);
      setShowReplyBox(false);
      setAttachments([]);
      setComposeForm({ to: "", subject: "", body: "", accountId: composeForm.accountId });
      
      // Reload emails to show the sent one
      const emailsToLoad = [customer?.email, additionalEmail].filter(Boolean) as string[];
      if (emailsToLoad.length > 0) {
        loadCustomerEmails(emailsToLoad);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Fehler beim Senden der E-Mail";
      toast.error(message);
    } finally {
      setSendingEmail(false);
    }
  };

  const insertSignature = () => {
    if (!selectedSignatureId) return;
    const signature = signatures.find(s => s.id === selectedSignatureId);
    if (signature) {
      setComposeForm({
        ...composeForm,
        body: composeForm.body + "\n\n" + signature.content,
      });
    }
  };

  const formatEmailDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `vor ${diffMins}m`;
    if (diffHours < 24) return `vor ${diffHours}h`;
    if (diffDays < 7) return `vor ${diffDays}d`;
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
  };

  const handleStatusChange = (newStatus: ProjectStatus) => {
    // Wenn "FERTIGGESTELLT" ausgewählt wird, prüfe Voraussetzungen
    if (newStatus === "FERTIGGESTELLT") {
      // Prüfe ob Output-Dateien vorhanden sind
      const hasOutputFiles = getOutputFiles().length > 0;
      
      if (!hasOutputFiles) {
        toast.error("Es muss mindestens eine Datei im Output-Bereich hochgeladen werden, bevor das Projekt als 'Fertiggestellt' markiert werden kann.");
        return;
      }
      
      // Zeige Bestätigungs-Dialog
      setPendingStatus(newStatus);
      setChecklistConfirmed(false);
      setShowConfirmDialog(true);
    } else {
      // Für alle anderen Status direkt setzen
      setStatus(newStatus);
    }
  };

  const handleConfirmStatusChange = () => {
    if (!checklistConfirmed) {
      toast.error("Bitte bestätige, dass alle Punkte der Checkliste erfüllt wurden.");
      return;
    }
    
    if (pendingStatus) {
      setStatus(pendingStatus);
      setShowConfirmDialog(false);
      setPendingStatus(null);
      setChecklistConfirmed(false);
      toast.success("Status auf 'Fertiggestellt' gesetzt. Das Projekt erscheint nun in der Qualitätskontrolle. Bitte speichern nicht vergessen!");
    }
  };

  const handleCancelStatusChange = () => {
    setShowConfirmDialog(false);
    setPendingStatus(null);
    setChecklistConfirmed(false);
  };

  const handleSave = async () => {
    if (!id) return;
    
    try {
      setIsSaving(true);
      
      // Wenn Status auf FERTIGGESTELLT gesetzt wird, setze auch qc_status auf PENDING
      const basePayload = project?.payload || {};
      const nextPayload = buildPayloadWithProjectNotes(buildPayloadWithOutputText(basePayload, outputText), {
        customer: customerNotesList,
        internal: internalNotesList,
      });

      const updateData: ProjectUpdateRequest = {
        status,
        credits: allowCustomCredits ? credits : undefined,
        content,
        payload: nextPayload,
        customer_notes: customerNotes,
        internal_notes: internalNotes,
        deadline: deadline || undefined,
        additional_email: additionalEmail || undefined,
        // Objektadresse
        project_street: projectStreet || undefined,
        project_zip_code: projectZipCode || undefined,
        project_city: projectCity || undefined,
        project_country: projectCountry || undefined,
      };
      
      if (status === "FERTIGGESTELLT") {
        updateData.qc_status = "PENDING";
      }
      
      await projectsApi.updateProject(id, updateData);
      setLastSaved(new Date());
      toast.success("Projekt gespeichert");
      loadProject();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler beim Speichern: " + message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoSave = async () => {
    if (!id) return;
    
    try {
      setIsSaving(true);
      
      // Wenn Status auf FERTIGGESTELLT gesetzt wird, setze auch qc_status auf PENDING
      const basePayload = project?.payload || {};
      const nextPayload = buildPayloadWithProjectNotes(buildPayloadWithOutputText(basePayload, outputText), {
        customer: customerNotesList,
        internal: internalNotesList,
      });

      const updateData: ProjectUpdateRequest = {
        status,
        credits: allowCustomCredits ? credits : undefined,
        content,
        payload: nextPayload,
        customer_notes: customerNotes,
        internal_notes: internalNotes,
        deadline: deadline || undefined,
        additional_email: additionalEmail || undefined,
        // Objektadresse
        project_street: projectStreet || undefined,
        project_zip_code: projectZipCode || undefined,
        project_city: projectCity || undefined,
        project_country: projectCountry || undefined,
      };
      
      if (status === "FERTIGGESTELLT") {
        updateData.qc_status = "PENDING";
      }
      
      await projectsApi.updateProject(id, updateData);
      setLastSaved(new Date());
    } catch (error: unknown) {
      // Stilles Fehlerhandling bei Auto-Save
      console.error("Auto-Save Fehler:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const startRecording = async (fieldType: 'customer' | 'internal') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await transcribeAudio(audioBlob, fieldType);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setActiveNoteField(fieldType);
      toast.success("Aufnahme gestartet");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler beim Zugriff auf Mikrofon: " + message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      toast.info("Aufnahme beendet, transkribiere...");
    }
  };

  const transcribeAudio = async (audioBlob: Blob, fieldType: 'customer' | 'internal') => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch(`${API_CONFIG.BASE_URL}/transcribe-note`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        // R4.x: Verbesserte Fehlerbehandlung mit strukturierten Fehlermeldungen
        const errorData = await response.json().catch(() => null);
        let errorMessage = "Transkription fehlgeschlagen";
        let retryAllowed = true;
        
        if (errorData?.detail) {
          if (typeof errorData.detail === 'object') {
            errorMessage = errorData.detail.message || errorMessage;
            retryAllowed = errorData.detail.retry_allowed !== false;
          } else {
            errorMessage = errorData.detail;
          }
        }
        
        if (retryAllowed) {
          toast.error(errorMessage, {
            action: {
              label: "Erneut versuchen",
              onClick: () => transcribeAudio(audioBlob, fieldType),
            },
          });
        } else {
          toast.error(errorMessage);
        }
        return;
      }

      const data = await response.json();
      
      if (fieldType === 'customer') {
        setNewCustomerNote(data.text);
      } else {
        setNewInternalNote(data.text);
      }
      
      toast.success("Transkription abgeschlossen");
      setActiveNoteField(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler bei der Transkription: " + message);
      setActiveNoteField(null);
    }
  };

  const persistProjectNotes = async (nextCustomer: ProjectNote[], nextInternal: ProjectNote[]) => {
    if (!id) return;
    const basePayload = project?.payload || {};
    const nextPayload = buildPayloadWithProjectNotes(buildPayloadWithOutputText(basePayload, outputText), {
      customer: nextCustomer,
      internal: nextInternal,
    });
    const updatedProject = await projectsApi.updateProject(id, { payload: nextPayload });
    setProject(updatedProject);
  };

  const handleAddCustomerNote = async () => {
    if (!newCustomerNote.trim()) return;
    
    const newNote = {
      id: crypto.randomUUID(),
      text: newCustomerNote,
      created_at: new Date().toISOString(),
    };
    
    const nextCustomerNotes = [newNote, ...customerNotesList];
    setCustomerNotesList(nextCustomerNotes);
    setNewCustomerNote("");
    try {
      await persistProjectNotes(nextCustomerNotes, internalNotesList);
    } catch (error: unknown) {
      setCustomerNotesList((prev) => prev.filter((note) => note.id !== newNote.id));
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler beim Speichern der Notiz: " + message);
      return;
    }
    toast.success("Kundennotiz hinzugefügt");
  };

  const handleAddInternalNote = async () => {
    if (!newInternalNote.trim()) return;
    
    const newNote = {
      id: crypto.randomUUID(),
      text: newInternalNote,
      created_at: new Date().toISOString(),
    };
    
    const nextInternalNotes = [newNote, ...internalNotesList];
    setInternalNotesList(nextInternalNotes);
    setNewInternalNote("");
    try {
      await persistProjectNotes(customerNotesList, nextInternalNotes);
    } catch (error: unknown) {
      setInternalNotesList((prev) => prev.filter((note) => note.id !== newNote.id));
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler beim Speichern der Notiz: " + message);
      return;
    }
    toast.success("Interne Notiz hinzugefügt");
  };

  const handleDeleteCustomerNote = async (id: string) => {
    const previous = customerNotesList;
    const nextCustomerNotes = customerNotesList.filter(note => note.id !== id);
    setCustomerNotesList(nextCustomerNotes);
    try {
      await persistProjectNotes(nextCustomerNotes, internalNotesList);
    } catch (error: unknown) {
      setCustomerNotesList(previous);
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler beim Speichern: " + message);
      return;
    }
    toast.success("Notiz gelöscht");
  };

  const handleDeleteInternalNote = async (id: string) => {
    const previous = internalNotesList;
    const nextInternalNotes = internalNotesList.filter(note => note.id !== id);
    setInternalNotesList(nextInternalNotes);
    try {
      await persistProjectNotes(customerNotesList, nextInternalNotes);
    } catch (error: unknown) {
      setInternalNotesList(previous);
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler beim Speichern: " + message);
      return;
    }
    toast.success("Notiz gelöscht");
  };

  const handleApprove = async () => {
    if (!id) return;
    const isUuidLike = /^[0-9a-fA-F-]{32,36}$/.test(id);
    if (!isUuidLike) {
      toast.error("Ungültige Projekt-ID");
      return;
    }
    
    try {
      setQcActionLoading(true);
      await qcApi.approveProject(id);
      toast.success("Projekt freigegeben und ins Archiv verschoben!");
      loadProject(); // Projekt neu laden, um aktualisierte Daten zu erhalten
    } catch (error: unknown) {
      toast.error(formatErrorMessage(error));
    } finally {
      setQcActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!id) return;
    const isUuidLike = /^[0-9a-fA-F-]{32,36}$/.test(id);
    if (!isUuidLike) {
      toast.error("Ungültige Projekt-ID");
      return;
    }
    
    try {
      setQcActionLoading(true);
      await qcApi.rejectProject(id);
      toast.info("Projekt zurück in Revision geschickt");
      loadProject(); // Projekt neu laden, um aktualisierte Daten zu erhalten
    } catch (error: unknown) {
      toast.error(formatErrorMessage(error));
    } finally {
      setQcActionLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!id) return;
    const isUuidLike = /^[0-9a-fA-F-]{32,36}$/.test(id);
    if (!isUuidLike) {
      toast.error("Ungültige Projekt-ID");
      return;
    }
    if (!window.confirm("Projekt wirklich löschen?")) return;
    try {
      await projectsApi.deleteProject(id);
      toast.success("Projekt gelöscht");
      navigate('/app/projects');
    } catch (error: unknown) {
      const err = error as any;
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      if (err?.status === 403) {
        toast.error("Zugriff verweigert. Du brauchst die Rolle 'admin' oder 'sales' zum Löschen.");
      } else {
        toast.error("Fehler beim Löschen: " + message);
      }
    }
  };

  const formatNoteDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const formatFileDate = (dateString?: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const getInputFiles = () => projectFiles.filter((f) => (f.source || "unknown") !== "output");

  const getOutputFiles = () => projectFiles.filter((f) => (f.source || "unknown") === "output");

  const refreshProjectFiles = async () => {
    if (!id) return;
    try {
      setFilesLoading(true);
      const files = await filesApi.listProjectFiles(id);
      setProjectFiles(files || []);
    } catch (error) {
      console.error("Failed to refresh project files:", error);
    } finally {
      setFilesLoading(false);
    }
  };

  const uploadFiles = async (files: FileList | null, source: string) => {
    if (!id || !files) return;
    const selectedFiles = Array.from(files);
    if (selectedFiles.length === 0) return;

    try {
      setFilesUploading(true);
      for (const file of selectedFiles) {
        await filesApi.uploadProjectFile(id, file, source);
      }
      toast.success(`${selectedFiles.length} Datei(en) hochgeladen`);
      await refreshProjectFiles();
    } catch (error: unknown) {
      toast.error(formatErrorMessage(error));
    } finally {
      setFilesUploading(false);
    }
  };

  const handleInputFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = "";
    await uploadFiles(files, "input");
  };

  const openProjectFile = async (file: ProjectFileInfo) => {
    if (!id) return;
    try {
      const url =
        file.download_url ||
        (await filesApi.getProjectFileUrl(id, file.file_id, 2)).download_url;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error: unknown) {
      try {
        const blob = await filesApi.downloadProjectFile(id, file.file_id);
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
      } catch (fallbackError: unknown) {
        toast.error(formatErrorMessage(fallbackError));
      }
    }
  };

  const downloadProjectFile = async (file: ProjectFileInfo) => {
    if (!id) return;
    try {
      const blob = await filesApi.downloadProjectFile(id, file.file_id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.filename || `Datei-${file.file_id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      toast.error(formatErrorMessage(error));
    }
  };

  const handleDeleteProjectFile = async (file: ProjectFileInfo) => {
    if (!id) return;
    if (!window.confirm(`Datei wirklich löschen?\n\n${file.filename}`)) return;

    try {
      await filesApi.deleteProjectFile(id, file.file_id);
      toast.success("Datei gelöscht");
      await refreshProjectFiles();
    } catch (error: unknown) {
      toast.error(formatErrorMessage(error));
    }
  };

  const handleOutputFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = "";
    await uploadFiles(files, "output");
  };

  const calculateRemainingDays = () => {
    if (!deadline) return null;
    
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const getRemainingDaysColor = () => {
    const days = calculateRemainingDays();
    if (days === null) return "text-muted-foreground";
    if (days < 0) return "text-red-600";
    if (days <= 3) return "text-red-600";
    if (days <= 5) return "text-yellow-600";
    return "text-green-600";
  };

  const getRemainingDaysText = () => {
    const days = calculateRemainingDays();
    if (days === null) return "Keine Frist gesetzt";
    if (days < 0) return `${Math.abs(days)} Tag${Math.abs(days) === 1 ? '' : 'e'} überfällig`;
    if (days === 0) return "Heute fällig";
    if (days === 1) return "Noch 1 Tag";
    return `Noch ${days} Tage`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Lade Projektdaten...</p>
      </div>
    );
  }

  if (!project || !customer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Projekt nicht gefunden</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-muted border rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            {/* QC Buttons - nur wenn Status FERTIGGESTELLT und qc_status PENDING */}
            {project.status === "FERTIGGESTELLT" && (project.qc_status === "PENDING" || project.qcStatus === "PENDING") && (
              <>
                <Button
                  className="bg-success hover:bg-success/90 text-success-foreground"
                  onClick={handleApprove}
                  size="sm"
                  disabled={qcActionLoading}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {qcActionLoading ? "Freigeben..." : "Freigeben"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  size="sm"
                  disabled={qcActionLoading}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {qcActionLoading ? "Revision..." : "Revision"}
                </Button>
              </>
            )}

            {/* Admin/Sales: Projekt löschen */}
            {currentUser?.role && ["admin", "sales"].includes(currentUser.role) && (
              <div className="ml-2">
                <Button variant="ghost" size="sm" onClick={handleDeleteProject} title="Projekt löschen">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <div>
              <h1 className="text-3xl font-bold">{project.product_name}</h1>
              <p className="text-lg text-muted-foreground">{projectNumber || "Keine Projektnummer"}</p>
              {deadline && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Frist:</span>
                  <span className="text-sm font-medium">
                    {new Date(deadline).toLocaleDateString("de-DE", { 
                      day: "2-digit", 
                      month: "2-digit", 
                      year: "numeric" 
                    })}
                  </span>
                  <span className={`text-sm font-bold ${getRemainingDaysColor()}`}>
                    ({getRemainingDaysText()})
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${STATUS_COLORS[status]} text-white`}>
              {STATUS_LABELS[status]}
            </Badge>
            
            {isSaving && (
              <span className="text-xs text-muted-foreground">Speichert...</span>
            )}
            {!isSaving && lastSaved && (
              <span className="text-xs text-muted-foreground">
                Zuletzt gespeichert: {lastSaved.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Speichert...' : 'Speichern'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-7 gap-6">
        {/* Left Side: Project Info */}
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Projektinformationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Projektnummer</Label>
                <Input
                  value={projectNumber}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Automatisch generiert
                </p>
              </div>

              <div>
                <Label>Rechnung (Sevdesk)</Label>
                {invoiceLoading ? (
                  <p className="text-sm text-muted-foreground mt-1">Lade Rechnung...</p>
                ) : !projectInvoice ? (
                  <p className="text-sm text-muted-foreground mt-1">Keine Rechnung vorhanden</p>
                ) : projectInvoice.sevdesk_invoice_id ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={() => openInvoicePdf(projectInvoice)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ansehen
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => downloadInvoicePdf(projectInvoice)}>
                      <FileDown className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    {projectInvoice.sevdesk_invoice_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(projectInvoice.sevdesk_invoice_url!, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Sevdesk
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">Keine Sevdesk-Rechnung verfügbar</p>
                )}
              </div>
              
              <div>
                <Label>Kundennummer</Label>
                <p className="font-medium">{customer.id.slice(0, 8)}</p>
              </div>
              
              <div>
                <Label>Kunde</Label>
                <p className="font-medium">
                  {customer.first_name && customer.last_name 
                    ? `${customer.first_name} ${customer.last_name}` 
                    : customer.name}
                </p>
                {customer.company_name && (
                  <p className="text-sm text-muted-foreground">{customer.company_name}</p>
                )}
              </div>
              
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => handleStatusChange(v as ProjectStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Credits</Label>
                {allowCustomCredits ? (
                  <Input
                    value={credits}
                    onChange={(e) => setCredits(e.target.value)}
                    type="number"
                    step="0.01"
                    placeholder="Credits eingeben..."
                  />
                ) : (
                  <Input
                    value={credits}
                    disabled
                    className="bg-muted"
                    placeholder="Wird automatisch berechnet"
                  />
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {allowCustomCredits 
                    ? "Credits können manuell eingegeben werden" 
                    : "Automatisch berechnet: Umsatz / 30"}
                </p>
              </div>
              
              <div>
                <Label>Frist / Deadline</Label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  placeholder="Frist auswählen..."
                />
                {deadline && (
                  <p className={`text-xs font-medium mt-1 ${getRemainingDaysColor()}`}>
                    {getRemainingDaysText()}
                  </p>
                )}
              </div>
              
              <div>
                <Label>Zusätzliche E-Mail (optional)</Label>
                <Input
                  type="email"
                  value={additionalEmail}
                  onChange={(e) => setAdditionalEmail(e.target.value)}
                  placeholder="z.B. ansprechpartner@firma.de"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  E-Mails an diese Adresse werden ebenfalls im Projekt angezeigt
                </p>
              </div>
              
              {/* Objektadresse */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium text-sm text-muted-foreground mb-3">Objektadresse</h4>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Straße + Hausnummer</Label>
                    <Input
                      value={projectStreet}
                      onChange={(e) => setProjectStreet(e.target.value)}
                      placeholder="z.B. Musterstraße 123"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">PLZ</Label>
                      <Input
                        value={projectZipCode}
                        onChange={(e) => setProjectZipCode(e.target.value)}
                        placeholder="12345"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Stadt</Label>
                      <Input
                        value={projectCity}
                        onChange={(e) => setProjectCity(e.target.value)}
                        placeholder="z.B. Berlin"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Land</Label>
                    <Input
                      value={projectCountry}
                      onChange={(e) => setProjectCountry(e.target.value)}
                      placeholder="z.B. Deutschland"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Tabs */}
        <div className="col-span-5">
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="w-full grid grid-cols-3 gap-1">
              <TabsTrigger value="content">Inhalt & Dateien</TabsTrigger>
              <TabsTrigger value="customer">E-Mail-Kommunikation</TabsTrigger>
              <TabsTrigger value="internal">Interne Notizen</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Input Section */}
                <Card className="border-blue-200 bg-blue-50/30">
                  <CardHeader className="bg-blue-100/50">
                    <CardTitle className="text-blue-900">Inhalt & Dateien (Input)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Freitext</Label>
                      <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={10}
                        placeholder="Projektbeschreibung, Details, Hinweise..."
                      />
                    </div>
                    
                    <div>
                      <Label>Dateien</Label>
                      <div className="border rounded-lg p-4">
                        <Button
                          variant="outline"
                          className="w-full"
                          type="button"
                          disabled={filesUploading}
                          onClick={() => inputFileInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Dateien hochladen (Input)
                        </Button>

                        <input
                          ref={inputFileInputRef}
                          type="file"
                          multiple
                          className="sr-only"
                          onChange={handleInputFileUpload}
                        />
                        
                        {filesLoading ? (
                          <p className="text-sm text-muted-foreground text-center mt-4">Dateien werden geladen...</p>
                        ) : getInputFiles().length > 0 ? (
                          <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
                            {getInputFiles().map((file) => (
                              <div key={file.file_id} className="flex items-center justify-between p-2 border rounded bg-white">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="h-4 w-4" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-sm truncate">{file.filename}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatFileDate(file.uploaded_at)}
                                      {formatFileDate(file.uploaded_at) ? " • " : ""}
                                      {formatFileSize(file.size)}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openProjectFile(file)}
                                    title="Öffnen"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => downloadProjectFile(file)}
                                    title="Download"
                                  >
                                    <FileDown className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleDeleteProjectFile(file)}
                                    title="Löschen"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center mt-4">
                            Noch keine Dateien hochgeladen
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Output Section */}
                <Card className="border-green-200 bg-green-50/30">
                  <CardHeader className="bg-green-100/50">
                    <CardTitle className="text-green-900">Inhalt & Dateien (Output)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Freitext (Output)</Label>
                      <Textarea
                        value={outputText}
                        onChange={(e) => setOutputText(e.target.value)}
                        rows={10}
                        placeholder="Ausgabe, Ergebnisse, Berichte..."
                      />
                    </div>
                    
                    <div>
                      <Label>Dateien (Output)</Label>
                      <div className="border rounded-lg p-4">
                        <Button
                          variant="outline"
                          className="w-full"
                          type="button"
                          disabled={filesUploading}
                          onClick={() => outputFileInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Dateien hochladen (Output)
                        </Button>
                        <input
                          ref={outputFileInputRef}
                          type="file"
                          multiple
                          className="sr-only"
                          onChange={handleOutputFileUpload}
                        />
                        
                        {filesLoading ? (
                          <p className="text-sm text-muted-foreground text-center mt-4">Dateien werden geladen...</p>
                        ) : getOutputFiles().length > 0 ? (
                          <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
                            {getOutputFiles().map((file) => (
                              <div key={file.file_id} className="flex items-center justify-between p-2 border rounded bg-green-50">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="h-4 w-4 text-green-600" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-sm truncate">{file.filename}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatFileDate(file.uploaded_at)}
                                      {formatFileDate(file.uploaded_at) ? " • " : ""}
                                      {formatFileSize(file.size)}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openProjectFile(file)}
                                    title="Öffnen"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => downloadProjectFile(file)}
                                    title="Download"
                                  >
                                    <FileDown className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleDeleteProjectFile(file)}
                                    title="Löschen"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center mt-4">
                            Noch keine Output-Dateien hochgeladen
                          </p>
                        )}
                      </div>
                    </div>
                    
                    
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="customer" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      E-Mail-Kommunikation
                    </CardTitle>
                    <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                      {customer?.email && (
                        <p>Kunde: {customer.email}</p>
                      )}
                      {additionalEmail && (
                        <p>Zusätzlich: {additionalEmail}</p>
                      )}
                    </div>
                  </div>
                  <Button onClick={openComposeEmailDialog} className="gap-2">
                    <Mail className="h-4 w-4" />
                    E-Mail schreiben
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Compose Box - E-Mail schreiben */}
                  {showComposeBox && (
                    <div className="mb-4 p-4 border rounded-lg bg-muted/20">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold">Neue E-Mail verfassen</h4>
                        <Button onClick={() => setShowComposeBox(false)} variant="ghost" size="sm">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        {/* Account-Auswahl */}
                        {emailAccounts.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-xs">Senden von</Label>
                            <Select 
                              value={composeForm.accountId} 
                              onValueChange={(value) => setComposeForm({ ...composeForm, accountId: value })}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="E-Mail-Konto wählen" />
                              </SelectTrigger>
                              <SelectContent>
                                {emailAccounts.map((acc) => (
                                  <SelectItem key={acc.id} value={acc.id}>
                                    <span className="flex items-center gap-2">
                                      <Mail className="h-3 w-3" />
                                      {acc.email}
                                      {acc.is_primary && <Badge variant="secondary" className="text-[10px] ml-1">Standard</Badge>}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label className="text-xs">An</Label>
                          {/* Show dropdown if multiple email addresses available */}
                          {(customer?.email && additionalEmail) ? (
                            <Select 
                              value={composeForm.to} 
                              onValueChange={(value) => setComposeForm({...composeForm, to: value})}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Empfänger wählen" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={customer.email}>
                                  {customer.name} ({customer.email})
                                </SelectItem>
                                <SelectItem value={additionalEmail}>
                                  Zusätzlicher Kontakt ({additionalEmail})
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              type="email"
                              value={composeForm.to}
                              onChange={(e) => setComposeForm({ ...composeForm, to: e.target.value })}
                              className="h-8 text-sm"
                            />
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Betreff</Label>
                          <Input
                            value={composeForm.subject}
                            onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                            className="h-8 text-sm"
                            placeholder="Betreff eingeben..."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Nachricht (mit Formatierung)</Label>
                          <RichTextEditor
                            content={composeForm.body}
                            onChange={(html) => setComposeForm(prev => ({ ...prev, body: html }))}
                            placeholder="Ihre Nachricht..."
                          />
                        </div>

                        {/* Anhänge */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Anhänge</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => attachmentInputRef.current?.click()}
                              className="h-7 text-xs gap-1"
                            >
                              <Paperclip className="w-3 h-3" />
                              Datei hinzufügen
                            </Button>
                            <input
                              ref={attachmentInputRef}
                              type="file"
                              multiple
                              className="hidden"
                              onChange={handleFileSelect}
                            />
                          </div>
                          
                          {attachments.length > 0 && (
                            <div className="space-y-1 p-2 bg-secondary/50 rounded-lg">
                              {attachments.map((attachment) => (
                                <div key={attachment.id} className="flex items-center justify-between p-1.5 bg-background rounded border text-xs">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Paperclip className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
                                    <span className="truncate">{attachment.filename}</span>
                                    <span className="text-muted-foreground flex-shrink-0">
                                      ({formatFileSize(attachment.size)})
                                    </span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeAttachment(attachment.id)}
                                    className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                              <p className="text-[10px] text-muted-foreground">
                                {attachments.length} Datei(en) · {formatFileSize(attachments.reduce((sum, a) => sum + a.size, 0))}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Signatur</Label>
                          <div className="flex gap-2">
                            <Select value={selectedSignatureId} onValueChange={setSelectedSignatureId}>
                              <SelectTrigger className="flex-1 h-8 text-sm">
                                <SelectValue placeholder="Signatur wählen" />
                              </SelectTrigger>
                              <SelectContent>
                                {signatures.map((sig) => (
                                  <SelectItem key={sig.id} value={sig.id}>
                                    {sig.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button onClick={insertSignature} variant="outline" size="sm" disabled={!selectedSignatureId}>
                              Einfügen
                            </Button>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button onClick={() => setShowComposeBox(false)} variant="outline" size="sm" className="flex-1">
                            Abbrechen
                          </Button>
                          <Button onClick={handleSendEmail} disabled={sendingEmail} size="sm" className="flex-1 bg-emerald-500 hover:bg-emerald-600">
                            <Mail className="h-4 w-4 mr-2" />
                            {sendingEmail ? 'Sendet...' : 'Senden'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {!customer?.email && !additionalEmail ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>Keine E-Mail-Adresse für diesen Kunden hinterlegt</p>
                    </div>
                  ) : loadingEmails ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="ml-2 text-sm text-muted-foreground">Lade E-Mails...</span>
                    </div>
                  ) : customerEmails.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>Keine E-Mail-Kommunikation mit diesem Kunden</p>
                      <Button onClick={openComposeEmailDialog} variant="outline" className="mt-4 gap-2">
                        <Send className="h-4 w-4" />
                        Erste E-Mail senden
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {customerEmails.map((email) => (
                        <div 
                          key={email.id} 
                          className={`border rounded-lg overflow-hidden ${
                            email.is_outgoing 
                              ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' 
                              : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                          } ${!email.is_read && !email.is_outgoing ? 'ring-2 ring-emerald-400' : ''}`}
                        >
                          {/* Email Header - Klickbar */}
                          <div
                            onClick={() => {
                              if (expandedEmailId === email.id) {
                                setExpandedEmailId(null);
                                setShowReplyBox(false);
                              } else {
                                loadEmailDetails(email.id);
                                setExpandedEmailId(email.id);
                              }
                            }}
                            className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {/* Richtungs-Indikator */}
                                {email.is_outgoing ? (
                                  <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                    <Send className="h-4 w-4" />
                                    <span className="text-[10px] font-medium uppercase">Gesendet</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                    <Inbox className="h-4 w-4" />
                                    <span className="text-[10px] font-medium uppercase">Erhalten</span>
                                  </div>
                                )}
                                <p className={`font-medium text-sm ${
                                  !email.is_read && !email.is_outgoing ? 'font-bold' : ''
                                }`}>
                                  {email.subject}
                                </p>
                                {!email.is_read && !email.is_outgoing && (
                                  <Badge variant="default" className="bg-emerald-500 text-white text-xs px-2 py-0">
                                    Neu
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatEmailDate(email.date)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {email.is_outgoing ? `An: ${email.to}` : `Von: ${email.from_name || email.from}`}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mt-1">{email.snippet || email.body_text?.substring(0, 100)}</p>
                          </div>

                          {/* Expanded Email Content */}
                          {expandedEmailId === email.id && selectedEmail && (
                            <div className="px-4 pb-4 space-y-4 border-t bg-muted/20">
                              {/* Email Body */}
                              <div className="pt-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                                    {selectedEmail.from_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || '?'}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{selectedEmail.from_name}</p>
                                    <p className="text-xs text-muted-foreground">{selectedEmail.from}</p>
                                  </div>
                                </div>
                                {/* E-Mail Body */}
                                <div className="bg-white rounded border overflow-hidden">
                                  <iframe
                                    srcDoc={`
                                      <!DOCTYPE html>
                                      <html>
                                        <head>
                                          <meta charset="utf-8">
                                          <style>
                                            * { box-sizing: border-box; }
                                            body { 
                                              margin: 0; 
                                              padding: 12px; 
                                              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                              font-size: 13px;
                                              line-height: 1.5;
                                              color: #18181b;
                                              background: transparent;
                                              word-wrap: break-word;
                                            }
                                            img { max-width: 100%; height: auto; }
                                            a { color: #0ea5e9; }
                                            pre, code { white-space: pre-wrap; }
                                            table { max-width: 100%; }
                                          </style>
                                        </head>
                                        <body>${selectedEmail.body_html || selectedEmail.body_text}</body>
                                      </html>
                                    `}
                                    className="w-full border-0"
                                    style={{ minHeight: '100px', height: 'auto' }}
                                    onLoad={(e) => {
                                      const iframe = e.target as HTMLIFrameElement;
                                      if (iframe.contentDocument) {
                                        iframe.style.height = iframe.contentDocument.body.scrollHeight + 24 + 'px';
                                      }
                                    }}
                                    sandbox="allow-same-origin"
                                    title="E-Mail Inhalt"
                                  />
                                </div>

                                {/* Anhänge */}
                                {selectedEmail.has_attachments && selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                                  <div className="mt-4 pt-4 border-t">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">
                                      {selectedEmail.attachments.length} Anhang{selectedEmail.attachments.length > 1 ? 'e' : ''}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {selectedEmail.attachments.map(att => (
                                        <button 
                                          key={att.id}
                                          onClick={() => downloadEmailAttachment(selectedEmail.id, att.id, att.filename)}
                                          className="flex items-center gap-2 px-2 py-1.5 bg-secondary rounded text-xs hover:bg-primary/10 hover:text-primary transition-colors group"
                                          title={`${att.filename} herunterladen`}
                                        >
                                          <Paperclip className="w-3 h-3 text-muted-foreground group-hover:text-primary" />
                                          <span className="truncate max-w-[150px]">{att.filename}</span>
                                          <FileDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Reply Button */}
                              {!showReplyBox && (
                                <Button onClick={replyToEmail} variant="outline" size="sm" className="w-full">
                                  <Reply className="h-4 w-4 mr-2" />
                                  Antworten
                                </Button>
                              )}

                              {/* Reply Form */}
                              {showReplyBox && (
                                <div className="space-y-3 bg-background p-4 rounded-lg border">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-sm">Antwort verfassen</h4>
                                    <Button onClick={() => setShowReplyBox(false)} variant="ghost" size="sm">
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>

                                  {/* Account-Auswahl */}
                                  {emailAccounts.length > 0 && (
                                    <div className="space-y-2">
                                      <Label className="text-xs">Senden von</Label>
                                      <Select 
                                        value={composeForm.accountId} 
                                        onValueChange={(value) => setComposeForm({ ...composeForm, accountId: value })}
                                      >
                                        <SelectTrigger className="h-8 text-sm">
                                          <SelectValue placeholder="E-Mail-Konto wählen" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {emailAccounts.map((acc) => (
                                            <SelectItem key={acc.id} value={acc.id}>
                                              <span className="flex items-center gap-2">
                                                <Mail className="h-3 w-3" />
                                                {acc.email}
                                                {acc.is_primary && <Badge variant="secondary" className="text-[10px] ml-1">Standard</Badge>}
                                              </span>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}

                                  <div className="space-y-2">
                                    <Label className="text-xs">An</Label>
                                    <Input
                                      type="email"
                                      value={composeForm.to}
                                      onChange={(e) => setComposeForm({ ...composeForm, to: e.target.value })}
                                      className="h-8 text-sm"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label className="text-xs">Betreff</Label>
                                    <Input
                                      value={composeForm.subject}
                                      onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                                      className="h-8 text-sm"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label className="text-xs">Nachricht</Label>
                                    <RichTextEditor
                                      content={composeForm.body}
                                      onChange={(html) => setComposeForm(prev => ({ ...prev, body: html }))}
                                      placeholder="Ihre Nachricht..."
                                    />
                                  </div>

                                  {/* Anhänge im Reply */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-xs">Anhänge</Label>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => attachmentInputRef.current?.click()}
                                        className="h-7 text-xs gap-1"
                                      >
                                        <Paperclip className="w-3 h-3" />
                                        Datei hinzufügen
                                      </Button>
                                    </div>
                                    
                                    {attachments.length > 0 && (
                                      <div className="space-y-1 p-2 bg-secondary/50 rounded-lg">
                                        {attachments.map((attachment) => (
                                          <div key={attachment.id} className="flex items-center justify-between p-1.5 bg-background rounded border text-xs">
                                            <div className="flex items-center gap-2 min-w-0">
                                              <Paperclip className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
                                              <span className="truncate">{attachment.filename}</span>
                                              <span className="text-muted-foreground flex-shrink-0">
                                                ({formatFileSize(attachment.size)})
                                              </span>
                                            </div>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => removeAttachment(attachment.id)}
                                              className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                                            >
                                              <X className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        ))}
                                        <p className="text-[10px] text-muted-foreground">
                                          {attachments.length} Datei(en) · {formatFileSize(attachments.reduce((sum, a) => sum + a.size, 0))}
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex gap-2 pt-2">
                                    <Button onClick={() => setShowReplyBox(false)} variant="outline" size="sm" className="flex-1">
                                      Abbrechen
                                    </Button>
                                    <Button onClick={handleSendEmail} disabled={sendingEmail} size="sm" className="flex-1 bg-emerald-500 hover:bg-emerald-600">
                                      <Send className="h-4 w-4 mr-2" />
                                      {sendingEmail ? 'Sendet...' : 'Senden'}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="internal" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Interne Notizen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
                    💡 <strong>Tipp:</strong> Sie können beim Sprechen Anweisungen geben wie:
                    <ul className="mt-2 ml-4 list-disc">
                      <li>"Verfasse in formeller Sprache: [Ihre Notiz]"</li>
                      <li>"Fasse zusammen: [Ihre Notiz]"</li>
                      <li>Oder einfach nur die Notiz sprechen</li>
                    </ul>
                  </div>
                  
                  {isRecording && activeNoteField === 'internal' && (
                    <div className="flex items-center gap-2 text-xs text-red-600">
                      <div className="flex items-center gap-0.5">
                        {[4, 8, 12, 10, 6, 14, 8, 5].map((height, i) => (
                          <div
                            key={i}
                            className="w-0.5 bg-red-500 rounded-full animate-pulse"
                            style={{
                              height: `${height}px`,
                              animationDelay: `${i * 0.1}s`,
                            }}
                          />
                        ))}
                      </div>
                      <span>Aufnahme läuft...</span>
                    </div>
                  )}
                  
                  <Textarea
                    placeholder="Neue Notiz..."
                    value={newInternalNote}
                    onChange={(e) => setNewInternalNote(e.target.value)}
                    rows={3}
                  />
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => isRecording && activeNoteField === 'internal' ? stopRecording() : startRecording('internal')}
                      variant={isRecording && activeNoteField === 'internal' ? "destructive" : "outline"}
                      size="sm"
                      className="flex-shrink-0"
                    >
                      {isRecording && activeNoteField === 'internal' ? (
                        <>
                          <MicOff className="h-4 w-4 mr-2" />
                          Aufnahme stoppen
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4 mr-2" />
                          Sprechen
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={handleAddInternalNote} 
                      disabled={!newInternalNote.trim()} 
                      size="sm" 
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Notiz hinzufügen
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {internalNotesList.map((note) => (
                      <div key={note.id} className="p-3 border rounded-lg bg-muted/20">
                        <div className="flex items-start justify-between">
                          <p className="text-sm flex-1">{note.text}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 ml-2"
                            onClick={() => handleDeleteInternalNote(note.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatNoteDate(note.created_at)}
                        </p>
                      </div>
                    ))}
                    {internalNotesList.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">Keine Notizen vorhanden</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Confirmation Dialog for FERTIGGESTELLT Status */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Projekt als 'Fertiggestellt' markieren
            </DialogTitle>
            <DialogDescription>
              Bitte bestätige, dass alle Anforderungen erfüllt wurden.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <p className="text-sm font-medium">Voraussetzungen:</p>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-green-500">✓</span>
                <span>Mindestens eine Output-Datei wurde im grünen Bereich hochgeladen ({getOutputFiles().length} {getOutputFiles().length === 1 ? 'Datei' : 'Dateien'})</span>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="checklist-confirm"
                  checked={checklistConfirmed}
                  onCheckedChange={(checked) => setChecklistConfirmed(checked === true)}
                  className="mt-1"
                />
                <label 
                  htmlFor="checklist-confirm" 
                  className="text-sm font-medium leading-relaxed cursor-pointer"
                >
                  Ich bestätige, dass ich mit unserer Checkliste das Projekt gegengeprüft habe und jeder einzelne Punkt erfüllt wurde.
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleCancelStatusChange}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleConfirmStatusChange}
              disabled={!checklistConfirmed}
              className="bg-green-600 hover:bg-green-700"
            >
              Bestätigen & Fertigstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
