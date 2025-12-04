import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { customerPortalApi, CustomerProject, messagesApi } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { FileText, Send, ArrowLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import { Message } from "@/types";

export const PortalProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const [project, setProject] = useState<CustomerProject | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadProjectData(id);
    }
  }, [id]);

  const loadProjectData = async (projectId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Load all projects and find the specific one
      const projects = await customerPortalApi.getProjects();
      const foundProject = projects.find(p => p.id === projectId);
      setProject(foundProject || null);

      // Load messages for this project
      try {
        const messagesData = await messagesApi.getMessages(projectId);
        setMessages(messagesData);
      } catch {
        // Messages might not exist yet
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to load project:", err);
      setError("Fehler beim Laden des Projekts");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !project || !currentUser) return;

    try {
      setSending(true);
      await messagesApi.createMessage(project.id, newMessage);
      toast.success("Nachricht gesendet!");
      setNewMessage("");
      
      // Reload messages
      const messagesData = await messagesApi.getMessages(project.id);
      setMessages(messagesData);
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Fehler beim Senden der Nachricht");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-4">
        <Link to="/portal/projects" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zu Projekten
        </Link>
        <div className="text-center py-12">
          <p className="text-muted-foreground">{error || "Projekt nicht gefunden"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/portal/projects" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">{project.product_name}</h1>
          <p className="text-muted-foreground mt-1">Projekt-ID: {project.id}</p>
        </div>
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
                <p className="font-medium">{project.product_code}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant="outline">{project.status}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">QC Status</p>
                <Badge variant="outline">{project.qc_status}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Erstellt am</p>
                <p className="font-medium">
                  {format(new Date(project.created_at), "dd.MM.yyyy", { locale: de })}
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
            <p className="text-sm text-muted-foreground">
              Keine Dateien verfügbar
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projektnachrichten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Noch keine Nachrichten
              </p>
            ) : (
              messages.map((message) => (
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
                      {format(new Date(message.createdAt), "dd.MM.yyyy HH:mm", { locale: de })}
                    </span>
                  </div>
                  <p className="text-sm">{message.text}</p>
                </div>
              ))
            )}
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
              <Button 
                onClick={handleSendMessage} 
                disabled={!newMessage.trim() || sending}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Nachricht senden
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
