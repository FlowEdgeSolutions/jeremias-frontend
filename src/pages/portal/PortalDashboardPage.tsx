import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/common";
import { FolderKanban, Receipt, ShoppingCart, TrendingUp, Loader2 } from "lucide-react";
import { customerPortalApi, CustomerStats } from "@/lib/apiClient";

export const PortalDashboardPage = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const statsData = await customerPortalApi.getStats();
      setStats(statsData);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError("Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  };

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
          value={stats?.projects_count ?? 0}
          icon={FolderKanban}
          description="Projekte in Bearbeitung"
        />
        <StatCard
          title="Offene Rechnungen"
          value={stats?.unpaid_invoices_count ?? 0}
          icon={Receipt}
          description={`${(stats?.total_amount ?? 0).toLocaleString("de-DE")} € ausstehend`}
        />
        <StatCard
          title="Gesamtprojekte"
          value={stats?.projects_count ?? 0}
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
