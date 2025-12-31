import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { projectsApi, customersApi, qcApi } from "@/lib/apiClient";
import type { ProjectUpdateRequest } from "@/lib/apiClient";
import { Project, Customer, ProjectStatus, User } from "@/types";
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
import { ArrowLeft, Save, Upload, FileText, Trash2, AlertTriangle, Mic, MicOff, Plus, CheckCircle2, XCircle, Mail, Send, Paperclip } from "lucide-react";
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
  is_outgoing: boolean;
  attachments?: Array<{ filename: string; size: number }>;
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
  PROBLEM: "Problem",
};

const STATUS_COLORS: Record<ProjectStatus, string> = {
  NEU: "bg-gray-500",
  IN_BEARBEITUNG: "bg-blue-500",
  REVISION: "bg-yellow-500",
  FERTIGGESTELLT: "bg-green-500",
  PROBLEM: "bg-red-500",
};

export const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Editable fields
  const [projectNumber, setProjectNumber] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("IN_BEARBEITUNG");
  const [credits, setCredits] = useState("");
  const [content, setContent] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [deadline, setDeadline] = useState<string>(""); // Frist/Deadline
  const [additionalEmail, setAdditionalEmail] = useState<string>(""); // Optional: Additional project-specific email
  
  // Notes lists and input
  const [customerNotesList, setCustomerNotesList] = useState<Array<{id: string; text: string; created_at: string}>>([]);
  const [internalNotesList, setInternalNotesList] = useState<Array<{id: string; text: string; created_at: string}>>([]);
  const [newCustomerNote, setNewCustomerNote] = useState("");
  const [newInternalNote, setNewInternalNote] = useState("");
  
  // Output files (separate from input files)
  const [outputFiles, setOutputFiles] = useState<Array<{id: string; filename: string; size: number; uploaded_at: string}>>([]);
  const [outputConfirmed, setOutputConfirmed] = useState(false);
  
  // Determine if credits can be manually edited based on product
  const [allowCustomCredits, setAllowCustomCredits] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [activeNoteField, setActiveNoteField] = useState<'customer' | 'internal' | null>(null);
  
  // File category filter
  const [fileCategory, setFileCategory] = useState<'all' | 'customer' | 'creation' | 'detail'>('all');

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ProjectStatus | null>(null);
  const [checklistConfirmed, setChecklistConfirmed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Email communication state
  const [customerEmails, setCustomerEmails] = useState<EmailMessage[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [composeForm, setComposeForm] = useState({ to: "", subject: "", body: "" });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [selectedSignatureId, setSelectedSignatureId] = useState("");

  useEffect(() => {
    if (!id) return;
    loadProject();
    
    // Load signatures from localStorage
    const savedSignatures = localStorage.getItem("email_signatures");
    if (savedSignatures) {
      setSignatures(JSON.parse(savedSignatures));
    }
  }, [id]);
  
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
  }, [status, credits, content, customerNotes, internalNotes, deadline, additionalEmail, outputFiles]);

  const loadProject = async () => {
    if (!id) return;
    
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
      setCustomerNotes(projectData.customer_notes || "");
      setInternalNotes(projectData.internal_notes || "");
      setDeadline(projectData.deadline || "");
      setAdditionalEmail(projectData.additional_email || "");
      
      // Check if product allows custom credits
      const creditsAllowedProducts = ["HEIZLAST", "HEIZLAST_HYDRAULISCH", "ISFP_ERSTELLUNG", "INDIVIDUELL"];
      setAllowCustomCredits(creditsAllowedProducts.includes(projectData.product_code));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler beim Laden: " + message);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerEmails = async (emails: string[]) => {
    try {
      setLoadingEmails(true);
      
      // Load emails from all provided addresses
      const allEmails: EmailMessage[] = [];
      
      for (const email of emails) {
        if (!email) continue;
        
        const response = await fetch(`${API_CONFIG.BASE_URL}/gmail/customer-emails?email=${encodeURIComponent(email)}`, {
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

  const openComposeEmailDialog = () => {
    if (!customer) return;
    
    const defaultSig = signatures.find(s => s.isDefault);
    const projectRef = projectNumber ? `[Projekt ${projectNumber}] ` : "";
    
    setComposeForm({
      to: customer.email || "",
      subject: `${projectRef}${project?.product_name || ""}`,
      body: defaultSig ? `\n\n${defaultSig.content}` : "",
    });
    if (defaultSig) {
      setSelectedSignatureId(defaultSig.id);
    }
    setShowComposeDialog(true);
  };

  const handleSendEmail = async () => {
    if (!composeForm.to || !composeForm.subject) {
      toast.error("Bitte Empfänger und Betreff ausfüllen");
      return;
    }
    
    try {
      setSendingEmail(true);
      const response = await fetch(`${API_CONFIG.BASE_URL}/gmail/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
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
      
      toast.success("E-Mail gesendet!");
      setShowComposeDialog(false);
      setComposeForm({ to: "", subject: "", body: "" });
      
      // Reload emails to show the sent one
      const emailsToLoad = [customer?.email, additionalEmail].filter(Boolean) as string[];
      if (emailsToLoad.length > 0) {
        loadCustomerEmails(emailsToLoad);
      }
    } catch (error) {
      toast.error("Fehler beim Senden der E-Mail");
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
      const hasOutputFiles = outputFiles && outputFiles.length > 0;
      
      if (!hasOutputFiles) {
        toast.error("Es muss mindestens eine Datei im Output-Bereich hochgeladen werden, bevor das Projekt als 'Fertiggestellt' markiert werden kann.");
        return;
      }
      
      // Prüfe ob Output-Checkbox aktiviert ist
      if (!outputConfirmed) {
        toast.error("Bitte bestätigen Sie im Output-Bereich, dass alle Punkte der Checkliste erfüllt wurden.");
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
      const updateData: ProjectUpdateRequest = {
        status,
        credits: allowCustomCredits ? credits : undefined,
        content,
        customer_notes: customerNotes,
        internal_notes: internalNotes,
        deadline: deadline || undefined,
        additional_email: additionalEmail || undefined,
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
      const updateData: ProjectUpdateRequest = {
        status,
        credits: allowCustomCredits ? credits : undefined,
        content,
        customer_notes: customerNotes,
        internal_notes: internalNotes,
        deadline: deadline || undefined,
        additional_email: additionalEmail || undefined,
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

  const handleAddCustomerNote = () => {
    if (!newCustomerNote.trim()) return;
    
    const newNote = {
      id: crypto.randomUUID(),
      text: newCustomerNote,
      created_at: new Date().toISOString(),
    };
    
    setCustomerNotesList(prev => [newNote, ...prev]);
    setNewCustomerNote("");
    toast.success("Kundennotiz hinzugefügt");
  };

  const handleAddInternalNote = () => {
    if (!newInternalNote.trim()) return;
    
    const newNote = {
      id: crypto.randomUUID(),
      text: newInternalNote,
      created_at: new Date().toISOString(),
    };
    
    setInternalNotesList(prev => [newNote, ...prev]);
    setNewInternalNote("");
    toast.success("Interne Notiz hinzugefügt");
  };

  const handleDeleteCustomerNote = (id: string) => {
    setCustomerNotesList(prev => prev.filter(note => note.id !== id));
    toast.success("Notiz gelöscht");
  };

  const handleDeleteInternalNote = (id: string) => {
    setInternalNotesList(prev => prev.filter(note => note.id !== id));
    toast.success("Notiz gelöscht");
  };

  const handleApprove = async () => {
    if (!id) return;
    
    try {
      await qcApi.approveProject(id);
      toast.success("Projekt freigegeben und ins Archiv verschoben!");
      loadProject(); // Projekt neu laden, um aktualisierte Daten zu erhalten
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler: " + message);
    }
  };

  const handleReject = async () => {
    if (!id) return;
    
    try {
      await qcApi.rejectProject(id);
      toast.info("Projekt zurück in Revision geschickt");
      loadProject(); // Projekt neu laden, um aktualisierte Daten zu erhalten
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler: " + message);
    }
  };

  const formatNoteDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const handleOutputFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const newFiles = filesArray.map(file => ({
        id: crypto.randomUUID(),
        filename: file.name,
        size: file.size,
        uploaded_at: new Date().toISOString(),
      }));
      setOutputFiles(prev => [...prev, ...newFiles]);
      toast.success(`${filesArray.length} Datei(en) hochgeladen`);
    }
  };

  const handleDeleteOutputFile = (id: string) => {
    setOutputFiles(prev => prev.filter(file => file.id !== id));
    toast.success("Datei gelöscht");
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

  const getFilteredFiles = () => {
    if (!project.files) return [];
    
    if (fileCategory === 'all') return project.files;
    
    return project.files.filter(file => {
      // files haben ein 'source' Feld
      // 'customer' = vom Kunden hochgeladen
      // 'creation' = bei Projekterstellung hochgeladen
      // 'detail' = in Großansicht hochgeladen
      return file.source === fileCategory;
    });
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
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Freigeben
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  size="sm"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Revision
                </Button>
              </>
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
                        <Button variant="outline" className="w-full">
                          <Upload className="h-4 w-4 mr-2" />
                          Dateien hochladen (Input)
                        </Button>
                        
                        {getFilteredFiles().length > 0 ? (
                          <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
                            {getFilteredFiles().map((file) => (
                              <div key={file.id} className="flex items-center justify-between p-2 border rounded">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  <div className="flex flex-col">
                                    <span className="text-sm">{file.filename}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {(file.size / 1024).toFixed(1)} KB
                                    </span>
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={10}
                        placeholder="Ausgabe, Ergebnisse, Berichte..."
                      />
                    </div>
                    
                    <div>
                      <Label>Dateien (Output)</Label>
                      <div className="border rounded-lg p-4">
                        <label htmlFor="output-file-upload" className="cursor-pointer">
                          <Button variant="outline" className="w-full" type="button" onClick={() => document.getElementById('output-file-upload')?.click()}>
                            <Upload className="h-4 w-4 mr-2" />
                            Dateien hochladen (Output)
                          </Button>
                        </label>
                        <input
                          id="output-file-upload"
                          type="file"
                          multiple
                          className="hidden"
                          onChange={handleOutputFileUpload}
                        />
                        
                        {outputFiles.length > 0 ? (
                          <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
                            {outputFiles.map((file) => (
                              <div key={file.id} className="flex items-center justify-between p-2 border rounded bg-green-50">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-green-600" />
                                  <div className="flex flex-col">
                                    <span className="text-sm">{file.filename}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {(file.size / 1024).toFixed(1)} KB
                                    </span>
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteOutputFile(file.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
                    
                    <div className="border rounded-lg p-4 bg-card">
                      <div className="flex items-start gap-3">
                        <Checkbox 
                          id="output-confirm"
                          checked={outputConfirmed}
                          onCheckedChange={(checked) => setOutputConfirmed(checked === true)}
                          className="mt-1"
                        />
                        <label 
                          htmlFor="output-confirm" 
                          className="text-sm font-medium leading-relaxed cursor-pointer"
                        >
                          Ich bestätige, dass ich mit unserer Checkliste das Projekt gegengecheckt habe und jeder einzelne Punkt erfüllt wurde.
                        </label>
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
                    <Send className="h-4 w-4" />
                    E-Mail verfassen
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
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
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {customerEmails.map((email) => (
                        <div 
                          key={email.id} 
                          className={`p-4 border rounded-lg ${
                            email.is_outgoing 
                              ? 'bg-blue-50/50 border-blue-200 ml-8' 
                              : 'bg-muted/20 mr-8'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                                email.is_outgoing ? 'bg-blue-500 text-white' : 'bg-gray-200'
                              }`}>
                                {email.is_outgoing ? 'ICH' : email.from_name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {email.is_outgoing ? 'An: ' + email.to : email.from_name || email.from}
                                </p>
                                <p className="text-xs text-muted-foreground">{formatEmailDate(email.date)}</p>
                              </div>
                            </div>
                            {email.attachments && email.attachments.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Paperclip className="h-3 w-3" />
                                {email.attachments.length}
                              </div>
                            )}
                          </div>
                          <p className="text-sm font-medium mb-1">{email.subject}</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                            {email.body_text?.substring(0, 300)}
                            {email.body_text && email.body_text.length > 300 && '...'}
                          </p>
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
                <span>Mindestens eine Output-Datei wurde im grünen Bereich hochgeladen ({outputFiles.length} {outputFiles.length === 1 ? 'Datei' : 'Dateien'})</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="text-green-500">✓</span>
                <span>Checkliste im Output-Bereich wurde bestätigt</span>
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

      {/* Email Compose Dialog */}
      <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              E-Mail verfassen
            </DialogTitle>
            {projectNumber && (
              <DialogDescription>
                Projekt: {projectNumber} - {project?.product_name}
              </DialogDescription>
            )}
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>An</Label>
              {/* Show dropdown if multiple email addresses available */}
              {(customer?.email && additionalEmail) ? (
                <Select 
                  value={composeForm.to} 
                  onValueChange={(value) => setComposeForm({...composeForm, to: value})}
                >
                  <SelectTrigger>
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
                  onChange={(e) => setComposeForm({...composeForm, to: e.target.value})}
                  placeholder="empfaenger@example.com"
                />
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Betreff</Label>
              <Input 
                value={composeForm.subject}
                onChange={(e) => setComposeForm({...composeForm, subject: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Nachricht</Label>
              <Textarea 
                value={composeForm.body}
                onChange={(e) => setComposeForm({...composeForm, body: e.target.value})}
                rows={10}
                placeholder="Ihre Nachricht..."
              />
            </div>
            
            {signatures.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Signatur</Label>
                <div className="flex gap-2">
                  <Select value={selectedSignatureId} onValueChange={setSelectedSignatureId}>
                    <SelectTrigger className="flex-1">
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
            )}
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowComposeDialog(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleSendEmail}
              disabled={sendingEmail || !composeForm.to || !composeForm.subject}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {sendingEmail ? 'Wird gesendet...' : 'Senden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
