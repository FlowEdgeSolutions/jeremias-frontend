import { useEffect, useState } from "react";
import { customerPortalApi, CustomerInvoice } from "@/lib/apiClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";
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
import { toast } from "sonner";

type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE";

const statusLabels: Record<InvoiceStatus, string> = {
  DRAFT: "Entwurf",
  SENT: "Offen",
  PAID: "Bezahlt",
  OVERDUE: "Überfällig",
};

const statusColors: Record<InvoiceStatus, "secondary" | "outline" | "default" | "destructive"> = {
  DRAFT: "secondary",
  SENT: "outline",
  PAID: "default",
  OVERDUE: "destructive",
};

export const PortalInvoicesPage = () => {
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await customerPortalApi.getInvoices();
      setInvoices(data);
    } catch (err) {
      console.error("Failed to load invoices:", err);
      setError("Fehler beim Laden der Rechnungen");
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (invoiceId: string) => {
    try {
      setPayingInvoiceId(invoiceId);
      const result = await customerPortalApi.createPaymentSession(invoiceId);
      // Redirect to Stripe checkout
      window.location.href = result.checkout_url;
    } catch (err) {
      console.error("Failed to create payment session:", err);
      toast.error("Fehler beim Erstellen der Zahlungssitzung");
      setPayingInvoiceId(null);
    }
  };

  const totalOpen = invoices
    .filter(inv => inv.status === "SENT" || inv.status === "OVERDUE")
    .reduce((sum, inv) => sum + inv.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

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

      {invoices.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Keine Rechnungen vorhanden</p>
        </div>
      ) : (
        <div className="border rounded-lg bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Rechnungsnr.</TableHead>
                <TableHead className="text-right whitespace-nowrap">Betrag</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
                <TableHead className="whitespace-nowrap">Fälligkeitsdatum</TableHead>
                <TableHead className="whitespace-nowrap">Bezahlt am</TableHead>
                <TableHead className="whitespace-nowrap">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {invoice.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap">
                    {invoice.amount.toLocaleString("de-DE")} {invoice.currency}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[invoice.status as InvoiceStatus]}>
                      {statusLabels[invoice.status as InvoiceStatus] || invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {invoice.due_date 
                      ? format(new Date(invoice.due_date), "dd.MM.yyyy", { locale: de })
                      : "-"
                    }
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {invoice.paid_at 
                      ? format(new Date(invoice.paid_at), "dd.MM.yyyy", { locale: de }) 
                      : "-"
                    }
                  </TableCell>
                  <TableCell>
                    {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
                      <Button 
                        size="sm" 
                        onClick={() => handlePay(invoice.id)}
                        disabled={payingInvoiceId === invoice.id}
                      >
                        {payingInvoiceId === invoice.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Bezahlen
                          </>
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
