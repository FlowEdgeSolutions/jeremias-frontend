import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { Segment, PipelineStage } from "@/types";

export const ApiTestPage = () => {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  // Customer Fields
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerSegment, setCustomerSegment] = useState<Segment>("ENERGIEBERATER");

  // User Fields
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState("sales");

  // Project Fields
  const [projectCustomerId, setProjectCustomerId] = useState("");
  const [projectProductCode, setProjectProductCode] = useState("");
  const [projectProductName, setProjectProductName] = useState("");
  const [projectPayload, setProjectPayload] = useState("{}");

  // Generic Fields
  const [customerId, setCustomerId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [newStage, setNewStage] = useState<PipelineStage>("FOLLOW_UP");

  const handleApiCall = async (apiFunction: () => Promise<any>, successMessage: string) => {
    try {
      setLoading(true);
      const data = await apiFunction();
      setResponse(data);
      toast.success(successMessage);
    } catch (error: any) {
      toast.error(error.message || "API-Fehler");
      setResponse({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">API Test Center</h1>
        <p className="text-muted-foreground mt-2">
          Teste alle Backend-Endpunkte direkt hier
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Forms */}
        <div className="space-y-6">
          <Tabs defaultValue="customers" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="customers">Kunden</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="projects">Projekte</TabsTrigger>
              <TabsTrigger value="other">Sonstiges</TabsTrigger>
            </TabsList>

            {/* CUSTOMERS TAB */}
            <TabsContent value="customers" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Kunde erstellen</CardTitle>
                  <CardDescription>POST /api/customers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Energieberatung Schmidt GmbH"
                    />
                  </div>
                  <div>
                    <Label>E-Mail</Label>
                    <Input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="schmidt@example.de"
                    />
                  </div>
                  <div>
                    <Label>Telefon</Label>
                    <Input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+49 40 12345678"
                    />
                  </div>
                  <div>
                    <Label>Segment</Label>
                    <Select value={customerSegment} onValueChange={(val) => setCustomerSegment(val as Segment)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ENERGIEBERATER">Energieberater</SelectItem>
                        <SelectItem value="ENDKUNDE">Endkunde</SelectItem>
                        <SelectItem value="HEIZUNGSBAUER">Heizungsbauer</SelectItem>
                        <SelectItem value="PROJEKTGESCHAEFT">Projektgeschäft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() =>
                      handleApiCall(
                        () =>
                          apiClient.customers.createCustomer({
                            name: customerName,
                            email: customerEmail,
                            phone: customerPhone,
                            segment: customerSegment,
                          }),
                        "Kunde erfolgreich erstellt!"
                      )
                    }
                    disabled={loading}
                    className="w-full"
                  >
                    Kunde erstellen
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Alle Kunden abrufen</CardTitle>
                  <CardDescription>GET /api/customers</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleApiCall(() => apiClient.customers.getCustomers(), "Kunden geladen!")}
                    disabled={loading}
                    className="w-full"
                  >
                    Alle Kunden laden
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Kunden-Stage ändern</CardTitle>
                  <CardDescription>PATCH /api/customers/:id/stage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Kunden-ID</Label>
                    <Input
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      placeholder="UUID des Kunden"
                    />
                  </div>
                  <div>
                    <Label>Neue Stage</Label>
                    <Select value={newStage} onValueChange={(val) => setNewStage(val as PipelineStage)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LEAD_LIST">Lead List</SelectItem>
                        <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
                        <SelectItem value="PRE_STAGE">Pre Stage</SelectItem>
                        <SelectItem value="STAGE">Stage</SelectItem>
                        <SelectItem value="KUNDE">Kunde</SelectItem>
                        <SelectItem value="BESTANDSKUNDE">Bestandskunde</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() =>
                      handleApiCall(
                        () => apiClient.customers.changeStage(customerId, newStage),
                        "Stage erfolgreich geändert!"
                      )
                    }
                    disabled={loading || !customerId}
                    className="w-full"
                  >
                    Stage ändern
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Portalzugang freischalten</CardTitle>
                  <CardDescription>POST /api/customers/:id/unlock-portal</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Kunden-ID</Label>
                    <Input
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      placeholder="UUID des Kunden"
                    />
                  </div>
                  <Button
                    onClick={() =>
                      handleApiCall(
                        () => apiClient.customers.unlockPortalAccess(customerId),
                        "Portalzugang freigeschaltet!"
                      )
                    }
                    disabled={loading || !customerId}
                    className="w-full"
                  >
                    Zugang freischalten
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* USERS TAB */}
            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>User registrieren</CardTitle>
                  <CardDescription>POST /api/auth/register</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Max Mustermann"
                    />
                  </div>
                  <div>
                    <Label>E-Mail</Label>
                    <Input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="max@example.de"
                    />
                  </div>
                  <div>
                    <Label>Passwort</Label>
                    <Input
                      type="password"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <Label>Rolle</Label>
                    <Select value={userRole} onValueChange={setUserRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="project_member">Project Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() =>
                      handleApiCall(
                        () =>
                          apiClient.auth.register({
                            name: userName,
                            email: userEmail,
                            password: userPassword,
                            role: userRole,
                          }),
                        "User erfolgreich registriert!"
                      )
                    }
                    disabled={loading}
                    className="w-full"
                  >
                    User registrieren
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Aktueller User</CardTitle>
                  <CardDescription>GET /api/auth/me</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleApiCall(() => apiClient.auth.me(), "User-Daten geladen!")}
                    disabled={loading}
                    className="w-full"
                  >
                    Meine Daten laden
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PROJECTS TAB */}
            <TabsContent value="projects" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Projekt erstellen</CardTitle>
                  <CardDescription>POST /api/projects</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Kunden-ID</Label>
                    <Input
                      value={projectCustomerId}
                      onChange={(e) => setProjectCustomerId(e.target.value)}
                      placeholder="UUID des Kunden"
                    />
                  </div>
                  <div>
                    <Label>Produktcode</Label>
                    <Input
                      value={projectProductCode}
                      onChange={(e) => setProjectProductCode(e.target.value)}
                      placeholder="WP-001"
                    />
                  </div>
                  <div>
                    <Label>Produktname</Label>
                    <Input
                      value={projectProductName}
                      onChange={(e) => setProjectProductName(e.target.value)}
                      placeholder="Wärmepumpe Standard"
                    />
                  </div>
                  <div>
                    <Label>Payload (JSON)</Label>
                    <Textarea
                      value={projectPayload}
                      onChange={(e) => setProjectPayload(e.target.value)}
                      placeholder='{"field1": "value1"}'
                      rows={4}
                    />
                  </div>
                  <Button
                    onClick={() =>
                      handleApiCall(
                        () =>
                          apiClient.projects.createProject({
                            customer_id: projectCustomerId,
                            product_code: projectProductCode,
                            product_name: projectProductName,
                            payload: JSON.parse(projectPayload || "{}"),
                          }),
                        "Projekt erfolgreich erstellt!"
                      )
                    }
                    disabled={loading}
                    className="w-full"
                  >
                    Projekt erstellen
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Alle Projekte abrufen</CardTitle>
                  <CardDescription>GET /api/projects</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleApiCall(() => apiClient.projects.getProjects(), "Projekte geladen!")}
                    disabled={loading}
                    className="w-full"
                  >
                    Alle Projekte laden
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* OTHER TAB */}
            <TabsContent value="other" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Rechnungen abrufen</CardTitle>
                  <CardDescription>GET /api/invoices</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleApiCall(() => apiClient.invoices.getInvoices(), "Rechnungen geladen!")}
                    disabled={loading}
                    className="w-full"
                  >
                    Alle Rechnungen laden
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>QC-Liste abrufen</CardTitle>
                  <CardDescription>GET /api/qc</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleApiCall(() => apiClient.qc.getQcProjects(), "QC-Liste geladen!")}
                    disabled={loading}
                    className="w-full"
                  >
                    QC-Liste laden
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Projektregeln abrufen</CardTitle>
                  <CardDescription>GET /api/project-rules</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() =>
                      handleApiCall(() => apiClient.projectRules.getProjectRules(), "Projektregeln geladen!")
                    }
                    disabled={loading}
                    className="w-full"
                  >
                    Projektregeln laden
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Response */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>API Response</CardTitle>
              <CardDescription>Die Antwort des Backends erscheint hier</CardDescription>
            </CardHeader>
            <CardContent>
              {response ? (
                <div className="bg-muted p-4 rounded-md overflow-auto max-h-[600px]">
                  <pre className="text-xs">{JSON.stringify(response, null, 2)}</pre>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  Noch keine Anfrage gesendet
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
