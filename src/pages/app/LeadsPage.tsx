import { useState, useEffect } from "react";
import { Lead, Segment, PipelineStage } from "@/types";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Edit, Eye } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const segmentLabels: Record<Segment, string> = {
  ENERGIEBERATER: "Energieberater",
  ENDKUNDE: "Endkunde",
  HEIZUNGSBAUER: "Heizungsbauer",
  HANDWERKER_KOOPERATION: "Handwerker Kooperation",
  PROJEKTGESCHAEFT: "Projektgeschäft",
};

const stageLabels: Record<PipelineStage, string> = {
  LEAD_LIST: "Leads",
  FOLLOW_UP: "Follow Up",
  PRE_STAGE: "Pre Stage",
  STAGE: "Stage",
  KUNDE: "Kunde",
  BESTANDSKUNDE: "Bestandskunde",
};

export const LeadsPage = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSegment, setSelectedSegment] = useState<Segment | "ALL">("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  
  const emptyLead = {
    first_name: "",
    last_name: "",
    company_name: "",
    email: "",
    phone: "",
    website: "",
    segment: "ENDKUNDE" as Segment,
    stage: "LEAD_LIST" as PipelineStage,
    street: "",
    house_number: "",
    city: "",
    postal_code: "",
    tax_number: "",
    notes: "",
  };
  const [newLead, setNewLead] = useState(emptyLead);

  useEffect(() => {
    loadLeads();
  }, [searchTerm, selectedSegment]);

  const loadLeads = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.leads.getLeads({
        segment: selectedSegment !== "ALL" ? selectedSegment : undefined,
        search: searchTerm || undefined,
      });
      setLeads(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler beim Laden der Leads: " + message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLead = async () => {
    try {
      await apiClient.leads.createLead(newLead);
      toast.success("Lead erfolgreich erstellt");
      setIsCreateDialogOpen(false);
      setNewLead(emptyLead);
      loadLeads();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler beim Erstellen: " + message);
    }
  };

  const handleUpdateLead = async () => {
    if (!editingLead) return;

    try {
      await apiClient.leads.updateLead(editingLead.id, editingLead);
      
      // Check if stage changed to non-LEAD_LIST
      if (editingLead.stage !== "LEAD_LIST") {
        toast.success(`Lead wurde zu Customers verschoben (Phase: "${stageLabels[editingLead.stage]}")`);  
      } else {
        toast.success("Lead erfolgreich aktualisiert");
      }
      
      setIsDetailDialogOpen(false);
      setEditingLead(null);
      setSelectedLead(null);
      loadLeads();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler beim Aktualisieren: " + message);
    }
  };

  const handleStageChange = async (leadId: string, newStage: PipelineStage) => {
    console.log("=== STAGE CHANGE START ===");
    console.log("Lead ID:", leadId);
    console.log("New Stage:", newStage);
    
    try {
      const lead = leads.find(l => l.id === leadId);
      if (!lead) {
        console.error("Lead not found in state:", leadId);
        return;
      }
      
      console.log("Current lead:", lead);
      console.log("Calling API to update lead...");
      
      const response = await apiClient.leads.updateLead(leadId, { stage: newStage });
      console.log("API Response:", response);
      
      // If stage changed to anything other than LEAD_LIST, lead is converted to customer
      if (newStage !== "LEAD_LIST") {
        console.log("Lead converted to customer!");
        toast.success(`Lead wurde zu Customers verschoben (Phase: "${stageLabels[newStage]}")`);
      } else {
        console.log("Lead stage updated to LEAD_LIST");
        toast.success(`Phase geändert zu "${stageLabels[newStage]}"`);
      }
      
      console.log("Reloading leads...");
      loadLeads();
      console.log("=== STAGE CHANGE END ===");
    } catch (error: unknown) {
      console.error("=== STAGE CHANGE ERROR ===");
      console.error("Error object:", error);
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      console.error("Error message:", message);
      toast.error("Fehler beim Ändern der Phase: " + message);
    }
  };

  const handleSegmentChange = async (leadId: string, newSegment: Segment) => {
    try {
      await apiClient.leads.updateLead(leadId, { segment: newSegment });
      toast.success(`Segment geändert zu "${segmentLabels[newSegment]}"`);
      loadLeads();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler beim Ändern des Segments: " + message);
    }
  };

  const openDetailView = (lead: Lead) => {
    setSelectedLead(lead);
    setEditingLead({ ...lead });
    setIsDetailDialogOpen(true);
  };

  const segments: Array<Segment | "ALL"> = [
    "ALL",
    "ENERGIEBERATER",
    "ENDKUNDE",
    "HEIZUNGSBAUER",
    "HANDWERKER_KOOPERATION",
    "PROJEKTGESCHAEFT",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Leads</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Neuer Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Neuen Lead erstellen</DialogTitle>
              <DialogDescription>
                Erfassen Sie die Informationen zum neuen Lead.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="first_name">Vorname</Label>
                  <Input
                    id="first_name"
                    value={newLead.first_name}
                    onChange={(e) => setNewLead({ ...newLead, first_name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="last_name">Nachname</Label>
                  <Input
                    id="last_name"
                    value={newLead.last_name}
                    onChange={(e) => setNewLead({ ...newLead, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company_name">Firma</Label>
                <Input
                  id="company_name"
                  value={newLead.company_name}
                  onChange={(e) => setNewLead({ ...newLead, company_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">E-Mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://www.beispiel.de"
                  value={newLead.website}
                  onChange={(e) => setNewLead({ ...newLead, website: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="segment">Segment *</Label>
                  <Select
                    value={newLead.segment}
                    onValueChange={(value) => setNewLead({ ...newLead, segment: value as Segment })}
                  >
                    <SelectTrigger id="segment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(segmentLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="stage">Phase</Label>
                  <Select
                    value={newLead.stage}
                    onValueChange={(value) => setNewLead({ ...newLead, stage: value as PipelineStage })}
                  >
                    <SelectTrigger id="stage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(stageLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleCreateLead}>Erstellen</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Suche nach Name, Firma oder E-Mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex gap-2">
        {segments.map((segment) => (
          <Button
            key={segment}
            variant={selectedSegment === segment ? "default" : "outline"}
            onClick={() => setSelectedSegment(segment)}
            size="sm"
          >
            {segment === "ALL" ? "Alle" : segmentLabels[segment]}
          </Button>
        ))}
      </div>

      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Phase</TableHead>
              <TableHead className="whitespace-nowrap">Vor- und Nachname</TableHead>
              <TableHead className="whitespace-nowrap">Firma</TableHead>
              <TableHead className="whitespace-nowrap">E-Mail</TableHead>
              <TableHead className="whitespace-nowrap">Telefon</TableHead>
              <TableHead className="whitespace-nowrap">Segment</TableHead>
              <TableHead className="whitespace-nowrap">Erstellt</TableHead>
              <TableHead className="text-right whitespace-nowrap">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-muted-foreground">Lade Leads...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Keine Leads gefunden
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Select
                      value={lead.stage}
                      onValueChange={(value) => handleStageChange(lead.id, value as PipelineStage)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(stageLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    {[lead.first_name, lead.last_name].filter(Boolean).join(" ") || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {lead.company_name || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {lead.email || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {lead.phone || "-"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={lead.segment}
                      onValueChange={(value) => handleSegmentChange(lead.id, value as Segment)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(segmentLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {lead.created_at ? format(new Date(lead.created_at), "dd.MM.yyyy", { locale: de }) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDetailView(lead)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail/Edit Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lead bearbeiten</DialogTitle>
            <DialogDescription>
              Alle Informationen zum Lead - Erweiterte Ansicht
            </DialogDescription>
          </DialogHeader>
          {editingLead && (
            <div className="grid gap-6 py-4">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground">KONTAKTDATEN</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit_first_name">Vorname</Label>
                    <Input
                      id="edit_first_name"
                      value={editingLead.first_name || ""}
                      onChange={(e) => setEditingLead({ ...editingLead, first_name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit_last_name">Nachname</Label>
                    <Input
                      id="edit_last_name"
                      value={editingLead.last_name || ""}
                      onChange={(e) => setEditingLead({ ...editingLead, last_name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit_company_name">Firma</Label>
                  <Input
                    id="edit_company_name"
                    value={editingLead.company_name || ""}
                    onChange={(e) => setEditingLead({ ...editingLead, company_name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit_email">E-Mail</Label>
                    <Input
                      id="edit_email"
                      type="email"
                      value={editingLead.email || ""}
                      onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit_phone">Telefon</Label>
                    <Input
                      id="edit_phone"
                      value={editingLead.phone || ""}
                      onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit_website">Website</Label>
                  <Input
                    id="edit_website"
                    type="url"
                    placeholder="https://www.beispiel.de"
                    value={editingLead.website || ""}
                    onChange={(e) => setEditingLead({ ...editingLead, website: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground">ADRESSE</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 grid gap-2">
                    <Label htmlFor="edit_street">Straße</Label>
                    <Input
                      id="edit_street"
                      value={editingLead.street || ""}
                      onChange={(e) => setEditingLead({ ...editingLead, street: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit_house_number">Hausnummer</Label>
                    <Input
                      id="edit_house_number"
                      value={editingLead.house_number || ""}
                      onChange={(e) => setEditingLead({ ...editingLead, house_number: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit_postal_code">PLZ</Label>
                    <Input
                      id="edit_postal_code"
                      value={editingLead.postal_code || ""}
                      onChange={(e) => setEditingLead({ ...editingLead, postal_code: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 grid gap-2">
                    <Label htmlFor="edit_city">Stadt</Label>
                    <Input
                      id="edit_city"
                      value={editingLead.city || ""}
                      onChange={(e) => setEditingLead({ ...editingLead, city: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground">KATEGORISIERUNG</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit_segment">Segment *</Label>
                    <Select
                      value={editingLead.segment}
                      onValueChange={(value) => setEditingLead({ ...editingLead, segment: value as Segment })}
                    >
                      <SelectTrigger id="edit_segment">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(segmentLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit_stage">Phase</Label>
                    <Select
                      value={editingLead.stage}
                      onValueChange={(value) => setEditingLead({ ...editingLead, stage: value as PipelineStage })}
                    >
                      <SelectTrigger id="edit_stage">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(stageLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit_tax_number">Steuernummer</Label>
                  <Input
                    id="edit_tax_number"
                    value={editingLead.tax_number || ""}
                    onChange={(e) => setEditingLead({ ...editingLead, tax_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground">NOTIZEN</h3>
                <div className="grid gap-2">
                  <Textarea
                    id="edit_notes"
                    value={editingLead.notes || ""}
                    onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
                    rows={6}
                    placeholder="Zusätzliche Informationen, Anmerkungen..."
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleUpdateLead}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
