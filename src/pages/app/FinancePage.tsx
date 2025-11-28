import { useState, useEffect } from "react";
import { Invoice, InvoiceStatus } from "@/types";
import { invoicesApi, usersApi, paymentsApi, EmployeeCredits, Payment, PaymentSummary, PaymentStatus } from "@/lib/apiClient";
import { StatCard } from "@/components/StatCard";
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
import { Euro, TrendingUp, AlertCircle, FileText, Star, Users, CheckCircle, Clock, CreditCard, Receipt, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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

const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: "Ausstehend",
  COMPLETED: "Abgeschlossen",
  FAILED: "Fehlgeschlagen",
  REFUNDED: "Erstattet",
  CANCELLED: "Storniert",
};

const paymentStatusColors: Record<PaymentStatus, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  COMPLETED: "bg-green-500/10 text-green-600 border-green-500/20",
  FAILED: "bg-red-500/10 text-red-600 border-red-500/20",
  REFUNDED: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  CANCELLED: "bg-gray-500/10 text-gray-600 border-gray-500/20",
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
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invoicesData, creditsData, paymentsData, summaryData] = await Promise.all([
        invoicesApi.getInvoices(),
        usersApi.getEmployeeCredits(),
        paymentsApi.getPayments().catch(() => []),
        paymentsApi.getSummary().catch(() => null),
      ]);
      setInvoices(invoicesData);
      setEmployeeCredits(creditsData);
      setPayments(paymentsData);
      setPaymentSummary(summaryData);
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
  const totalCredits = employeeCredits.reduce((sum, emp) => sum + emp.total_credits, 0);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="payments">Zahlungen</TabsTrigger>
          <TabsTrigger value="credits">Credits</TabsTrigger>
          <TabsTrigger value="invoices">Rechnungen</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Stripe Umsatz"
              value={`${(paymentSummary?.total_revenue || 0).toLocaleString("de-DE")} €`}
              icon={CreditCard}
              description="Via Stripe bezahlt"
            />
            <StatCard
              title="Ausstehende Zahlungen"
              value={`${(paymentSummary?.total_pending || 0).toLocaleString("de-DE")} €`}
              icon={Clock}
              description={`${paymentSummary?.pending_count || 0} offene Zahlungen`}
            />
            <StatCard
              title="Gesamtumsatz"
              value={`${totalRevenue.toLocaleString("de-DE")} €`}
              icon={Euro}
              description="Alle bezahlten Rechnungen"
            />
            <StatCard
              title="Mitarbeiter Credits"
              value={totalCredits.toLocaleString("de-DE")}
              icon={Star}
              description="Aus abgeschlossenen Projekten"
            />
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Abgeschlossene Zahlungen</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{paymentSummary?.completed_count || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Fehlgeschlagene</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{paymentSummary?.failed_count || 0}</div>
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

          {/* Recent Payments */}
          <Card>
            <CardHeader>
              <CardTitle>Letzte Zahlungen</CardTitle>
              <CardDescription>Die neuesten Stripe-Transaktionen</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Keine Zahlungen vorhanden</p>
                  <p className="text-sm mt-2">Stripe-Zahlungen werden hier automatisch angezeigt</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produkt</TableHead>
                        <TableHead className="text-right">Betrag</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Datum</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.slice(0, 5).map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {payment.product_name || payment.description || "-"}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {Number(payment.amount).toLocaleString("de-DE")} €
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={paymentStatusColors[payment.status]}>
                              {paymentStatusLabels[payment.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(payment.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                          </TableCell>
                          <TableCell>
                            {payment.receipt_url && (
                              <Button variant="ghost" size="sm" asChild>
                                <a href={payment.receipt_url} target="_blank" rel="noopener noreferrer">
                                  <Receipt className="h-4 w-4 mr-1" />
                                  Beleg
                                </a>
                              </Button>
                            )}
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

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="Umsatz (Stripe)"
              value={`${(paymentSummary?.total_revenue || 0).toLocaleString("de-DE")} €`}
              icon={CreditCard}
              description="Abgeschlossene Zahlungen"
            />
            <StatCard
              title="Ausstehend"
              value={`${(paymentSummary?.total_pending || 0).toLocaleString("de-DE")} €`}
              icon={Clock}
              description={`${paymentSummary?.pending_count || 0} Zahlungen`}
            />
            <StatCard
              title="Erstattet"
              value={`${(paymentSummary?.total_refunded || 0).toLocaleString("de-DE")} €`}
              icon={TrendingUp}
              description="Rückerstattungen"
            />
            <StatCard
              title="Fehlgeschlagen"
              value={paymentSummary?.failed_count || 0}
              icon={AlertCircle}
              description="Abgelehnte Zahlungen"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Alle Zahlungen</CardTitle>
              <CardDescription>
                Stripe-Transaktionen und Zahlungshistorie
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CreditCard className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Keine Zahlungen</h3>
                  <p className="text-sm">Stripe-Zahlungen erscheinen hier automatisch nach dem Kauf</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produkt</TableHead>
                        <TableHead>Zahlungsmethode</TableHead>
                        <TableHead className="text-right">Betrag</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Erstellt</TableHead>
                        <TableHead>Bezahlt am</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{payment.product_name || "-"}</p>
                              {payment.description && (
                                <p className="text-sm text-muted-foreground">{payment.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="capitalize">{payment.payment_method || "-"}</span>
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {Number(payment.amount).toLocaleString("de-DE")} {payment.currency}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={paymentStatusColors[payment.status]}>
                              {paymentStatusLabels[payment.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {format(new Date(payment.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {payment.paid_at 
                              ? format(new Date(payment.paid_at), "dd.MM.yyyy HH:mm", { locale: de })
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {payment.receipt_url && (
                              <Button variant="ghost" size="sm" asChild>
                                <a href={payment.receipt_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
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
                                index === 1 ? "bg-gray-300/20 text-gray-600" :
                                index === 2 ? "bg-amber-600/20 text-amber-700" :
                                "bg-primary/10 text-primary"
                              }`}>
                                {index < 3 ? (
                                  <span className="text-lg">{index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}</span>
                                ) : (
                                  getInitials(employee.name)
                                )}
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
                          <TableCell className="font-medium">{invoice.id}</TableCell>
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
