import { useEffect, useState } from "react";
import { projectToolsApi, projectsApi, sevdeskApi } from "@/lib/apiClient";
import type { Project } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type ContactCategory = {
  id: string | null;
  name?: string;
};

export const SettingsPage = () => {
  const [categories, setCategories] = useState<ContactCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projectNumber, setProjectNumber] = useState("");
  const [projectLookupLoading, setProjectLookupLoading] = useState(false);
  const [projectUpdateLoading, setProjectUpdateLoading] = useState(false);
  const [projectInfo, setProjectInfo] = useState<Project | null>(null);

  const formatErrorMessage = (error: unknown) => {
    const err = error as { status?: number; message?: string };
    const message = err?.message || "Unbekannter Fehler";
    const status = typeof err?.status === "number" && err.status > 0 ? ` (HTTP ${err.status})` : "";
    return `Fehler${status}: ${message}`;
  };

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await sevdeskApi.listContactCategories();
      setCategories(data);
    } catch (error: unknown) {
      toast.error(formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const lookupProject = async () => {
    const id = projectId.trim();
    if (!id) {
      toast.error("Bitte Projekt-ID eingeben.");
      return;
    }
    try {
      setProjectLookupLoading(true);
      const project = await projectsApi.getProject(id);
      setProjectInfo(project);
      setProjectNumber(project.project_number || "");
      toast.success("Projekt geladen.");
    } catch (error: unknown) {
      setProjectInfo(null);
      toast.error(formatErrorMessage(error));
    } finally {
      setProjectLookupLoading(false);
    }
  };

  const updateProjectNumber = async () => {
    const id = projectId.trim();
    const newNumber = projectNumber.trim();
    if (!id) {
      toast.error("Bitte Projekt-ID eingeben.");
      return;
    }
    if (!newNumber) {
      toast.error("Bitte eine neue Projektnummer eingeben.");
      return;
    }
    try {
      setProjectUpdateLoading(true);
      const updated = await projectToolsApi.setProjectNumber(id, newNumber);
      setProjectInfo(updated);
      toast.success(`Projektnummer gesetzt: ${updated.project_number || newNumber}`);
    } catch (error: unknown) {
      toast.error(formatErrorMessage(error));
    } finally {
      setProjectUpdateLoading(false);
    }
  };

  const handleCreate = async () => {
    const name = categoryName.trim();
    if (!name) {
      toast.error("Bitte einen Kategorienamen eingeben.");
      return;
    }
    try {
      setCreating(true);
      const created = await sevdeskApi.createContactCategory(name);
      toast.success(`Kategorie erstellt: ${created.name || name}`);
      setCategoryName("");
      await loadCategories();
    } catch (error: unknown) {
      toast.error(formatErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Einstellungen</h2>
        <p className="text-muted-foreground">
          Sevdesk-Integration verwalten und Kategorien f&uuml;r Kontakte anlegen.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projekt-Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="project-id">Projekt-ID</Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                id="project-id"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="UUID (z.B. f32736e2-...)"
              />
              <Button variant="outline" onClick={lookupProject} disabled={projectLookupLoading}>
                {projectLookupLoading ? "Lade..." : "Laden"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-number">Projektnummer</Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                id="project-number"
                value={projectNumber}
                onChange={(e) => setProjectNumber(e.target.value)}
                placeholder="z.B. 9500"
              />
              <Button onClick={updateProjectNumber} disabled={projectUpdateLoading}>
                {projectUpdateLoading ? "Speichere..." : "Speichern"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              &Auml;ndert die Projektnummer (nur Admin/Sales). Muss eindeutig sein.
            </p>
          </div>

          {projectInfo && (
            <div className="rounded-md border p-4 text-sm">
              <div className="text-muted-foreground">Aktuelles Projekt</div>
              <div className="mt-1 font-medium text-foreground">
                {projectInfo.product_name || projectInfo.productName} ({projectInfo.project_number || "-"})
              </div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">{projectInfo.id}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sevdesk Kontakt-Kategorien</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="sevdesk-category-name">Neue Kategorie</Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                id="sevdesk-category-name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="z.B. Jeremias Kunden"
              />
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? "Erstelle..." : "Erstellen"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Die ID der Kategorie kannst du anschliessend als
              <span className="font-mono"> SEVDESK_CONTACT_CATEGORY_ID </span>
              hinterlegen.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Vorhandene Kategorien</h3>
              <Button variant="outline" size="sm" onClick={loadCategories} disabled={loading}>
                {loading ? "Lade..." : "Aktualisieren"}
              </Button>
            </div>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        Lade Kategorien...
                      </TableCell>
                    </TableRow>
                  ) : categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        Keine Kategorien gefunden.
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map((category, index) => (
                      <TableRow key={`${category.id || "missing"}-${index}`}>
                        <TableCell>{category.name || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{category.id || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
