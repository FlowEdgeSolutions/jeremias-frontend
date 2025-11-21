import { useState, useEffect } from "react";
import { Project } from "@/types";
import { apiClient } from "@/api/mockApiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export const QualityPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const data = await apiClient.getProjects();
    setProjects(data);
  };

  const handleApprove = async (projectId: string) => {
    // TODO: Replace with actual API call
    await apiClient.updateProjectStatus(projectId, "FERTIGGESTELLT", "APPROVED");
    toast.success("Projekt freigegeben!");
    loadProjects();
  };

  const handleReject = async (projectId: string) => {
    // TODO: Replace with actual API call
    await apiClient.updateProjectStatus(projectId, "REVISION", "REJECTED");
    toast.info("Projekt zurück in Revision geschickt");
    loadProjects();
  };

  const pendingProjects = projects.filter(p => p.qcStatus === "PENDING");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Qualitätskontrolle</h2>
        <p className="text-muted-foreground">
          {pendingProjects.length} {pendingProjects.length === 1 ? "Projekt wartet" : "Projekte warten"} auf Freigabe
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pendingProjects.map((project) => (
          <Card key={project.id}>
            <CardHeader>
              <CardTitle className="text-lg">{project.productName}</CardTitle>
              <p className="text-sm text-muted-foreground">{project.customerName}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Produktcode:</span>
                  <Badge variant="secondary">{project.productCode}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline">{project.status}</Badge>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                  onClick={() => handleApprove(project.id)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Freigeben
                </Button>
                <Button
                  className="flex-1"
                  variant="destructive"
                  onClick={() => handleReject(project.id)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Revision
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {pendingProjects.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-4" />
              <h3 className="text-lg font-semibold mb-2">Alle Projekte freigegeben!</h3>
              <p className="text-muted-foreground">
                Aktuell gibt es keine Projekte, die auf Qualitätskontrolle warten.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
