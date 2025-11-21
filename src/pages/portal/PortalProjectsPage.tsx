import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Project, ProjectStatus } from "@/types";
import { apiClient } from "@/api/mockApiClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KanbanBoard } from "@/components/KanbanBoard";
import { format } from "date-fns";
import { de } from "date-fns/locale";

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
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const data = await apiClient.getProjects();
    // TODO: Filter by current customer
    setProjects(data);
  };

  const kanbanColumns = [
    { id: "IN_BEARBEITUNG", title: "In Bearbeitung", items: projects.filter(p => p.status === "IN_BEARBEITUNG") },
    { id: "REVISION", title: "Revision", items: projects.filter(p => p.status === "REVISION") },
    { id: "FERTIGGESTELLT", title: "Fertiggestellt", items: projects.filter(p => p.status === "FERTIGGESTELLT") },
    { id: "PROBLEM", title: "Problem", items: projects.filter(p => p.status === "PROBLEM") },
  ];

  const renderProjectCard = (project: Project) => (
    <Link to={`/portal/projects/${project.id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-foreground">{project.productName}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {format(project.updatedAt, "dd.MM.yyyy", { locale: de })}
              </p>
            </div>
            
            <Badge className={statusColors[project.status]}>
              {statusLabels[project.status]}
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

      <KanbanBoard columns={kanbanColumns} renderCard={renderProjectCard} />
    </div>
  );
};
