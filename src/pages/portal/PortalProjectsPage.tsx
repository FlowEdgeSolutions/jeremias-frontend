import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { customerPortalApi, CustomerProject } from "@/lib/apiClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

type ProjectStatus = "IN_BEARBEITUNG" | "REVISION" | "FERTIGGESTELLT" | "PROBLEM";

const statusLabels: Record<ProjectStatus, string> = {
  IN_BEARBEITUNG: "In Bearbeitung",
  REVISION: "Revision",
  FERTIGGESTELLT: "Fertiggestellt",
  PROBLEM: "Problem",
};

const statusColors: Record<ProjectStatus, string> = {
  IN_BEARBEITUNG: "bg-info text-info-foreground",
  REVISION: "bg-warning text-warning-foreground",
  FERTIGGESTELLT: "bg-success text-success-foreground",
  PROBLEM: "bg-destructive text-destructive-foreground",
};

export const PortalProjectsPage = () => {
  const [projects, setProjects] = useState<CustomerProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await customerPortalApi.getProjects();
      setProjects(data);
    } catch (err) {
      console.error("Failed to load projects:", err);
      setError("Fehler beim Laden der Projekte");
    } finally {
      setLoading(false);
    }
  };

  const getProjectsByStatus = (status: ProjectStatus) => 
    projects.filter(p => p.status === status);

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

  const renderProjectCard = (project: CustomerProject) => (
    <Link to={`/portal/projects/${project.id}`} key={project.id}>
      <Card className="hover:shadow-md transition-shadow mb-3">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-foreground">{project.product_name}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(project.created_at), "dd.MM.yyyy", { locale: de })}
              </p>
            </div>
            
            <Badge className={statusColors[project.status as ProjectStatus]}>
              {statusLabels[project.status as ProjectStatus] || project.status}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Meine Projekte</h1>
        <p className="text-muted-foreground mt-2">
          Übersicht über alle Ihre laufenden und abgeschlossenen Projekte
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Keine Projekte vorhanden</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* In Bearbeitung */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              In Bearbeitung ({getProjectsByStatus("IN_BEARBEITUNG").length})
            </h3>
            <div className="bg-muted/30 rounded-lg p-2 min-h-[200px]">
              {getProjectsByStatus("IN_BEARBEITUNG").map(renderProjectCard)}
            </div>
          </div>

          {/* Revision */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Revision ({getProjectsByStatus("REVISION").length})
            </h3>
            <div className="bg-muted/30 rounded-lg p-2 min-h-[200px]">
              {getProjectsByStatus("REVISION").map(renderProjectCard)}
            </div>
          </div>

          {/* Fertiggestellt */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Fertiggestellt ({getProjectsByStatus("FERTIGGESTELLT").length})
            </h3>
            <div className="bg-muted/30 rounded-lg p-2 min-h-[200px]">
              {getProjectsByStatus("FERTIGGESTELLT").map(renderProjectCard)}
            </div>
          </div>

          {/* Problem */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Problem ({getProjectsByStatus("PROBLEM").length})
            </h3>
            <div className="bg-muted/30 rounded-lg p-2 min-h-[200px]">
              {getProjectsByStatus("PROBLEM").map(renderProjectCard)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
