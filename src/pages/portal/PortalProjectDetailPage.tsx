import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Project, Message } from "@/types";
import { apiClient } from "@/api/mockApiClient";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { FileText, Send } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";

export const PortalProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (id) {
      loadProjectData(id);
    }
  }, [id]);

  const loadProjectData = async (projectId: string) => {
    const projects = await apiClient.getProjects();
    const foundProject = projects.find(p => p.id === projectId);
    setProject(foundProject || null);

    const messagesData = await apiClient.getMessages(projectId);
    setMessages(messagesData);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !project || !currentUser) return;

    // TODO: Replace with actual API call
    await apiClient.sendMessage(
      project.id,
      newMessage,
      "CUSTOMER",
      currentUser.name
    );

    toast.success("Nachricht gesendet!");
    setNewMessage("");
    loadProjectData(project.id);
  };

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Projekt nicht gefunden</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{project.productName}</h1>
        <p className="text-muted-foreground mt-2">Projekt-ID: {project.id}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Projektinformationen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Produktcode</p>
                <p className="font-medium">{project.productCode}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant="outline">{project.status}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Erstellt am</p>
                <p className="font-medium">
                  {format(project.createdAt, "dd.MM.yyyy", { locale: de })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Letztes Update</p>
                <p className="font-medium">
                  {format(project.updatedAt, "dd.MM.yyyy", { locale: de })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Projektdateien
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="text-sm text-muted-foreground">• Grundriss_V1.pdf</li>
              <li className="text-sm text-muted-foreground">• Schnitt_V1.pdf</li>
              <li className="text-sm text-muted-foreground">• 3D_Model.dwg</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projektnachrichten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-lg ${
                  message.senderType === "CUSTOMER"
                    ? "bg-primary/10 ml-12"
                    : "bg-muted mr-12"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{message.senderName}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(message.createdAt, "dd.MM.yyyy HH:mm", { locale: de })}
                  </span>
                </div>
                <p className="text-sm">{message.text}</p>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-2">
            <Textarea
              placeholder="Ihre Nachricht..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end">
              <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Nachricht senden
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
