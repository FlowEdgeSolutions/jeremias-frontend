import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Project } from "@/types";
import { qcApi } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ApprovalProgressDialog } from "@/components/common/ApprovalProgressDialog";
import { useApprovalProgress } from "@/hooks/useApprovalProgress";

export const QualityPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [qcActionLoadingId, setQcActionLoadingId] = useState<string | null>(null);
  const approvalProgress = useApprovalProgress();
  const navigate = useNavigate();

  const formatErrorMessage = (error: unknown) => {
    const err = error as { status?: number; message?: string };
    const message = err?.message || "Unbekannter Fehler";
    const status = typeof err?.status === "number" && err.status > 0 ? ` (HTTP ${err.status})` : "";
    return `Fehler${status}: ${message}`;
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await qcApi.getQcProjects("PENDING");
      setProjects(data);
    } catch (error: unknown) {
      toast.error("Fehler beim Laden: " + formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (projectId: string) => {
    try {
      if (!projectId || typeof projectId !== "string") {
        toast.error("Ungültige Projekt-ID");
        return;
      }
      setQcActionLoadingId(projectId);
      approvalProgress.start();
      const result = await qcApi.approveProject(projectId);
      toast.success("Projekt freigegeben!");
      if (!result.email_sent) {
        const detail = result.email_error ? ` ${result.email_error}` : "";
        toast.warning(`Rechnung erstellt, aber E-Mail nicht gesendet.${detail}`);
        approvalProgress.finishError(result.email_error || "E-Mail wurde nicht gesendet.");
      } else {
        approvalProgress.finishSuccess(true);
      }
      loadProjects();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      approvalProgress.finishError(message);
      toast.error(formatErrorMessage(error));
    } finally {
      setQcActionLoadingId(null);
    }
  };

  const handleReject = async (projectId: string) => {
    try {
      setQcActionLoadingId(projectId);
      await qcApi.rejectProject(projectId);
      toast.info("Projekt zurück in Revision geschickt");
      loadProjects();
    } catch (error: unknown) {
      toast.error(formatErrorMessage(error));
    } finally {
      setQcActionLoadingId(null);
    }
  };

  const pendingProjects = projects.filter(p => 
    (p.qc_status === "PENDING" || p.qcStatus === "PENDING") && 
    p.status === "FERTIGGESTELLT"
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Qualitätskontrolle</h2>
        <p className="text-muted-foreground">
          {loading ? "Lade..." : `${pendingProjects.length} ${pendingProjects.length === 1 ? "Projekt wartet" : "Projekte warten"} auf Freigabe`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pendingProjects.map((project) => (
          <Card key={project.id}>
            <CardHeader
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => {
                const pid = (project as any)?.id || (project as any)?.project_id || (project as any)?.projectId;
                if (!pid || typeof pid !== "string") {
                  toast.error("Ungültige Projekt-ID");
                  return;
                }
                navigate(`/app/projects/${pid}`);
              }}
            >
              <CardTitle className="text-lg text-primary hover:underline">{project.product_name || project.productName}</CardTitle>
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
                  <Badge variant="outline">{project.status}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Projektnummer:</span>
                  <Badge variant="secondary">{project.project_number || "-"}</Badge>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                  onClick={() => handleApprove(project.id)}
                  disabled={loading || qcActionLoadingId === project.id}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {qcActionLoadingId === project.id ? "Freigeben..." : "Freigeben"}
                </Button>
                <Button
                  className="flex-1"
                  variant="destructive"
                  onClick={() => handleReject(project.id)}
                  disabled={loading || qcActionLoadingId === project.id}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {qcActionLoadingId === project.id ? "Revision..." : "Revision"}
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

      <ApprovalProgressDialog
        open={approvalProgress.open}
        onOpenChange={approvalProgress.onOpenChange}
        title="Freigabe laeuft"
        description="Die Schritte werden nacheinander abgearbeitet."
        steps={approvalProgress.steps}
      />
    </div>
  );
};
