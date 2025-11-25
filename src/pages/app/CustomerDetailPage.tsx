import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { customersApi, projectsApi, invoicesApi } from "@/lib/apiClient";
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
import { ArrowLeft, Plus, Trash2, Edit, List, PhoneCall, Target, Star, UserCheck, Users, Mic, MicOff, Activity, TrendingUp, TrendingDown, Clock, Mail, Reply, FileText, DollarSign, MessageSquare, X } from "lucide-react";

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
  PRE_STAGE: "Pre Stage",
  STAGE: "Stage",
  KUNDE: "Kunde",
  BESTANDSKUNDE: "Bestandskunde",
};

// Stages für Kunden (ohne LEAD_LIST)
const CUSTOMER_STAGE_LABELS: Partial<Record<PipelineStage, string>> = {
  FOLLOW_UP: "Follow Up",
  PRE_STAGE: "Pre Stage",
  STAGE: "Stage",
  KUNDE: "Kunde",
  BESTANDSKUNDE: "Bestandskunde",
};

const STAGE_ICONS: Record<PipelineStage, React.ComponentType<{ className?: string }>> = {
  LEAD_LIST: List,
  FOLLOW_UP: PhoneCall,
  PRE_STAGE: Target,
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
  LEAD_LIST: "text-gray-500",
  FOLLOW_UP: "text-blue-500",
  PRE_STAGE: "text-yellow-500",
  STAGE: "text-sky-400",
  KUNDE: "text-green-500",
  BESTANDSKUNDE: "text-purple-500",
};

export const CustomerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [details, setDetails] = useState<CustomerDetails | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNoteText, setNewNoteText] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    company_name: "",
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
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  useEffect(() => {
    console.log("CustomerDetailPage mounted, ID:", id);
    if (!id) {
      console.error("No customer ID provided!");
      toast.error("Keine Kunden-ID vorhanden");
      return;
    }
    loadData();
    loadSignatures();
  }, [id]);

  useEffect(() => {
    if (details?.customer.email) {
      loadCustomerEmails();
    }
  }, [details]);
  
  const loadData = async () => {
    if (!id) return;
    
    console.log("Loading customer details for ID:", id);
    
    try {
      setLoading(true);
      
      // Timeout für API-Aufrufe
      const timeout = (ms: number) => new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), ms)
      );
      
      const [detailsData, notesData, projectsData, invoicesData] = await Promise.race([
        Promise.all([
          customersApi.getCustomerDetails(id),
          customersApi.getNotes(id),
          projectsApi.getProjects({ customer_id: id }),
          invoicesApi.getInvoices({ customer_id: id }),
        ]),
        timeout(10000) // 10 Sekunden Timeout
      ]) as [CustomerDetails, Note[], Project[], Invoice[]];
      
      console.log("Customer details loaded:", detailsData);
      console.log("Notes loaded:", notesData);
      console.log("Projects loaded:", projectsData);
      console.log("Invoices loaded:", invoicesData);
      
      // Check if there are unsaved changes in localStorage
      const savedData = localStorage.getItem(`customer_${id}`);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        console.log('Found unsaved data in localStorage:', parsedData);
        detailsData.customer = { ...detailsData.customer, ...parsedData };
      }
      
      setDetails(detailsData);
      setNotes(notesData);
      setProjects(projectsData);
      setInvoices(invoicesData);
    } catch (error: unknown) {
      console.error("Error loading customer details:", error);
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler beim Laden: " + message);
      // Fallback: Leere Daten setzen
      setDetails(null);
      setNotes([]);
      setProjects([]);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSignatures = () => {
    const saved = localStorage.getItem("email_signatures");
    if (saved) {
      setSignatures(JSON.parse(saved));
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
      const response = await fetch("http://127.0.0.1:8080/api/gmail/emails", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("jeremia_token")}`,
        },
      });
      
      if (!response.ok) return;
      
      const data = await response.json();
      // Filter emails by customer email
      const filtered = data.emails.filter((email: EmailDetail) => 
        email.from === details.customer.email || email.to === details.customer.email
      );
      setCustomerEmails(filtered);
    } catch (error) {
      console.error("Error loading customer emails:", error);
    }
  };

  const loadEmailDetails = async (emailId: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:8080/api/gmail/emails/${emailId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("jeremia_token")}`,
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
      const replyBody = `

---
Am ${new Date(selectedEmail.date).toLocaleString("de-DE")} schrieb ${selectedEmail.from_name}:
> ${quotedText}`;
      
      setComposeForm({
        to: selectedEmail.from,
        subject: selectedEmail.subject.startsWith("Re: ") 
          ? selectedEmail.subject 
          : `Re: ${selectedEmail.subject}`,
        body: defaultSig ? replyBody + "\n\n" + defaultSig.content : replyBody,
      });
      if (defaultSig) {
        setSelectedSignatureId(defaultSig.id);
      }
      setShowReplyBox(true);
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

  const handleSendEmail = async () => {
    try {
      if (!composeForm.to || !composeForm.subject) {
        toast.error("Bitte fülle Empfänger und Betreff aus");
        return;
      }

      const response = await fetch("http://127.0.0.1:8080/api/gmail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("jeremia_token")}`,
        },
        body: JSON.stringify({
          to: composeForm.to,
          subject: composeForm.subject,
          body: composeForm.body,
        }),
      });

      if (!response.ok) {
        throw new Error("Fehler beim Senden");
      }

      toast.success("E-Mail erfolgreich gesendet!");
      setShowReplyBox(false);
      setComposeForm({
        to: "",
        subject: "",
        body: "",
      });
      loadCustomerEmails();
    } catch (error) {
      toast.error("Fehler beim Senden der E-Mail");
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

      const response = await fetch('http://localhost:8080/api/transcribe-note', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transkription fehlgeschlagen');
      }

      const data = await response.json();
      setNewNoteText(data.text);
      toast.success("Transkription abgeschlossen");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler bei der Transkription: " + message);
    }
  };
  
  const handleOpenEditDialog = () => {
    if (!details) return;
    
    // Populate form with current customer data
    setEditForm({
      first_name: details.customer.first_name || "",
      last_name: details.customer.last_name || "",
      company_name: details.customer.company_name || "",
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
                <p className="max-w-xs">Summe aller bezahlten Rechnungen seit Kundenbeginn</p>
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
                <p className="max-w-xs">Durchschnittlicher monatlicher Umsatz über die gesamte Kundenzeit</p>
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
                <p className="max-w-xs">Durchschnittlicher monatlicher Umsatz der letzten 2 Monate (60 Tage)</p>
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
                            <TableHead>Betrag</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Datum</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoices.map((invoice) => (
                            <TableRow key={invoice.id}>
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
                            </TableRow>
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
                <CardHeader>
                  <CardTitle className="text-lg">E-Mails von {details.customer.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {customerEmails.length > 0 ? (
                      customerEmails.map((email) => (
                        <div 
                          key={email.id} 
                          className={`border rounded-lg ${
                            !email.is_read ? 'bg-blue-50 border-blue-300' : ''
                          }`}
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
                                <Mail className={`h-4 w-4 ${
                                  !email.is_read ? 'text-blue-600' : 'text-purple-500'
                                }`} />
                                <p className={`font-medium text-sm ${
                                  !email.is_read ? 'font-bold' : ''
                                }`}>
                                  {email.subject}
                                </p>
                                {!email.is_read && (
                                  <Badge variant="default" className="bg-blue-500 text-white text-xs px-2 py-0">
                                    Neu
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatEmailDate(email.date)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">Von: {email.from_name}</p>
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
                                <div
                                  className="prose prose-sm max-w-none"
                                  dangerouslySetInnerHTML={{ __html: selectedEmail.body_html || selectedEmail.body_text }}
                                />
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
                                    <textarea
                                      className="w-full min-h-[200px] p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                      value={composeForm.body}
                                      onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })}
                                      placeholder="Deine Nachricht..."
                                    />
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Signaturen verwalten</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Add New Signature */}
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
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
                  <Label>Signatur *</Label>
                  <textarea
                    value={newSignature.content}
                    onChange={(e) => setNewSignature({ ...newSignature, content: e.target.value })}
                    placeholder="Mit freundlichen Grüßen,\nMax Mustermann\nTelefon: +49 123 456789"
                    className="w-full min-h-[120px] p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                <p className="text-sm text-gray-500 text-center py-8">Noch keine Signaturen vorhanden</p>
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
                            <Star className={`h-4 w-4 ${sig.isDefault ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
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
                      <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans">{sig.content}</pre>
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
