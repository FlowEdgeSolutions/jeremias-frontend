import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Project } from "@/types";
import { projectsApi } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Archive } from "lucide-react";

const STATUS_LABELS = {
  IN_BEARBEITUNG: "In Bearbeitung",
  REVISION: "Revision",
  FERTIGGESTELLT: "Fertiggestellt",
  PROBLEM: "Problem",
};

const STATUS_COLORS = {
  IN_BEARBEITUNG: "bg-blue-500",
  REVISION: "bg-yellow-500",
  FERTIGGESTELLT: "bg-green-500",
  PROBLEM: "bg-red-500",
};

export const ArchivePage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await projectsApi.getArchivedProjects();
      setProjects(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler beim Laden: " + message);
    } finally {
      setLoading(false);
    }
  };

  const calculateRemainingDays = (deadline?: string) => {
    if (!deadline) return null;
    
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const getRemainingDaysColor = (deadline?: string) => {
    const days = calculateRemainingDays(deadline);
    if (days === null) return "text-muted-foreground";
    if (days < 0) return "text-red-600";
    if (days <= 3) return "text-red-600";
    if (days <= 5) return "text-yellow-600";
    return "text-green-600";
  };

  const getRemainingDaysText = (deadline?: string) => {
    const days = calculateRemainingDays(deadline);
    if (days === null) return null;
    if (days < 0) return `${Math.abs(days)} Tag${Math.abs(days) === 1 ? '' : 'e'} überfällig`;
    if (days === 0) return "Heute fällig";
    if (days === 1) return "Noch 1 Tag";
    return `Noch ${days} Tage`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Archive className="h-8 w-8 text-muted-foreground" />
        <div>
          <h2 className="text-2xl font-bold text-foreground">Archiv</h2>
          <p className="text-muted-foreground">
            {loading ? "Lade..." : `${projects.length} ${projects.length === 1 ? "Projekt" : "Projekte"} im Archiv`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Card 
            key={project.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/app/projects/${project.id}`)}
          >
            <CardHeader>
              <CardTitle className="text-lg">{project.product_name || project.productName}</CardTitle>
              <p className="text-sm text-muted-foreground">{project.customerName}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Produktcode:</span>
                  <Badge variant="secondary">{project.product_code || project.productCode}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={`${STATUS_COLORS[project.status]} text-white`}>
                    {STATUS_LABELS[project.status]}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Projektnummer:</span>
                  <Badge variant="secondary">{project.project_number || "-"}</Badge>
                </div>
                {project.deadline && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Frist:</span>
                    <span className={`text-xs font-bold ${getRemainingDaysColor(project.deadline)}`}>
                      {getRemainingDaysText(project.deadline)}
                    </span>
                  </div>
                )}
                {project.credits && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Credits:</span>
                    <span className="font-medium">{project.credits}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {projects.length === 0 && !loading && (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Archiv ist leer</h3>
              <p className="text-muted-foreground">
                Noch keine freigegebenen Projekte im Archiv.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
