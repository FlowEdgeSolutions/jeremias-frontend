import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { projectsApi, customersApi } from "@/lib/apiClient";
import { Project, Customer, ProjectStatus, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Save, Upload, FileText, Trash2 } from "lucide-react";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  IN_BEARBEITUNG: "In Bearbeitung",
  REVISION: "Revision",
  FERTIGGESTELLT: "Fertiggestellt",
  PROBLEM: "Problem",
};

const STATUS_COLORS: Record<ProjectStatus, string> = {
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
  const [creditFactor, setCreditFactor] = useState("1");
  const [content, setContent] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  useEffect(() => {
    if (!id) return;
    loadProject();
  }, [id]);

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
      setCreditFactor(projectData.credit_factor || "1");
      setContent(projectData.content || "");
      setCustomerNotes(projectData.customer_notes || "");
      setInternalNotes(projectData.internal_notes || "");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler beim Laden: " + message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    
    try {
      await projectsApi.updateProject(id, {
        project_number: projectNumber,
        status,
        credits,
        credit_factor: creditFactor,
        content,
        customer_notes: customerNotes,
        internal_notes: internalNotes,
      });
      toast.success("Projekt gespeichert");
      loadProject();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler beim Speichern: " + message);
    }
  };

  const calculateCredits = () => {
    if (!customer?.total_revenue || !creditFactor) return;
    
    const revenue = parseFloat(customer.total_revenue.toString());
    const factor = parseFloat(creditFactor);
    
    if (isNaN(revenue) || isNaN(factor)) {
      toast.error("Ungültige Zahlen für Berechnung");
      return;
    }
    
    const result = (revenue / 30) * factor;
    setCredits(result.toFixed(2));
    toast.success(`Credits berechnet: ${result.toFixed(2)}`);
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
            <div>
              <h1 className="text-3xl font-bold">{project.product_name}</h1>
              <p className="text-lg text-muted-foreground">{projectNumber || "Keine Projektnummer"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${STATUS_COLORS[status]} text-white`}>
              {STATUS_LABELS[status]}
            </Badge>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Speichern
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
                  onChange={(e) => setProjectNumber(e.target.value)}
                  placeholder="z.B. PRJ-2025-001"
                />
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
                <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
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
                <div className="flex gap-2">
                  <Input
                    value={credits}
                    onChange={(e) => setCredits(e.target.value)}
                    placeholder="Credits"
                  />
                </div>
              </div>
              
              <div>
                <Label>Credit-Faktor</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={creditFactor}
                    onChange={(e) => setCreditFactor(e.target.value)}
                    placeholder="1.0"
                  />
                  <Button onClick={calculateCredits} variant="outline">
                    Berechnen
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Formel: (Umsatz / 30) × Faktor
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
              <TabsTrigger value="customer">Kundennotizen</TabsTrigger>
              <TabsTrigger value="internal">Interne Notizen</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Projektinhalt</CardTitle>
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
                        Dateien hochladen
                      </Button>
                      
                      {project.files && project.files.length > 0 ? (
                        <div className="mt-4 space-y-2">
                          {project.files.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                <span className="text-sm">{file.filename}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({(file.size / 1024).toFixed(1)} KB)
                                </span>
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
            </TabsContent>

            <TabsContent value="customer" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Kommunikation mit Kunde</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label>Notizen (für Kunden sichtbar)</Label>
                    <Textarea
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      rows={15}
                      placeholder="Diese Notizen sind für den Kunden sichtbar..."
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="internal" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Interne Kommunikation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label>Interne Notizen (nur für Team)</Label>
                    <Textarea
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      rows={15}
                      placeholder="Diese Notizen sind nur für das Team sichtbar..."
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
