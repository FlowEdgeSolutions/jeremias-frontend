import { Fragment, useEffect, useState } from "react";
import { customerPortalApi, CustomerInvoice } from "@/lib/apiClient";
import { API_CONFIG, TOKEN_KEY } from "@/config/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Download, FileText } from "lucide-react";
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
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);
  const [previewInvoiceUrl, setPreviewInvoiceUrl] = useState<string | null>(null);
  const [previewInvoiceLoading, setPreviewInvoiceLoading] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, []);

  useEffect(() => {
    return () => {
      if (previewInvoiceUrl) {
        URL.revokeObjectURL(previewInvoiceUrl);
      }
    };
  }, [previewInvoiceUrl]);

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


  const fetchInvoicePdfBlob = async (invoice: CustomerInvoice) => {
    if (!invoice.pdf_url) {
      throw new Error("No PDF URL");
    }
    const token = localStorage.getItem(TOKEN_KEY);
    const response = await fetch(`${API_CONFIG.BASE_URL}${invoice.pdf_url}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) {
      throw new Error("Download failed");
    }
    return response.blob();
  };

  const toggleInvoicePreview = async (invoice: CustomerInvoice) => {
    if (!invoice.pdf_url) {
      toast.error("Keine Sevdesk-Rechnung verfuegbar");
      return;
    }

    if (previewInvoiceId === invoice.id) {
      if (previewInvoiceUrl) {
        URL.revokeObjectURL(previewInvoiceUrl);
      }
      setPreviewInvoiceId(null);
      setPreviewInvoiceUrl(null);
      return;
    }

    setPreviewInvoiceId(invoice.id);
    setPreviewInvoiceLoading(true);

    if (previewInvoiceUrl) {
      URL.revokeObjectURL(previewInvoiceUrl);
      setPreviewInvoiceUrl(null);
    }

    try {
      const blob = await fetchInvoicePdfBlob(invoice);
      const url = window.URL.createObjectURL(blob);
      setPreviewInvoiceUrl(url);
    } catch (err) {
      console.error("Failed to open invoice PDF:", err);
      toast.error("Fehler beim Laden des PDFs");
      setPreviewInvoiceId(null);
    } finally {
      setPreviewInvoiceLoading(false);
    }
  };

  const downloadInvoicePdf = async (invoice: CustomerInvoice) => {
    if (!invoice.pdf_url) {
      toast.error("Keine Sevdesk-Rechnung verfuegbar");
      return;
    }

    try {
      const blob = await fetchInvoicePdfBlob(invoice);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Rechnung-${invoice.invoice_number || invoice.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download invoice PDF:", err);
      toast.error("Fehler beim Download");
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
                <Fragment key={invoice.id}>
                  <TableRow>
                    <TableCell className="font-medium whitespace-nowrap">
                      {invoice.invoice_number || `${invoice.id.slice(0, 8)}...`}
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
                      {invoice.pdf_url ? (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => toggleInvoicePreview(invoice)}>
                            <FileText className="h-4 w-4 mr-2" />
                            {previewInvoiceId === invoice.id ? "Schliessen" : "Ansehen"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => downloadInvoicePdf(invoice)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                  {previewInvoiceId === invoice.id && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/20">
                        {previewInvoiceLoading ? (
                          <div className="flex items-center justify-center py-10 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            PDF wird geladen...
                          </div>
                        ) : previewInvoiceUrl ? (
                          <div className="w-full h-[70vh]">
                            <iframe
                              title={`Rechnung ${invoice.invoice_number || invoice.id}`}
                              src={previewInvoiceUrl}
                              className="w-full h-full rounded-md border"
                            />
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground py-6 text-center">
                            PDF nicht verfuegbar
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
