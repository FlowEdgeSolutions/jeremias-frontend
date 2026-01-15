import { useState, useEffect } from "react";
import type { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Project, ProjectStatus, User } from "@/types";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const statusLabels: Record<ProjectStatus, string> = {
  NEU: "Neu",
  IN_BEARBEITUNG: "In Bearbeitung",
  REVISION: "Revision",
  FERTIGGESTELLT: "Fertiggestellt",
  ARCHIV: "Archiviert",
  PROBLEM: "Problem",
};

const statusColors: Record<ProjectStatus, string> = {
  NEU: "bg-primary text-primary-foreground",
  IN_BEARBEITUNG: "bg-info text-info-foreground",
  REVISION: "bg-warning text-warning-foreground",
  FERTIGGESTELLT: "bg-success text-success-foreground",
  ARCHIV: "bg-muted text-foreground",
  PROBLEM: "bg-destructive text-destructive-foreground",
};

export const ProjectsPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("ALL");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const projectsData = await apiClient.projects.getProjects();
      setProjects(projectsData);
      // TODO: Load users from API when endpoint is available
      setUsers([]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler beim Laden der Projekte: " + message);
    }
  };

  const handleDeleteProject = async (event: MouseEvent<HTMLButtonElement>, projectId: string) => {
    event.stopPropagation();

    if (!window.confirm("Projekt wirklich löschen?")) {
      return;
    }

    try {
      await apiClient.projects.deleteProject(projectId);
      setProjects((prev) => prev.filter((project) => project.id !== projectId));
      toast.success("Projekt gelöscht");
    } catch (error: unknown) {
      const err = error as any;
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      if (err?.status === 403) {
        toast.error("Zugriff verweigert. Du brauchst die Rolle 'admin' zum Löschen.");
      } else {
        toast.error("Fehler beim Löschen: " + message);
      }
    }
  };

  const filteredProjects = projects.filter((project) => {
    // Filter by selected user
    if (selectedUserId !== "ALL") {
      return project.assigned_user_ids?.includes(selectedUserId) || false;
    }
    return true;
  });

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

  const formatInvoiceDate = (date?: string) => {
    if (!date) return "-";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const kanbanColumns = [
    { id: "NEU", title: "Neu", items: filteredProjects.filter(p => p.status === "NEU") },
    { id: "IN_BEARBEITUNG", title: "In Bearbeitung", items: filteredProjects.filter(p => p.status === "IN_BEARBEITUNG") },
    { id: "PROBLEM", title: "Problem", items: filteredProjects.filter(p => p.status === "PROBLEM") },
    { id: "FERTIGGESTELLT", title: "Fertiggestellt", items: filteredProjects.filter(p => p.status === "FERTIGGESTELLT") },
    { id: "REVISION", title: "Revision", items: filteredProjects.filter(p => p.status === "REVISION") },
  ];

  const renderProjectCard = (project: Project) => {
    const assignedUsers = users.filter(u => project.assigned_user_ids?.includes(u.id));
    const invoicesCount = project.invoices_count ?? 0;
    const lastInvoiceDate = formatInvoiceDate(project.last_invoice_at);
    
    return (
      <Card 
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => navigate(`/app/projects/${project.id}`)}
      >
        <CardContent className="p-4">
          <div className="space-y-3">
            <div>
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-foreground min-w-0 truncate">{project.product_name}</h4>
                <div className="flex items-center gap-2 shrink-0">
                  {project.project_number && (
                    <span className="text-xs text-muted-foreground">{project.project_number}</span>
                  )}
                  {currentUser?.role === "admin" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={(event) => handleDeleteProject(event, project.id)}
                      title="Projekt löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Kunde #{project.customer_id.slice(0, 8)}
              </p>
              {project.credits && (
                <p className="text-xs font-medium text-primary mt-1">
                  {project.credits} Credits
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Bestellungen: {invoicesCount}
              </p>
              <p className="text-xs text-muted-foreground">
                Letzte Rechnung: {lastInvoiceDate}
              </p>
              {project.deadline && (
                <p className={`text-xs font-bold mt-1 ${getRemainingDaysColor(project.deadline)}`}>
                  ⏰ {getRemainingDaysText(project.deadline)}
                </p>
              )}
            </div>
            
            <Badge className={statusColors[project.status]}>
              {statusLabels[project.status]}
            </Badge>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {assignedUsers.map((user) => (
                  <Avatar key={user.id} className="h-7 w-7">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {currentUser?.role === "admin" && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <label className="text-sm font-medium">Filter nach Mitarbeiter:</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-full sm:w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Alle Mitarbeiter</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {currentUser?.role === "admin" && (
          <Button onClick={() => navigate("/app/projects/new")} className="w-full sm:w-auto sm:ml-auto">
            <Plus className="h-4 w-4 mr-2" />
            Neues Projekt
          </Button>
        )}
      </div>

      <div className="space-y-4 md:space-y-0 md:flex md:gap-4 md:overflow-x-auto md:pb-4">
        {kanbanColumns.map((column) => (
          <div key={column.id} className="w-full md:flex-shrink-0 md:w-80">
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold mb-4">{column.title} ({column.items.length})</h3>
              <div className="space-y-3">
                {column.items.map((project) => (
                  <div key={project.id}>
                    {renderProjectCard(project)}
                  </div>
                ))}
                {column.items.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">Keine Projekte</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
