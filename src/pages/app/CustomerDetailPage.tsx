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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Edit, List, PhoneCall, Target, Star, UserCheck, Users, Mic, MicOff, Activity } from "lucide-react";

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
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  
  useEffect(() => {
    console.log("CustomerDetailPage mounted, ID:", id);
    if (!id) {
      console.error("No customer ID provided!");
      toast.error("Keine Kunden-ID vorhanden");
      return;
    }
    loadData();
  }, [id]);
  
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
      ]) as [any, any, any, any];
      
      console.log("Customer details loaded:", detailsData);
      console.log("Notes loaded:", notesData);
      console.log("Projects loaded:", projectsData);
      console.log("Invoices loaded:", invoicesData);
      
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
  
  const handleFieldSave = async (fieldName: string) => {
    if (!id || !details) return;
    
    try {
      const updateData: any = { [fieldName]: tempValue };
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
  
  const handleFieldKeyDown = (e: React.KeyboardEvent, fieldName: string) => {
    if (e.key === "Enter") {
      handleFieldSave(fieldName);
    } else if (e.key === "Escape") {
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
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={(e) => handleFieldKeyDown(e, fieldName)}
              onBlur={() => handleFieldSave(fieldName)}
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
          {details.customer.stage === "BESTANDSKUNDE" && (
            <Badge className={`${getActivityBadgeColor(details.metrics.activity_status)} text-white`}>
              {getDaysAgoText(details.metrics.days_since_activity)}
            </Badge>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-6 mt-6">
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
          <div>
            <p className="text-sm text-muted-foreground">Letzte Rechnung</p>
            <p className="font-medium text-base">
              {details.metrics.last_activity 
                ? getDaysAgoText(details.metrics.days_since_activity)
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Gesamtumsatz</p>
            <p className="font-medium text-base">{formatCurrency(details.metrics.total_revenue)}</p>
          </div>
        </div>
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
          <Tabs defaultValue="notizen" className="w-full">
            <TabsList className="w-full grid grid-cols-4 gap-1">
              <TabsTrigger value="notizen">Notizen</TabsTrigger>
              <TabsTrigger value="rechnungen">Rechnungen</TabsTrigger>
              <TabsTrigger value="projekte">Projekte</TabsTrigger>
              <TabsTrigger value="emails">E-Mails</TabsTrigger>
            </TabsList>

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

            {/* E-Mails Tab */}
            <TabsContent value="emails" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">E-Mails</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center py-8">
                    E-Mail-Funktion kommt später
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
