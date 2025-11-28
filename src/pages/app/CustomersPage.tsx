import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {CustomerDetails, Customer, Segment, PipelineStage } from "@/types";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Unlock, List, PhoneCall, Target, Star, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";

const segmentLabels: Record<Segment, string> = {
  ENERGIEBERATER: "Energieberater",
  ENDKUNDE: "Endkunde",
  HEIZUNGSBAUER: "Heizungsbauer",
  HANDWERKER_KOOPERATION: "Handwerker Kooperation",
  PROJEKTGESCHAEFT: "Projektgeschäft",
};

const stageLabels: Record<PipelineStage, string> = {
  LEAD_LIST: "Leadliste",
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

export const CustomersPage = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<Segment | "ALL">("ALL");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, [selectedSegment]);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.customers.getCustomers({
        segment: selectedSegment !== "ALL" ? selectedSegment : undefined,
      });
      setCustomers(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler beim Laden der Kunden: " + message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlockPortal = async (customerId: string) => {
    try {
      const response = await apiClient.customers.unlockPortalAccess(customerId);
      toast.success(
        <div>
          <p className="font-semibold">Portalzugang freigeschaltet!</p>
          <p className="text-sm mt-1">Temporäres Passwort: <code className="bg-muted px-1 py-0.5 rounded">{response.temporary_password}</code></p>
          <p className="text-xs text-muted-foreground mt-1">{response.note}</p>
        </div>
      );
      loadCustomers();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler beim Freischalten: " + message);
    }
  };

  const handleStageChange = async (customerId: string, newStage: PipelineStage) => {
    try {
      await apiClient.customers.changeStage(customerId, newStage);
      toast.success(`Kunde zu "${stageLabels[newStage]}" verschoben`);
      loadCustomers();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler beim Verschieben: " + message);
    }
  };

  // Filter logic now handled by backend
  const filteredCustomers = customers;

  const segments: Array<Segment | "ALL"> = ["ALL", "ENERGIEBERATER", "ENDKUNDE", "HEIZUNGSBAUER", "PROJEKTGESCHAEFT"];

  const kanbanColumns = [
    { id: "LEAD_LIST", title: "Leadliste", items: filteredCustomers.filter(c => c.stage === "LEAD_LIST") },
    { id: "FOLLOW_UP", title: "Follow Up", items: filteredCustomers.filter(c => c.stage === "FOLLOW_UP") },
    { id: "PRE_STAGE", title: "Pre Stage", items: filteredCustomers.filter(c => c.stage === "PRE_STAGE") },
    { id: "STAGE", title: "Stage", items: filteredCustomers.filter(c => c.stage === "STAGE") },
    { id: "KUNDE", title: "Kunde", items: filteredCustomers.filter(c => c.stage === "KUNDE") },
    { id: "BESTANDSKUNDE", title: "Bestandskunde", items: filteredCustomers.filter(c => c.stage === "BESTANDSKUNDE") },
  ];

  const renderKanbanCard = (customer: Customer) => (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/app/customers/${customer.id}`)}
    >
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div>
              {customer.first_name && customer.last_name ? (
                <>
                  <h4 className="font-semibold text-foreground">{customer.first_name} {customer.last_name}</h4>
                  {customer.company_name && (
                    <p className="text-sm text-muted-foreground">{customer.company_name}</p>
                  )}
                </>
              ) : (
                <h4 className="font-semibold text-foreground">{customer.name}</h4>
              )}
            </div>
            <Badge variant="secondary" className="text-xs">{segmentLabels[customer.segment]}</Badge>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex items-center justify-between pt-2">
              <span>{customer.order_count || 0} Bestellungen</span>
              <span className="font-medium text-foreground">{(customer.total_revenue || 0).toLocaleString("de-DE")} €</span>
            </div>
          </div>
          {customer.stage === "PRE_STAGE" && (
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-2"
              onClick={(e) => {
                e.stopPropagation();
                handleUnlockPortal(customer.id);
              }}
            >
              <Unlock className="h-3 w-3 mr-2" />
              Zugang freischalten
            </Button>
          )}
        </div>
        {/* Phase ändern Dropdown */}
        <div className="mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
          <Select
            value={customer.stage}
            onValueChange={(value) => handleStageChange(customer.id, value as PipelineStage)}
          >
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue>
                {(() => {
                  const Icon = STAGE_ICONS[customer.stage];
                  const iconColor = STAGE_ICON_COLORS[customer.stage];
                  return (
                    <div className="flex items-center gap-2">
                      <Icon className={`h-3 w-3 ${iconColor}`} />
                      <span>{stageLabels[customer.stage]}</span>
                    </div>
                  );
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(stageLabels).map(([key, label]) => {
                const Icon = STAGE_ICONS[key as PipelineStage];
                const iconColor = STAGE_ICON_COLORS[key as PipelineStage];
                return (
                  <SelectItem key={key} value={key} className="text-xs">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-3 w-3 ${iconColor}`} />
                      <span>{label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
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

      <Tabs defaultValue="kanban" className="w-full">
        <TabsList>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="list">Liste</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Lade Kunden...</span>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {kanbanColumns.map((column) => {
                const Icon = STAGE_ICONS[column.id as PipelineStage];
                const iconColor = STAGE_ICON_COLORS[column.id as PipelineStage];
                return (
                  <div key={column.id} className="flex-shrink-0 w-80">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Icon className={`h-5 w-5 ${iconColor}`} />
                        <h3 className="font-semibold">{column.title} ({column.items.length})</h3>
                      </div>
                      <div className="space-y-3">
                        {column.items.map((customer) => (
                          <div key={customer.id}>
                            {renderKanbanCard(customer)}
                          </div>
                        ))}
                        {column.items.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-8">Keine Kunden</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <div className="border rounded-lg bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Name</TableHead>
                  <TableHead className="whitespace-nowrap">Segment</TableHead>
                  <TableHead className="whitespace-nowrap">Stage</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Bestellungen</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Umsatz</TableHead>
                  <TableHead className="whitespace-nowrap">Portal</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow 
                    key={customer.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/app/customers/${customer.id}`)}
                  >
                    <TableCell className="font-medium whitespace-nowrap">{customer.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{segmentLabels[customer.segment]}</Badge>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const Icon = STAGE_ICONS[customer.stage];
                        const iconColor = STAGE_ICON_COLORS[customer.stage];
                        return (
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            <Icon className={`h-3 w-3 ${iconColor}`} />
                            {stageLabels[customer.stage]}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">{customer.order_count || 0}</TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap">
                      {(customer.total_revenue || 0).toLocaleString("de-DE")} €
                    </TableCell>
                    <TableCell>
                      {customer.stage !== "LEAD_LIST" && customer.stage !== "FOLLOW_UP" ? (
                        <Badge variant="default">Zugang</Badge>
                      ) : (
                        <Badge variant="secondary">Kein Zugang</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {customer.stage === "PRE_STAGE" && (
                        <Button size="sm" variant="outline" onClick={() => handleUnlockPortal(customer.id)}>
                          <Unlock className="h-3 w-3 mr-2" />
                          Freischalten
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
