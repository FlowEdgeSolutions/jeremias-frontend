import { useState, useEffect } from "react";
import { Invoice, InvoiceStatus } from "@/types";
import { apiClient } from "@/api/mockApiClient";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Euro, TrendingUp, AlertCircle, FileText } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const statusLabels: Record<InvoiceStatus, string> = {
  DRAFT: "Entwurf",
  SENT: "Versendet",
  PAID: "Bezahlt",
  OVERDUE: "Überfällig",
};

const statusColors: Record<InvoiceStatus, string> = {
  DRAFT: "secondary",
  SENT: "outline",
  PAID: "default",
  OVERDUE: "destructive",
};

export const FinancePage = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    const data = await apiClient.getInvoices();
    setInvoices(data);
  };

  const totalRevenue = invoices
    .filter(inv => inv.status === "PAID")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const openAmount = invoices
    .filter(inv => inv.status === "SENT" || inv.status === "OVERDUE")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const openCount = invoices.filter(inv => inv.status === "SENT" || inv.status === "OVERDUE").length;

  const overdueCount = invoices.filter(inv => inv.status === "OVERDUE").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Gesamtumsatz"
          value={`${totalRevenue.toLocaleString("de-DE")} €`}
          icon={Euro}
          description="Alle bezahlten Rechnungen"
        />
        <StatCard
          title="Offene Summe"
          value={`${openAmount.toLocaleString("de-DE")} €`}
          icon={TrendingUp}
          description="Ausstehende Zahlungen"
        />
        <StatCard
          title="Offene Rechnungen"
          value={openCount}
          icon={FileText}
          description="Noch nicht bezahlt"
        />
        <StatCard
          title="Überfällige Rechnungen"
          value={overdueCount}
          icon={AlertCircle}
          description="Zahlungserinnerung nötig"
        />
      </div>

      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Rechnungsnr.</TableHead>
              <TableHead className="whitespace-nowrap">Kunde</TableHead>
              <TableHead className="whitespace-nowrap">Projekt</TableHead>
              <TableHead className="text-right whitespace-nowrap">Betrag</TableHead>
              <TableHead className="whitespace-nowrap">Status</TableHead>
              <TableHead className="whitespace-nowrap">Fälligkeitsdatum</TableHead>
              <TableHead className="whitespace-nowrap">Bezahlt am</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium whitespace-nowrap">{invoice.id}</TableCell>
                <TableCell className="whitespace-nowrap">{invoice.customerId}</TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {invoice.projectId || "-"}
                </TableCell>
                <TableCell className="text-right font-medium whitespace-nowrap">
                  {invoice.amount.toLocaleString("de-DE")} €
                </TableCell>
                <TableCell>
                  <Badge variant={statusColors[invoice.status] as any}>
                    {statusLabels[invoice.status]}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {format(invoice.dueDate, "dd.MM.yyyy", { locale: de })}
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {invoice.paidAt ? format(invoice.paidAt, "dd.MM.yyyy", { locale: de }) : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
