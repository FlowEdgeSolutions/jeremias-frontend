import { useState, useEffect } from "react";
import { Invoice, InvoiceStatus } from "@/types";
import { invoicesApi, usersApi, EmployeeCredits } from "@/lib/apiClient";
import { StatCard } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Euro, TrendingUp, AlertCircle, FileText, Star, Users, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";

const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  DRAFT: "Entwurf",
  SENT: "Versendet",
  PAID: "Bezahlt",
  OVERDUE: "Überfällig",
};

const invoiceStatusColors: Record<InvoiceStatus, string> = {
  DRAFT: "secondary",
  SENT: "outline",
  PAID: "default",
  OVERDUE: "destructive",
};

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case "admin":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    case "sales":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "project_member":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case "admin":
      return "Admin";
    case "sales":
      return "Vertrieb";
    case "project_member":
      return "Mitarbeiter";
    default:
      return role;
  }
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
};

export const FinancePage = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [employeeCredits, setEmployeeCredits] = useState<EmployeeCredits[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invoicesData, creditsData] = await Promise.all([
        invoicesApi.getInvoices(),
        usersApi.getEmployeeCredits(),
      ]);
      setInvoices(invoicesData);
      setEmployeeCredits(creditsData);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler beim Laden: " + message);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = invoices
    .filter(inv => inv.status === "PAID")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const openAmount = invoices
    .filter(inv => inv.status === "SENT" || inv.status === "OVERDUE")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const openCount = invoices.filter(inv => inv.status === "SENT" || inv.status === "OVERDUE").length;
  const overdueCount = invoices.filter(inv => inv.status === "OVERDUE").length;
  const paidCount = invoices.filter(inv => inv.status === "PAID").length;
  const draftCount = invoices.filter(inv => inv.status === "DRAFT").length;
  const totalCredits = employeeCredits.reduce((sum, emp) => sum + emp.total_credits, 0);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="credits">Credits</TabsTrigger>
          <TabsTrigger value="invoices">Rechnungen</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Gesamtumsatz"
              value={`${totalRevenue.toLocaleString("de-DE")} €`}
              icon={Euro}
              description="Bezahlte Rechnungen"
            />
            <StatCard
              title="Offene Summe"
              value={`${openAmount.toLocaleString("de-DE")} €`}
              icon={TrendingUp}
              description="Ausstehend"
            />
            <StatCard
              title="Offene Rechnungen"
              value={openCount}
              icon={FileText}
              description="Noch nicht bezahlt"
            />
            <StatCard
              title="Mitarbeiter Credits"
              value={totalCredits.toLocaleString("de-DE")}
              icon={Star}
              description="Aus abgeschlossenen Projekten"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Bezahlte Rechnungen</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{paidCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Entwürfe</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{draftCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Offene Rechnungen</CardTitle>
                <FileText className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{openCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Überfällig</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overdueCount}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Letzte Rechnungen</CardTitle>
              <CardDescription>Zuletzt erstellte Rechnungen</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Keine Rechnungen vorhanden</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nr.</TableHead>
                        <TableHead className="text-right">Betrag</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Datum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.slice(0, 5).map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">
                            {invoice.invoice_number || "-"}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {Number(invoice.amount).toLocaleString("de-DE")} €
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={invoiceStatusColors[invoice.status]}>
                              {invoiceStatusLabels[invoice.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(invoice.created_at), "dd.MM.yyyy", { locale: de })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credits Tab */}
        <TabsContent value="credits" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Gesamt Credits</CardTitle>
                <Star className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCredits.toLocaleString("de-DE")}</div>
                <p className="text-xs text-muted-foreground">Aus abgeschlossenen Projekten</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Mitarbeiter</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{employeeCredits.length}</div>
                <p className="text-xs text-muted-foreground">Mit Projektzuweisungen</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ø Credits</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {employeeCredits.length > 0
                    ? Math.round(totalCredits / employeeCredits.length).toLocaleString("de-DE")
                    : 0}
                </div>
                <p className="text-xs text-muted-foreground">Pro Mitarbeiter</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Credits nach Mitarbeiter</CardTitle>
              <CardDescription>
                Übersicht der Credits basierend auf abgeschlossenen Projekten
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : employeeCredits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Keine Mitarbeiter mit Projekten gefunden
                </div>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mitarbeiter</TableHead>
                        <TableHead>Rolle</TableHead>
                        <TableHead className="text-center">Abgeschlossen</TableHead>
                        <TableHead className="text-center">In Arbeit</TableHead>
                        <TableHead className="text-right">Credits</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeeCredits.map((employee, index) => (
                        <TableRow key={employee.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium ${
                                index === 0 ? "bg-yellow-500/20 text-yellow-600" :
                                index === 1 ? "bg-muted text-muted-foreground" :
                                index === 2 ? "bg-amber-600/20 text-amber-700" :
                                "bg-primary/10 text-primary"
                              }`}>
                                {index < 3 ? (index + 1) : getInitials(employee.name)}
                              </div>
                              <div>
                                <p className="font-medium">{employee.name}</p>
                                <p className="text-sm text-muted-foreground">{employee.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getRoleBadgeColor(employee.role)}>
                              {getRoleLabel(employee.role)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-500/10 text-green-600">
                              {employee.completed_projects}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-500/10 text-blue-600">
                              {employee.in_progress_projects}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="inline-flex items-center gap-1 font-bold text-lg">
                              {employee.total_credits.toLocaleString("de-DE")}
                              <Star className="h-4 w-4 text-yellow-500" />
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="Gesamtumsatz"
              value={`${totalRevenue.toLocaleString("de-DE")} €`}
              icon={Euro}
              description="Bezahlte Rechnungen"
            />
            <StatCard
              title="Offene Summe"
              value={`${openAmount.toLocaleString("de-DE")} €`}
              icon={TrendingUp}
              description="Ausstehend"
            />
            <StatCard
              title="Offene Rechnungen"
              value={openCount}
              icon={FileText}
              description="Noch nicht bezahlt"
            />
            <StatCard
              title="Überfällig"
              value={overdueCount}
              icon={AlertCircle}
              description="Erinnerung nötig"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Alle Rechnungen</CardTitle>
              <CardDescription>Übersicht aller erstellten Rechnungen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rechnungsnr.</TableHead>
                      <TableHead>Kunde</TableHead>
                      <TableHead>Projekt</TableHead>
                      <TableHead className="text-right">Betrag</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fällig am</TableHead>
                      <TableHead>Bezahlt am</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Keine Rechnungen vorhanden
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoice_number || "-"}</TableCell>
                          <TableCell>{invoice.customer_id || invoice.customerId}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {invoice.project_id || invoice.projectId || "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {invoice.amount.toLocaleString("de-DE")} €
                          </TableCell>
                          <TableCell>
                            <Badge variant={invoiceStatusColors[invoice.status] as any}>
                              {invoiceStatusLabels[invoice.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {invoice.due_date || invoice.dueDate
                              ? format(new Date(invoice.due_date || invoice.dueDate!), "dd.MM.yyyy", { locale: de })
                              : "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {invoice.paid_at || invoice.paidAt
                              ? format(new Date(invoice.paid_at || invoice.paidAt!), "dd.MM.yyyy", { locale: de })
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
