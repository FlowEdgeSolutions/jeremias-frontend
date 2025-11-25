import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Project, ProjectStatus, User } from "@/types";
import { apiClient } from "@/api/mockApiClient";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    const [projectsData, usersData] = await Promise.all([
      apiClient.getProjects(),
      apiClient.getUsers(),
    ]);
    setProjects(projectsData);
    setUsers(usersData.filter(u => u.role !== "customer"));
  };

  const filteredProjects = projects.filter((project) => {
    // Project members see only their projects
    if (currentUser?.role === "project_member") {
      return project.assignedUserIds.includes(currentUser.id);
    }
    // Filter by selected user
    if (selectedUserId !== "ALL") {
      return project.assignedUserIds.includes(selectedUserId);
    }
    return true;
  });

  const kanbanColumns = [
    { id: "IN_BEARBEITUNG", title: "In Bearbeitung", items: filteredProjects.filter(p => p.status === "IN_BEARBEITUNG") },
    { id: "REVISION", title: "Revision", items: filteredProjects.filter(p => p.status === "REVISION") },
    { id: "FERTIGGESTELLT", title: "Fertiggestellt", items: filteredProjects.filter(p => p.status === "FERTIGGESTELLT") },
    { id: "PROBLEM", title: "Problem", items: filteredProjects.filter(p => p.status === "PROBLEM") },
  ];

  const renderProjectCard = (project: Project) => {
    const assignedUsers = users.filter(u => project.assignedUserIds.includes(u.id));
    
    return (
      <Card 
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => navigate(`/app/projects/${project.id}`)}
      >
        <CardContent className="p-4">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground">{project.productName}</h4>
                {project.project_number && (
                  <span className="text-xs text-muted-foreground">{project.project_number}</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {project.customerName}
              </p>
              {project.credits && (
                <p className="text-xs font-medium text-primary mt-1">
                  {project.credits} Credits
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
