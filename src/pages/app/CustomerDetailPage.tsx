import { Fragment, useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { customersApi, projectsApi, invoicesApi } from "@/lib/apiClient";
import { API_CONFIG, TOKEN_KEY } from "@/config/api";
import { CustomerDetails, Note, Project, Invoice, Segment, PipelineStage } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Edit, List, PhoneCall, Star, UserCheck, Users, Mic, MicOff, Activity, TrendingUp, TrendingDown, Clock, Mail, Reply, FileText, DollarSign, MessageSquare, X, Download, ExternalLink, Paperclip, FileDown, Send, Inbox, Loader2 } from "lucide-react";
import { RichTextEditor } from "@/components/common/RichTextEditor";
import { useAuth } from "@/contexts/AuthContext";

interface EmailAttachment {
  id: string;
  filename: string;
  data: string;
  content_type: string;
  size: number;
}

const PRODUCT_LABELS: Record<string, string> = {
  "3D_MODELLIERUNG_HUELLE": "3D Modellierung (nur thermische Hülle)",
  "3D_MODELLIERUNG_RAEUME": "3D Modellierung (mit Räumen)",
  "LCA_QNG": "LCA/QNG",
  "ISFP_ERSTELLUNG": "iSFP Erstellung",
  "WAERMEBRUECKEN": "Wärmebrücken",
  "HEIZLAST": "Heizlast",
  "HEIZLAST_HYDRAULISCH": "Heizlast, hydraulischer Abgleich",
};

const SEGMENT_LABELS: Record<Segment, string> = {
  ENERGIEBERATER: "Energieberater",
  ENDKUNDE: "Endkunde",
  HEIZUNGSBAUER: "Heizungsbauer",
  HANDWERKER_KOOPERATION: "Handwerker Kooperation",
  PROJEKTGESCHAEFT: "Projektgeschäft",
};

const STAGE_LABELS: Record<PipelineStage, string> = {
  LEAD_LIST: "Leadliste",
  FOLLOW_UP: "Follow Up",
  STAGE: "Stage",
  KUNDE: "Kunde",
  BESTANDSKUNDE: "Bestandskunde",
};

// Stages für Kunden (ohne LEAD_LIST)
const CUSTOMER_STAGE_LABELS: Partial<Record<PipelineStage, string>> = {
  FOLLOW_UP: "Follow Up",
  STAGE: "Stage",
  KUNDE: "Kunde",
  BESTANDSKUNDE: "Bestandskunde",
};

const STAGE_ICONS: Record<PipelineStage, React.ComponentType<{ className?: string }>> = {
  LEAD_LIST: List,
  FOLLOW_UP: PhoneCall,
  STAGE: Star,
  KUNDE: UserCheck,
  BESTANDSKUNDE: Users,
};

interface EmailDetail {
  id: string;
  thread_id: string;
  subject: string;
  from: string;
  from_name: string;
  to: string;
  cc: string[];
  bcc: string[];
  date: string;
  snippet: string;
  body_html: string;
  body_text: string;
  is_read: boolean;
  is_outgoing: boolean;  // true = gesendet, false = erhalten
  has_attachments: boolean;
  attachments: Array<{
    id: string;
    filename: string;
    mime_type: string;
    size: number;
  }>;
  labels: string[];
}

interface Signature {
  id: string;
  name: string;
  content: string;
  isDefault?: boolean;
}

const STAGE_ICON_COLORS: Record<PipelineStage, string> = {
  LEAD_LIST: "text-muted-foreground",
  FOLLOW_UP: "text-blue-500",
  STAGE: "text-sky-400",
  KUNDE: "text-green-500",
  BESTANDSKUNDE: "text-purple-500",
};

export const CustomerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [details, setDetails] = useState<CustomerDetails | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);
  const [previewInvoiceUrl, setPreviewInvoiceUrl] = useState<string | null>(null);
  const [previewInvoiceLoading, setPreviewInvoiceLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newNoteText, setNewNoteText] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    company_name: "",
    salutation: "Herr",
    email: "",
    phone: "",
    website: "",
    street: "",
    house_number: "",
    city: "",
    postal_code: "",
    tax_number: "",
    segment: "" as Segment,
    stage: "" as PipelineStage,
  });
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>("");
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [customerEmails, setCustomerEmails] = useState<EmailDetail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [selectedSignatureId, setSelectedSignatureId] = useState<string>("");
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [newSignature, setNewSignature] = useState({ name: "", content: "" });
  const [composeForm, setComposeForm] = useState({
    to: "",
    subject: "",
    body: "",
    accountId: "",
  });
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const sharedMailboxEmail = "vaillant@team-noah.de";

  const normalizeEmail = (value?: string | null) => (value || "").trim().toLowerCase();

  const getSharedMailboxAccount = (accounts: EmailAccount[]) =>
    accounts.find(account => normalizeEmail(account.email) === sharedMailboxEmail);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showComposeBox, setShowComposeBox] = useState(false);
  const [emailAccounts, setEmailAccounts] = useState<Array<{ id: string; email: string; provider: string; is_primary: boolean }>>([]);
  const canManageInvoices = currentUser?.role === "admin";
  
  useEffect(() => {
    console.log("CustomerDetailPage mounted, ID:", id);
    if (!id) {
      console.error("No customer ID provided!");
      toast.error("Keine Kunden-ID vorhanden");
      return;
    }
    loadData();
    loadSignatures();
    loadEmailAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (details?.customer.email) {
      loadCustomerEmails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details]);

  useEffect(() => {
    return () => {
      if (previewInvoiceUrl) {
        URL.revokeObjectURL(previewInvoiceUrl);
      }
    };
  }, [previewInvoiceUrl]);
  
  const loadData = async () => {
    if (!id) return;
    
    console.log("Loading customer details for ID:", id);
    
    try {
      setLoading(true);
      
      // Load data sequentially to better handle errors
      let detailsData: CustomerDetails | null = null;
      let notesData: Note[] = [];
      let projectsData: Project[] = [];
      let invoicesData: Invoice[] = [];
      
      try {
        detailsData = await customersApi.getCustomerDetails(id);
        console.log("Customer details loaded:", detailsData);
      } catch (error) {
        console.error("Error loading customer details:", error);
        const message = error instanceof Error ? error.message : "Unbekannter Fehler";
        if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
          toast.error("Backend-Server nicht erreichbar. Bitte prüfe, ob der Server läuft.");
        } else {
          toast.error("Fehler beim Laden der Kundendetails: " + message);
        }
        setDetails(null);
        setLoading(false);
        return;
      }
      
      try {
        notesData = await customersApi.getNotes(id);
        console.log("Notes loaded:", notesData);
      } catch (error) {
        console.error("Error loading notes:", error);
        // Notes are optional, continue
      }
      
      try {
        projectsData = await projectsApi.getProjects({ customer_id: id });
        console.log("Projects loaded:", projectsData);
      } catch (error) {
        console.error("Error loading projects:", error);
        // Projects are optional, continue
      }
      
      try {
        invoicesData = await invoicesApi.getInvoices({ customer_id: id });
        console.log("Invoices loaded:", invoicesData);
      } catch (error) {
        console.error("Error loading invoices:", error);
        // Invoices are optional, continue
      }
      
      // Check if there are unsaved changes in localStorage
      if (detailsData) {
        const savedData = localStorage.getItem(`customer_${id}`);
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          console.log('Found unsaved data in localStorage:', parsedData);
          detailsData.customer = { ...detailsData.customer, ...parsedData };
        }
        
        setDetails(detailsData);
      }
      
      setNotes(notesData);
      setProjects(projectsData);
      setInvoices(invoicesData);
    } catch (error: unknown) {
      console.error("Error loading customer details:", error);
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
        toast.error("Backend-Server nicht erreichbar. Bitte prüfe, ob der Server läuft.");
      } else {
        toast.error("Fehler beim Laden: " + message);
      }
      // Fallback: Leere Daten setzen
      setDetails(null);
      setNotes([]);
      setProjects([]);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoicePdfBlob = async (invoice: Invoice) => {
    const token = localStorage.getItem(TOKEN_KEY);
    const response = await fetch(`${API_CONFIG.BASE_URL}/invoices/${invoice.id}/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) {
      throw new Error("Download failed");
    }
    return response.blob();
  };

  const toggleInvoicePreview = async (invoice: Invoice) => {
    if (!invoice.sevdesk_invoice_id) {
      toast.error("Keine Sevdesk-Rechnung verfügbar");
      return;
    }

    if (previewInvoiceId === invoice.id) {
      if (previewInvoiceUrl) {
        URL.revokeObjectURL(previewInvoiceUrl);
      }
      setPreviewInvoiceId(null);
      setPreviewInvoiceUrl(null);
      return;
    }

    setPreviewInvoiceId(invoice.id);
    setPreviewInvoiceLoading(true);

    if (previewInvoiceUrl) {
      URL.revokeObjectURL(previewInvoiceUrl);
      setPreviewInvoiceUrl(null);
    }

    try {
      const blob = await fetchInvoicePdfBlob(invoice);
      const url = window.URL.createObjectURL(blob);
      setPreviewInvoiceUrl(url);
    } catch (error) {
      console.error("Failed to load invoice PDF", error);
      toast.error("Fehler beim Laden des PDFs");
      setPreviewInvoiceId(null);
    } finally {
      setPreviewInvoiceLoading(false);
    }
  };

  const downloadInvoicePdf = async (invoice: Invoice) => {
    if (!invoice.sevdesk_invoice_id) {
      toast.error("Keine Sevdesk-Rechnung verfügbar");
      return;
    }

    try {
      const blob = await fetchInvoicePdfBlob(invoice);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Rechnung-${invoice.invoice_number || invoice.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download invoice PDF", error);
      toast.error("Fehler beim Download");
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    const confirmed = window.confirm("Rechnung wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.");
    if (!confirmed) return;
    try {
      await invoicesApi.deleteInvoice(invoiceId);
      setInvoices(prev => prev.filter(i => i.id !== invoiceId));
      if (previewInvoiceId === invoiceId) {
        setPreviewInvoiceId(null);
        if (previewInvoiceUrl) {
          URL.revokeObjectURL(previewInvoiceUrl);
          setPreviewInvoiceUrl(null);
        }
      }
      toast.success("Rechnung gelöscht");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Löschen fehlgeschlagen: " + message);
    }
  };

  const loadSignatures = () => {
    const saved = localStorage.getItem("email_signatures");
    if (saved) {
      setSignatures(JSON.parse(saved));
    }
  };

  const loadEmailAccounts = async () => {
    try {
      // Use unified email accounts API
      const response = await fetch(`${API_CONFIG.BASE_URL}/email/accounts`, {
        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
      });
      
      if (!response.ok) {
        console.error("Failed to load email accounts");
        return;
      }
      
      const data = await response.json();
      // Filter out accounts without valid email addresses
      const accounts = (data.accounts || [])
        .filter((acc: { email: string | null }) => acc.email && acc.email.trim() !== "")
        .map((acc: { id: string; email: string; provider: string; is_primary: boolean }) => ({
          id: acc.id,
          email: acc.email,
          provider: acc.provider,
          is_primary: acc.is_primary,
        }));
      
      const mailboxAccount = getSharedMailboxAccount(accounts);
      if (!mailboxAccount) {
        setEmailAccounts([]);
        setComposeForm(prev => ({ ...prev, accountId: "" }));
        toast.error(`Kein aktives Konto für ${sharedMailboxEmail} gefunden.`);
        return;
      }

      setEmailAccounts([mailboxAccount]);
      setComposeForm(prev => ({ ...prev, accountId: mailboxAccount.id }));
    } catch (error) {
      console.error("Error loading email accounts:", error);
    }
  };

  const saveSignature = () => {
    if (!newSignature.name.trim() || !newSignature.content.trim()) {
      toast.error("Bitte Name und Signatur ausfüllen");
      return;
    }

    const signature: Signature = {
      id: Date.now().toString(),
      name: newSignature.name,
      content: newSignature.content,
      isDefault: signatures.length === 0,
    };

    const updated = [...signatures, signature];
    setSignatures(updated);
    localStorage.setItem("email_signatures", JSON.stringify(updated));
    
    setNewSignature({ name: "", content: "" });
    setShowSignatureDialog(false);
    toast.success("Signatur gespeichert!");
  };

  const deleteSignature = (id: string) => {
    const updated = signatures.filter(s => s.id !== id);
    setSignatures(updated);
    localStorage.setItem("email_signatures", JSON.stringify(updated));
    toast.success("Signatur gelöscht");
  };

  const setDefaultSignature = (id: string) => {
    const updated = signatures.map(s => ({
      ...s,
      isDefault: s.id === id,
    }));
    setSignatures(updated);
    localStorage.setItem("email_signatures", JSON.stringify(updated));
    toast.success("Standard-Signatur gesetzt");
  };

  const loadCustomerEmails = async () => {
    if (!details?.customer.email) return;
    
    try {
      // Use Microsoft mail endpoint to get customer emails
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/microsoft-mail/customer-emails?email=${encodeURIComponent(details.customer.email)}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
          },
        }
      );
      
      if (!response.ok) {
        // Fallback: If customer-emails endpoint fails, silently handle it
        console.log("Customer emails API not available or no Microsoft account connected");
        setCustomerEmails([]);
        return;
      }
      
      const data = await response.json();
      setCustomerEmails(data.emails || []);
    } catch (error) {
      console.error("Error loading customer emails:", error);
      setCustomerEmails([]);
    }
  };

  const loadEmailDetails = async (emailId: string) => {
    try {
      // Use Microsoft mail endpoint for customer emails
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

  const replyToEmail = () => {
    if (selectedEmail) {
      const quotedText = selectedEmail.body_text.split("\n").join("\n> ");
      const defaultSig = signatures.find(s => s.isDefault);
      const quotedSection = `

---
Am ${new Date(selectedEmail.date).toLocaleString("de-DE")} schrieb ${selectedEmail.from_name}:
> ${quotedText}`;
      
      // Signatur kommt VOR dem zitierten Text
      const replyBody = defaultSig 
        ? `\n\n${defaultSig.content}${quotedSection}`
        : quotedSection;
      
      setComposeForm(prev => ({
        ...prev,
        to: selectedEmail.from,
        subject: selectedEmail.subject.startsWith("Re: ") 
          ? selectedEmail.subject 
          : `Re: ${selectedEmail.subject}`,
        body: replyBody,
      }));
      if (defaultSig) {
        setSelectedSignatureId(defaultSig.id);
      }
      setShowReplyBox(true);
    }
  };

  // R2.x: Open compose email dialog with customer email pre-filled
  const openComposeEmail = () => {
    const defaultSig = signatures.find(s => s.isDefault);
    setComposeForm(prev => ({
      ...prev,
      to: details?.customer.email || "",
      subject: "",
      body: defaultSig ? `\n\n${defaultSig.content}` : "",
    }));
    if (defaultSig) {
      setSelectedSignatureId(defaultSig.id);
    }
    setExpandedEmailId(null);
    setShowReplyBox(false);
    setShowComposeBox(true);
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

  // Attachment handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} ist zu groß (max. 10MB)`);
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
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const downloadEmailAttachment = async (emailId: string, attachmentId: string, filename: string) => {
    try {
      // Customer emails are always from Microsoft accounts
      const endpoint = `${API_CONFIG.BASE_URL}/microsoft-mail/emails/${emailId}/attachments/${attachmentId}`;
      
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Fehler beim Herunterladen");
      }
      
      const data = await response.json();
      
      // Convert base64 to blob and download
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.mime_type });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename || filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`${filename} heruntergeladen`);
    } catch (error) {
      toast.error("Fehler beim Herunterladen des Anhangs");
      console.error("Download error:", error);
    }
  };

  const handleSendEmail = async () => {
    try {
      if (!composeForm.to || !composeForm.subject) {
        toast.error("Bitte fülle Empfänger und Betreff aus");
        return;
      }

      const mailboxAccount = getSharedMailboxAccount(emailAccounts);
      if (!mailboxAccount) {
        toast.error(`Kein aktives Konto für ${sharedMailboxEmail} gefunden.`);
        return;
      }
      const endpoint = "microsoft-mail/send";

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
          account_id: mailboxAccount.id,
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

      const sentFrom = mailboxAccount.email || "unbekannt";
      const attachmentText = attachments.length > 0 ? ` mit ${attachments.length} Anhang/Anhängen` : "";
      toast.success(`E-Mail erfolgreich gesendet von ${sentFrom}${attachmentText}!`);
      setShowReplyBox(false);
      setShowComposeBox(false);
      setAttachments([]);
      setComposeForm({
        to: "",
        subject: "",
        body: "",
        accountId: mailboxAccount.id,
      });
      loadCustomerEmails();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Fehler beim Senden der E-Mail";
      toast.error(message);
      console.error(error);
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
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
  };
  
  const handleCreateNote = async () => {
    if (!id || !newNoteText.trim()) return;
    
    try {
      await customersApi.createNote(id, newNoteText);
      setNewNoteText("");
      toast.success("Notiz erstellt");
      // Reload notes
      const notesData = await customersApi.getNotes(id);
      setNotes(notesData);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler: " + message);
    }
  };
  
  const handleDeleteNote = async (noteId: string) => {
    if (!id) return;
    
    try {
      await customersApi.deleteNote(noteId);
      toast.success("Notiz gelöscht");
      // Reload notes
      const notesData = await customersApi.getNotes(id);
      setNotes(notesData);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler: " + message);
    }
  };
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
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

  const transcribeAudio = async (audioBlob: Blob) => {
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
              onClick: () => transcribeAudio(audioBlob),
            },
          });
        } else {
          toast.error(errorMessage);
        }
        return;
      }

      const data = await response.json();
      setNewNoteText(data.text);
      toast.success("Transkription abgeschlossen");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler bei der Transkription: " + message, {
        action: {
          label: "Erneut versuchen",
          onClick: () => transcribeAudio(audioBlob),
        },
      });
    }
  };
  
  const handleOpenEditDialog = () => {
    if (!details) return;
    
    // Populate form with current customer data
    setEditForm({
      first_name: details.customer.first_name || "",
      last_name: details.customer.last_name || "",
      company_name: details.customer.company_name || "",
      salutation: details.customer.salutation || "Herr",
      email: details.customer.email,
      phone: details.customer.phone || "",
      website: details.customer.website || "",
      street: details.customer.street || "",
      house_number: details.customer.house_number || "",
      city: details.customer.city || "",
      postal_code: details.customer.postal_code || "",
      tax_number: details.customer.tax_number || "",
      segment: details.customer.segment,
      stage: details.customer.stage,
    });
    setEditDialogOpen(true);
  };
  
  const handleSaveCustomer = async () => {
    if (!id) return;
    
    try {
      await customersApi.updateCustomer(id, editForm);
      toast.success("Kundendaten aktualisiert");
      setEditDialogOpen(false);
      loadData(); // Reload all data
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler beim Speichern: " + message);
    }
  };
  
  const handleFieldClick = (fieldName: string, currentValue: string | undefined) => {
    setEditingField(fieldName);
    setTempValue(currentValue || "");
  };
  
  const handleFieldChange = (fieldName: string, value: string) => {
    setTempValue(value);
    
    // Sofort in localStorage speichern
    if (id && details) {
      const customerData = {
        ...details.customer,
        [fieldName]: value,
      };
      localStorage.setItem(`customer_${id}`, JSON.stringify(customerData));
      
      // Lokalen State sofort aktualisieren
      setDetails({
        ...details,
        customer: customerData,
      });
    }
    
    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    // Set new timeout to save to database after 1 second of no typing
    const timeout = setTimeout(async () => {
      if (!id || !details) return;
      
      try {
        const updateData: Record<string, string> = { [fieldName]: value };
        console.log('Updating field in DB:', fieldName, 'with value:', value);
        const response = await customersApi.updateCustomer(id, updateData);
        console.log('DB Update response:', response);
        
        // Nach erfolgreichem DB-Update localStorage aufräumen
        localStorage.removeItem(`customer_${id}`);
        
        toast.success(`${fieldName} gespeichert`, { duration: 1000 });
      } catch (error: unknown) {
        console.error('Error updating field in DB:', error);
        const message = error instanceof Error ? error.message : "Unbekannter Fehler";
        toast.error("Fehler beim Speichern: " + message);
      }
    }, 1000);
    
    setSaveTimeout(timeout);
  };
  
  const handleFieldSave = async (fieldName: string) => {
    if (!id || !details) return;
    
    try {
      const updateData: Record<string, string> = { [fieldName]: tempValue };
      await customersApi.updateCustomer(id, updateData);
      toast.success("Feld aktualisiert");
      setEditingField(null);
      loadData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler: " + message);
    }
  };
  
  const handleFieldCancel = () => {
    setEditingField(null);
    setTempValue("");
  };
  
  const handleDeleteCustomer = async () => {
    if (!id) return;
    
    try {
      await customersApi.deleteCustomer(id);
      toast.success("Kunde erfolgreich gelöscht");
      setDeleteDialogOpen(false);
      navigate("/app/customers");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler beim Löschen: " + message);
    }
  };
  
  const handleFieldKeyDown = (e: React.KeyboardEvent, fieldName: string) => {
    if (e.key === "Escape") {
      handleFieldCancel();
    }
  };
  
  const renderEditableField = (label: string, fieldName: string, value: string | undefined) => {
    const isEditing = editingField === fieldName;
    
    return (
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        {isEditing ? (
          <div className="flex gap-2 mt-1">
            <Input
              value={tempValue}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              onKeyDown={(e) => handleFieldKeyDown(e, fieldName)}
              onBlur={() => setEditingField(null)}
              autoFocus
              className="h-8"
            />
          </div>
        ) : (
          <p 
            className="font-medium cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors"
            onClick={() => handleFieldClick(fieldName, value)}
          >
            {value || "-"}
          </p>
        )}
      </div>
    );
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE");
  };
  
  const getDaysAgoText = (days: number | null | undefined) => {
    if (!days && days !== 0) return "-";
    if (days === 0) return "Heute";
    if (days === 1) return "vor 1 Tag";
    return `vor ${days} Tagen`;
  };
  
  const getActivityBadgeColor = (status: "green" | "yellow" | "red") => {
    switch (status) {
      case "red": return "bg-red-500";
      case "yellow": return "bg-yellow-500";
      default: return "bg-green-500";
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Lade Kundendaten...</p>
      </div>
    );
  }
  
  if (!details) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Kunde nicht gefunden</p>
      </div>
    );
  }
  
  return (
    <TooltipProvider>
    <div className="container mx-auto p-6 space-y-6">
      {/* Header - Name, Firmenname, Phase, Letzte Rechnung, Gesamtumsatz */}
      <div className="bg-muted border rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{details.customer.name}</h1>
              {details.customer.company_name && (
                <p className="text-lg text-muted-foreground">{details.customer.company_name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {details.customer.stage === "BESTANDSKUNDE" && (
              <Badge className={`${getActivityBadgeColor(details.metrics.activity_status)} text-white`}>
                {getDaysAgoText(details.metrics.days_since_activity)}
              </Badge>
            )}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Kunde löschen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Kunde wirklich löschen?</DialogTitle>
                  <DialogDescription>
                    Möchten Sie den Kunden "{details.customer.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                    Abbrechen
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteCustomer}>
                    Endgültig löschen
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <div className="grid grid-cols-5 gap-6 mt-6">
          <div>
            <p className="text-sm text-muted-foreground">Phase</p>
            <Select
              value={details.customer.stage}
              onValueChange={async (value) => {
                if (!id) return;
                try {
                  await customersApi.updateCustomer(id, { stage: value as PipelineStage });
                  toast.success("Phase aktualisiert");
                  loadData();
                } catch (error: unknown) {
                  const message = error instanceof Error ? error.message : "Unbekannter Fehler";
                  toast.error("Fehler: " + message);
                }
              }}
            >
              <SelectTrigger className="h-10 font-medium text-base">
                <SelectValue>
                  {(() => {
                    const Icon = STAGE_ICONS[details.customer.stage];
                    const iconColor = STAGE_ICON_COLORS[details.customer.stage];
                    return (
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${iconColor}`} />
                        <span>{STAGE_LABELS[details.customer.stage]}</span>
                      </div>
                    );
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CUSTOMER_STAGE_LABELS).map(([value, label]) => {
                  const Icon = STAGE_ICONS[value as PipelineStage];
                  const iconColor = STAGE_ICON_COLORS[value as PipelineStage];
                  return (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${iconColor}`} />
                        {label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-sm text-muted-foreground cursor-help">Gesamtumsatz</p>
              </TooltipTrigger>
                  <TooltipContent>
                 <p className="max-w-xs">Summe aller Rechnungen seit Kundenbeginn (unabhängig vom Status)</p>
                  </TooltipContent>
            </Tooltip>
            <p className="font-semibold text-lg">{formatCurrency(details.metrics.total_revenue)}</p>
          </div>
          <div className="space-y-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-sm text-muted-foreground cursor-help">⌀ Monatsumsatz (gesamt)</p>
              </TooltipTrigger>
                  <TooltipContent>
                <p className="max-w-xs">Durchschnittlicher monatlicher Umsatz über die gesamte Kundenzeit (basierend auf Rechnungen)</p>
                  </TooltipContent>
            </Tooltip>
            <p className="font-semibold text-lg">{formatCurrency(details.metrics.average_monthly_revenue || 0)}</p>
          </div>
          <div className="space-y-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-sm text-muted-foreground cursor-help">⌀ Monatsumsatz (2 Mon.)</p>
              </TooltipTrigger>
                  <TooltipContent>
                <p className="max-w-xs">Durchschnittlicher monatlicher Umsatz der letzten 2 Monate (60 Tage, basierend auf Rechnungen)</p>
                  </TooltipContent>
            </Tooltip>
            <p className="font-semibold text-lg">{formatCurrency(details.metrics.average_two_months || 0)}</p>
          </div>
          <div className="space-y-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-sm text-muted-foreground cursor-help">Trend</p>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Vergleich: Durchschnitt letzte 2 Monate vs. Gesamtdurchschnitt
                  <br />
                  <span className="text-green-600">Grün = Wachstum</span> | <span className="text-red-600">Rot = Rückgang</span>
                </p>
              </TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-2">
              {(() => {
                const trend = details.metrics.trend_percent || 0;
                const isPositive = trend >= 0;
                const TrendIcon = isPositive ? TrendingUp : TrendingDown;
                const colorClass = isPositive ? "text-green-600" : "text-red-600";
                const bgClass = isPositive ? "bg-green-50" : "bg-red-50";
                
                return (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded ${bgClass}`}>
                    <TrendIcon className={`h-4 w-4 ${colorClass}`} />
                    <span className={`font-semibold ${colorClass}`}>
                      {isPositive ? '+' : ''}{trend.toFixed(1)}%
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
        
        {/* Letzte Rechnung - Prominente Anzeige */}
        {details.metrics.last_activity && (
          <div className="mt-4 pt-4 border-t flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Letzte Rechnung</p>
              <p className="font-medium">
                {getDaysAgoText(details.metrics.days_since_activity)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content: Links scrollbar, Rechts fixiert */}
      <div className="grid grid-cols-7 gap-6">
        {/* Linke Seite: INFO und INTERESSEN - scrollbar */}
        <div className="col-span-2 space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto pr-4">
          {/* Info Section */}
          <Card>
            <CardHeader>
              <CardTitle>INFO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderEditableField("Vorname", "first_name", details.customer.first_name)}
              {renderEditableField("Nachname", "last_name", details.customer.last_name)}
              {renderEditableField("Anrede", "salutation", details.customer.salutation)}
              {renderEditableField("Firmenname", "company_name", details.customer.company_name)}
              {renderEditableField("E-Mail", "email", details.customer.email)}
              {renderEditableField("Telefon", "phone", details.customer.phone)}
              {renderEditableField("Website", "website", details.customer.website)}
              {renderEditableField("Straße", "street", details.customer.street)}
              {renderEditableField("Hausnummer", "house_number", details.customer.house_number)}
              {renderEditableField("PLZ", "postal_code", details.customer.postal_code)}
              {renderEditableField("Stadt", "city", details.customer.city)}
              {renderEditableField("Steuernummer", "tax_number", details.customer.tax_number)}
              <div>
                <p className="text-sm text-muted-foreground">Segment</p>
                <Select
                  value={details.customer.segment}
                  onValueChange={async (value) => {
                    if (!id) return;
                    try {
                      await customersApi.updateCustomer(id, { segment: value as Segment });
                      toast.success("Segment aktualisiert");
                      loadData();
                    } catch (error: unknown) {
                      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
                      toast.error("Fehler: " + message);
                    }
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SEGMENT_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Erstellt am</p>
                <p className="font-medium">{formatDate(details.customer.created_at)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Interessen Section */}
          <Card>
            <CardHeader>
              <CardTitle>INTERESSEN</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(PRODUCT_LABELS).map(([code, label]) => (
                  <div key={code} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm">{label}</span>
                    <Badge variant="secondary" className="ml-2">
                      {details.product_interests[code as keyof typeof details.product_interests] || 0}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rechte Seite: Fixiertes Menü */}
        <div className="col-span-5">
          <Tabs defaultValue="verlauf" className="w-full">
            <TabsList className="w-full grid grid-cols-5 gap-1">
              <TabsTrigger value="verlauf">Verlauf & E-Mail</TabsTrigger>
              <TabsTrigger value="notizen">Notizen</TabsTrigger>
              <TabsTrigger value="rechnungen">Rechnungen</TabsTrigger>
              <TabsTrigger value="projekte">Projekte</TabsTrigger>
              <TabsTrigger value="emails" className="relative">
                E-Mails
                {customerEmails.filter(e => !e.is_read).length > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white px-1.5 py-0.5 text-xs">
                    {customerEmails.filter(e => !e.is_read).length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Verlauf Tab - Timeline (nur Anzeige) */}
            <TabsContent value="verlauf" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Verlauf & Aktivitäten</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {/* Combine all activities and sort by date */}
                    {[
                      ...notes.map(note => ({ type: 'note', data: note, date: note.created_at })),
                      ...invoices.map(inv => ({ type: 'invoice', data: inv, date: inv.created_at })),
                      ...customerEmails.map(email => ({ type: 'email', data: email, date: email.date })),
                    ]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((activity, index) => (
                        <div key={`${activity.type}-${index}`} className="relative pl-8 pb-4 border-l-2 border-muted last:border-0">
                          {/* Timeline dot */}
                          <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-background border-2 border-emerald-500"></div>
                          
                          {/* Activity content */}
                          <div className="bg-muted/30 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {activity.type === 'note' && (
                                  <>
                                    <MessageSquare className="h-4 w-4 text-blue-500" />
                                    <span className="font-semibold text-sm">Notiz</span>
                                  </>
                                )}
                                {activity.type === 'invoice' && (
                                  <>
                                    <DollarSign className="h-4 w-4 text-green-500" />
                                    <span className="font-semibold text-sm">Rechnung</span>
                                  </>
                                )}
                                {activity.type === 'email' && (
                                  <>
                                    <Mail className="h-4 w-4 text-purple-500" />
                                    <span className="font-semibold text-sm">E-Mail</span>
                                  </>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(activity.date).toLocaleString("de-DE", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            
                            {/* Note */}
                            {activity.type === 'note' && (
                              <p className="text-sm">{(activity.data as Note).text}</p>
                            )}
                            
                            {/* Invoice */}
                            {activity.type === 'invoice' && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">
                                    {formatCurrency((activity.data as Invoice).amount)}
                                  </span>
                                  <Badge variant={(activity.data as Invoice).status === "PAID" ? "default" : "secondary"}>
                                    {(activity.data as Invoice).status}
                                  </Badge>
                                </div>
                              </div>
                            )}
                            
                            {/* Email */}
                            {activity.type === 'email' && (
                              <div className="space-y-1">
                                <p className="text-sm font-medium">{(activity.data as EmailDetail).subject}</p>
                                <p className="text-xs text-muted-foreground">
                                  Von: {(activity.data as EmailDetail).from_name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {(activity.data as EmailDetail).snippet}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    
                    {notes.length === 0 && invoices.length === 0 && customerEmails.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Noch keine Aktivitäten vorhanden
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notizen Tab */}
            <TabsContent value="notizen" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Notizen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
                      💡 <strong>Tipp:</strong> Sie können beim Sprechen Anweisungen geben wie:
                      <ul className="mt-2 ml-4 list-disc">
                        <li>"Verfasse in formeller Sprache: [Ihre Notiz]"</li>
                        <li>"Fasse zusammen: [Ihre Notiz]"</li>
                        <li>Oder einfach nur die Notiz sprechen</li>
                      </ul>
                    </div>
                    
                    {/* Audio-Wellenform-Animation während der Aufnahme */}
                    {isRecording && (
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
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button 
                        onClick={isRecording ? stopRecording : startRecording}
                        variant={isRecording ? "destructive" : "outline"}
                        size="sm"
                        className="flex-shrink-0"
                      >
                        {isRecording ? (
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
                      <Button onClick={handleCreateNote} disabled={!newNoteText.trim()} size="sm" className="flex-1">
                        <Plus className="h-4 w-4 mr-2" />
                        Notiz hinzufügen
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {notes.map((note) => (
                      <div key={note.id} className="p-3 border rounded-lg bg-muted/20">
                        <div className="flex items-start justify-between">
                          <p className="text-sm flex-1">{note.text}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 ml-2"
                            onClick={() => handleDeleteNote(note.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDate(note.created_at)}
                        </p>
                      </div>
                    ))}
                    {notes.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">Keine Notizen vorhanden</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Angebote & Rechnungen Tab */}
            <TabsContent value="rechnungen" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Rechnungen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[500px] overflow-y-auto">
                    {invoices.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nr.</TableHead>
                            <TableHead>Betrag</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Datum</TableHead>
                            <TableHead className="text-right">Rechnung</TableHead>
                            {canManageInvoices && (
                              <TableHead className="text-right">Aktionen</TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoices.map((invoice) => (
                            <Fragment key={invoice.id}>
                              <TableRow>
                                <TableCell className="font-mono text-sm">
                                  {invoice.invoice_number || "-"}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {formatCurrency(invoice.amount)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={invoice.status === "PAID" ? "default" : "secondary"}>
                                    {invoice.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {formatDate(invoice.created_at)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {invoice.sevdesk_invoice_id ? (
                                    <div className="flex items-center justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleInvoicePreview(invoice)}
                                      >
                                        <FileText className="h-4 w-4 mr-1" />
                                        {previewInvoiceId === invoice.id ? "Schliessen" : "Ansehen"}
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => downloadInvoicePdf(invoice)}
                                      >
                                        <Download className="h-4 w-4 mr-1" />
                                        Download
                                      </Button>
                                      {invoice.sevdesk_invoice_url && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => window.open(invoice.sevdesk_invoice_url, "_blank")}
                                        >
                                          <ExternalLink className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  )}
                                </TableCell>
                                {canManageInvoices && (
                                  <TableCell className="text-right">
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      title="Rechnung löschen"
                                      onClick={() => handleDeleteInvoice(invoice.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                )}
                              </TableRow>
                              {previewInvoiceId === invoice.id && (
                                <TableRow>
                                  <TableCell colSpan={canManageInvoices ? 6 : 5} className="bg-muted/20">
                                    {previewInvoiceLoading ? (
                                      <div className="flex items-center justify-center py-10 text-muted-foreground">
                                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                        PDF wird geladen...
                                      </div>
                                    ) : previewInvoiceUrl ? (
                                      <div className="w-full h-[70vh]">
                                        <iframe
                                          title={`Rechnung ${invoice.invoice_number || invoice.id}`}
                                          src={previewInvoiceUrl}
                                          className="w-full h-full rounded-md border"
                                        />
                                      </div>
                                    ) : (
                                      <div className="text-sm text-muted-foreground py-6 text-center">
                                        PDF nicht verfuegbar
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              )}
                            </Fragment>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Keine Rechnungen vorhanden
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Projekte Tab */}
            <TabsContent value="projekte" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Projekte</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[500px] overflow-y-auto">
                    {projects.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produkt</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {projects.map((project) => (
                            <TableRow key={project.id}>
                              <TableCell className="font-medium">
                                {project.product_name}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{project.status}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Keine Projekte vorhanden
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* E-Mails Tab - Liste mit expandierbaren Emails */}
            <TabsContent value="emails" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">E-Mails von {details.customer.name}</CardTitle>
                    {details.customer.email && (
                      <p className="text-sm text-muted-foreground mt-1">{details.customer.email}</p>
                    )}
                  </div>
                  <Button 
                    onClick={openComposeEmail} 
                    className="gap-2"
                    disabled={!details.customer.email}
                  >
                    <Mail className="h-4 w-4" />
                    E-Mail schreiben
                  </Button>
                </CardHeader>
                <CardContent>
                  {/* Compose Box - R2.x: E-Mail schreiben ohne vorhandenen Verlauf */}
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
                            <Button onClick={() => setShowSignatureDialog(true)} variant="outline" size="sm">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button onClick={() => setShowComposeBox(false)} variant="outline" size="sm" className="flex-1">
                            Abbrechen
                          </Button>
                          <Button onClick={handleSendEmail} size="sm" className="flex-1 bg-emerald-500 hover:bg-emerald-600">
                            <Mail className="h-4 w-4 mr-2" />
                            Senden
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {customerEmails.length > 0 ? (
                      customerEmails.map((email) => (
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
                              {email.is_outgoing ? `An: ${email.to}` : `Von: ${email.from_name}`}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mt-1">{email.snippet}</p>
                          </div>

                          {/* Expanded Email Content */}
                          {expandedEmailId === email.id && selectedEmail && (
                            <div className="px-4 pb-4 space-y-4 border-t bg-muted/20">
                              {/* Email Body */}
                              <div className="pt-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                                    {selectedEmail.from_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{selectedEmail.from_name}</p>
                                    <p className="text-xs text-muted-foreground">{selectedEmail.from}</p>
                                  </div>
                                </div>
                                {/* E-Mail Body - isolated in iframe to prevent CSS leakage */}
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

                                {/* Anhänge der E-Mail */}
                                {selectedEmail.has_attachments && selectedEmail.attachments.length > 0 && (
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
                                      Abbrechen
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
                                    <Label className="text-xs">Nachricht (mit Formatierung)</Label>
                                    <RichTextEditor
                                      content={composeForm.body}
                                      onChange={(html) => setComposeForm(prev => ({ ...prev, body: html }))}
                                      placeholder="Deine Nachricht..."
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
                                      <Button onClick={() => setShowSignatureDialog(true)} variant="outline" size="sm">
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="flex gap-2">
                                    <Button onClick={() => setShowReplyBox(false)} variant="outline" size="sm" className="flex-1">
                                      Abbrechen
                                    </Button>
                                    <Button onClick={handleSendEmail} size="sm" className="flex-1 bg-emerald-500 hover:bg-emerald-600">
                                      <Mail className="h-4 w-4 mr-2" />
                                      Senden
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Keine E-Mails mit diesem Kunden gefunden
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Signature Management Dialog */}
      <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Signaturen verwalten</DialogTitle>
            <DialogDescription>
              Erstelle formatierte Signaturen mit Bildern, Links und Textformatierung.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Add New Signature */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted">
              <h3 className="font-semibold">Neue Signatur erstellen</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={newSignature.name}
                    onChange={(e) => setNewSignature({ ...newSignature, name: e.target.value })}
                    placeholder="z.B. Geschäftlich, Privat, Support..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Signatur * (mit Formatierung und Bildern)</Label>
                  <RichTextEditor
                    content={newSignature.content}
                    onChange={(html) => setNewSignature({ ...newSignature, content: html })}
                    placeholder="Mit freundlichen Grüßen,&#10;Max Mustermann&#10;Telefon: +49 123 456789"
                  />
                </div>
                <Button onClick={saveSignature} className="w-full bg-emerald-500 hover:bg-emerald-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Signatur speichern
                </Button>
              </div>
            </div>
            
            {/* Existing Signatures */}
            <div className="space-y-3">
              <h3 className="font-semibold">Gespeicherte Signaturen</h3>
              {signatures.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Noch keine Signaturen vorhanden</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {signatures.map((sig) => (
                    <div key={sig.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1">
                          <Button 
                            onClick={() => setDefaultSignature(sig.id)} 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            title={sig.isDefault ? "Standard-Signatur" : "Als Standard setzen"}
                          >
                            <Star className={`h-4 w-4 ${sig.isDefault ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                          </Button>
                          <p className="font-medium">{sig.name}</p>
                          {sig.isDefault && (
                            <Badge variant="secondary" className="text-xs">Standard</Badge>
                          )}
                        </div>
                        <Button onClick={() => deleteSignature(sig.id)} variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      {/* Render HTML signature preview */}
                      <div 
                        className="text-sm text-muted-foreground prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: sig.content }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end pt-4">
              <Button onClick={() => setShowSignatureDialog(false)} variant="outline">
                Schließen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
};
