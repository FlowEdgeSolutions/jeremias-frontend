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

    if (!window.confirm("Projekt wirklich loeschen?")) {
      return;
    }

    try {
      await apiClient.projects.deleteProject(projectId);
      setProjects((prev) => prev.filter((project) => project.id !== projectId));
      toast.success("Projekt geloescht");
    } catch (error: unknown) {
      const err = error as any;
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      if (err?.status === 403) {
        toast.error("Zugriff verweigert. Du brauchst die Rolle 'admin' oder 'sales' zum Löschen.");
      } else {
        toast.error("Fehler beim Loeschen: " + message);
      }
    }
  };

  const filteredProjects = projects.filter((project) => {
    // Project members see only their projects
    if (currentUser?.role === "project_member") {
      return project.assigned_user_ids?.includes(currentUser.id) || false;
    }
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

  const kanbanColumns = [
    { id: "NEU", title: "Neu", items: filteredProjects.filter(p => p.status === "NEU") },
    { id: "IN_BEARBEITUNG", title: "In Bearbeitung", items: filteredProjects.filter(p => p.status === "IN_BEARBEITUNG") },
    { id: "PROBLEM", title: "Problem", items: filteredProjects.filter(p => p.status === "PROBLEM") },
    { id: "FERTIGGESTELLT", title: "Fertiggestellt", items: filteredProjects.filter(p => p.status === "FERTIGGESTELLT") },
    { id: "REVISION", title: "Revision", items: filteredProjects.filter(p => p.status === "REVISION") },
  ];

  const renderProjectCard = (project: Project) => {
    const assignedUsers = users.filter(u => project.assigned_user_ids?.includes(u.id));
    
    return (
      <Card 
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => navigate(`/app/projects/${project.id}`)}
      >
        <CardContent className="p-4">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground">{project.product_name}</h4>
                <div className="flex items-center gap-2">
                  {project.project_number && (
                    <span className="text-xs text-muted-foreground">{project.project_number}</span>
                  )}
                  {currentUser?.role && ["admin", "sales"].includes(currentUser.role) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={(event) => handleDeleteProject(event, project.id)}
                      title="Projekt loeschen"
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
      <div className="flex items-center justify-between">
        {currentUser?.role === "admin" && (
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Filter nach Mitarbeiter:</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[240px]">
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
        
        <Button onClick={() => navigate("/app/projects/new")} className="ml-auto">
          <Plus className="h-4 w-4 mr-2" />
          Neues Projekt
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {kanbanColumns.map((column) => (
          <div key={column.id} className="flex-shrink-0 w-80">
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
