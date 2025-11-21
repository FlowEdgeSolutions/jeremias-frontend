import { useEffect, useState } from "react";
import { Invoice, InvoiceStatus } from "@/types";
import { apiClient } from "@/api/mockApiClient";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const statusLabels: Record<InvoiceStatus, string> = {
  DRAFT: "Entwurf",
  SENT: "Offen",
  PAID: "Bezahlt",
  OVERDUE: "Überfällig",
};

const statusColors: Record<InvoiceStatus, string> = {
  DRAFT: "secondary",
  SENT: "outline",
  PAID: "default",
  OVERDUE: "destructive",
};

export const PortalInvoicesPage = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    const data = await apiClient.getInvoices();
    // TODO: Filter by current customer
    setInvoices(data);
  };

  const totalOpen = invoices
    .filter(inv => inv.status === "SENT" || inv.status === "OVERDUE")
    .reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Rechnungen</h1>
        <p className="text-muted-foreground mt-2">
          Übersicht über alle Ihre Rechnungen
        </p>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Offene Summe</p>
            <p className="text-3xl font-bold text-foreground mt-1">
              {totalOpen.toLocaleString("de-DE")} €
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {invoices.filter(inv => inv.status === "SENT" || inv.status === "OVERDUE").length} offen
          </Badge>
        </div>
      </div>

      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Rechnungsnr.</TableHead>
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
