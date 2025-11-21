import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { FolderKanban, Receipt, ShoppingCart, TrendingUp } from "lucide-react";
import { apiClient } from "@/api/mockApiClient";
import { Project, Invoice } from "@/types";

export const PortalDashboardPage = () => {
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [projectsData, invoicesData] = await Promise.all([
      apiClient.getProjects(),
      apiClient.getInvoices(),
    ]);
    // TODO: Filter by current customer
    setProjects(projectsData);
    setInvoices(invoicesData);
  };

  const openInvoices = invoices.filter(inv => inv.status === "SENT" || inv.status === "OVERDUE");
  const openAmount = openInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Willkommen, {currentUser?.name}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Hier finden Sie eine Übersicht über Ihre Projekte und Rechnungen
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Aktive Projekte"
          value={projects.length}
          icon={FolderKanban}
          description="Projekte in Bearbeitung"
        />
        <StatCard
          title="Offene Rechnungen"
          value={openInvoices.length}
          icon={Receipt}
          description={`${openAmount.toLocaleString("de-DE")} € ausstehend`}
        />
        <StatCard
          title="Gesamtprojekte"
          value={projects.length}
          icon={TrendingUp}
          description="Alle Ihre Projekte"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link to="/portal/orders/new">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Neue Bestellung
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Starten Sie eine neue Bestellung für Ihre Projekte
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link to="/portal/projects">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                Meine Projekte
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Sehen Sie den Status Ihrer laufenden Projekte
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link to="/portal/invoices">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Rechnungen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Verwalten Sie Ihre Rechnungen und Zahlungen
              </p>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
};
