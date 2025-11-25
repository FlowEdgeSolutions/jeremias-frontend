import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Inbox, RefreshCw, Paperclip, ExternalLink, Search, UserPlus, X, ChevronLeft, ChevronRight, Menu, Reply, Plus, Edit2, Star } from "lucide-react";
import { toast } from "sonner";

interface Email {
  id: string;
  thread_id: string;
  subject: string;
  from: string;
  from_name: string;
  to: string;
  date: string;
  snippet: string;
  is_read: boolean;
  has_attachments: boolean;
  labels: string[];
}

interface EmailDetail {
  id: string;
  thread_id: string;
  subject: string;
  from: string;
  from_name: string;
  to: string;
  cc: string[];
  bcc: string[];
  date: string;
  body_html: string;
  body_text: string;
  is_read: boolean;
  has_attachments: boolean;
  attachments: Array<{
    id: string;
    filename: string;
    mime_type: string;
    size: number;
  }>;
  labels: string[];
}

interface Signature {
  id: string;
  name: string;
  content: string;
  isDefault?: boolean;
}

export const EmailsPage = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [filteredEmails, setFilteredEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [oauthUrl, setOauthUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showEmailList, setShowEmailList] = useState(true);
  const [showEmailDetail, setShowEmailDetail] = useState(true);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [selectedSignatureId, setSelectedSignatureId] = useState<string>("");
  const [newSignature, setNewSignature] = useState({ name: "", content: "" });
  const [createForm, setCreateForm] = useState({
    type: "lead" as "lead" | "customer",
    stage: "LEAD_LIST" as string,
    segment: "ENDKUNDE" as string,
    email: "",
    firstName: "",
    lastName: "",
    companyName: "",
  });
  const [composeForm, setComposeForm] = useState({
    to: "",
    subject: "",
    body: "",
  });

  const loadSignatures = () => {
    const saved = localStorage.getItem("email_signatures");
    if (saved) {
      setSignatures(JSON.parse(saved));
    }
  };

  const saveSignature = () => {
    if (!newSignature.name.trim() || !newSignature.content.trim()) {
      toast.error("Bitte Name und Signatur ausfüllen");
      return;
    }

    const signature: Signature = {
      id: Date.now().toString(),
      name: newSignature.name,
      content: newSignature.content,
      isDefault: signatures.length === 0, // First signature is default
    };

    const updated = [...signatures, signature];
    setSignatures(updated);
    localStorage.setItem("email_signatures", JSON.stringify(updated));
    
    setNewSignature({ name: "", content: "" });
    setShowSignatureDialog(false);
    toast.success("Signatur gespeichert!");
  };

  const deleteSignature = (id: string) => {
    const updated = signatures.filter(s => s.id !== id);
    setSignatures(updated);
    localStorage.setItem("email_signatures", JSON.stringify(updated));
    toast.success("Signatur gelöscht");
  };

  const setDefaultSignature = (id: string) => {
    const updated = signatures.map(s => ({
      ...s,
      isDefault: s.id === id,
    }));
    setSignatures(updated);
    localStorage.setItem("email_signatures", JSON.stringify(updated));
    toast.success("Standard-Signatur gesetzt");
  };

  const insertSignature = () => {
    if (!selectedSignatureId) return;
    
    const signature = signatures.find(s => s.id === selectedSignatureId);
    if (signature) {
      setComposeForm({
        ...composeForm,
        body: composeForm.body + "\n\n" + signature.content,
      });
    }
  };

  useEffect(() => {
    checkConnection();
    loadSignatures();
  }, []);

  useEffect(() => {
    // Filter emails based on search query
    if (searchQuery.trim() === "") {
      setFilteredEmails(emails);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredEmails(
        emails.filter(
          (email) =>
            email.subject.toLowerCase().includes(query) ||
            email.from_name.toLowerCase().includes(query) ||
            email.from.toLowerCase().includes(query) ||
            email.snippet.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, emails]);

  const checkConnection = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8080/api/gmail/connection-status", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("jeremia_token")}`,
        },
      });
      const data = await response.json();
      setIsConnected(data.is_connected);
      setOauthUrl(data.oauth_url);
      
      if (data.is_connected) {
        loadEmails();
      }
    } catch (error) {
      // Gmail-Server nicht erreichbar - still fail
      setIsConnected(false);
      console.log("Gmail-Server nicht verfügbar auf Port 8080");
    } finally {
      setLoading(false);
    }
  };

  const loadEmails = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://127.0.0.1:8080/api/gmail/emails", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("jeremia_token")}`,
        },
      });
      const data = await response.json();
      setEmails(data.emails);
      setFilteredEmails(data.emails);
    } catch (error) {
      toast.error("Fehler beim Laden der E-Mails");
    } finally {
      setLoading(false);
    }
  };

  const loadEmailDetails = async (emailId: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:8080/api/gmail/emails/${emailId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("jeremia_token")}`,
        },
      });
      const data = await response.json();
      setSelectedEmail(data);
      
      // Mark as read
      if (!data.is_read) {
        await fetch(`http://127.0.0.1:8080/api/gmail/emails/${emailId}/mark-read`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("jeremia_token")}`,
          },
        });
        // Update local state
        setEmails(emails.map(e => e.id === emailId ? { ...e, is_read: true } : e));
      }
    } catch (error) {
      toast.error("Fehler beim Laden der E-Mail");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `vor ${diffMins}m`;
    if (diffHours < 24) return `vor ${diffHours}h`;
    if (diffDays < 7) return `vor ${diffDays}d`;
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const connectGmail = async () => {
    try {
      // Get OAuth URL from backend
      const response = await fetch("http://127.0.0.1:8080/api/gmail/auth-url", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("jeremia_token")}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Fehler beim Abrufen der Auth-URL");
      }
      
      const data = await response.json();
      
      // Redirect to Google OAuth
      window.location.href = data.auth_url;
    } catch (error) {
      toast.error("Gmail-Server nicht erreichbar. Bitte starte den Server auf Port 8080.");
      console.error(error);
    }
  };

  const handleCreateLeadOrCustomer = async () => {
    try {
      if (!createForm.email || !createForm.firstName || !createForm.lastName) {
        toast.error("Bitte fülle alle Pflichtfelder aus");
        return;
      }

      const payload = {
        email: createForm.email,
        first_name: createForm.firstName,
        last_name: createForm.lastName,
        company_name: createForm.companyName || "",
        segment: createForm.segment,
        stage: createForm.stage,
      };

      console.log("Creating lead with payload:", payload);

      const response = await fetch("http://127.0.0.1:8080/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("jeremia_token")}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error creating lead:", errorData);
        throw new Error(errorData.detail || "Fehler beim Anlegen");
      }

      const result = await response.json();
      console.log("Lead created successfully:", result);

      toast.success(`${createForm.type === "lead" ? "Lead" : "Kunde"} erfolgreich angelegt!`);
      setShowCreateDialog(false);
      setCreateForm({
        type: "lead",
        stage: "LEAD_LIST",
        segment: "ENDKUNDE",
        email: "",
        firstName: "",
        lastName: "",
        companyName: "",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Fehler beim Anlegen";
      toast.error(errorMessage);
      console.error("Create lead error:", error);
    }
  };

  const prefillFromEmail = () => {
    if (selectedEmail) {
      const nameParts = selectedEmail.from_name.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      
      setCreateForm({
        ...createForm,
        email: selectedEmail.from,
        firstName: firstName,
        lastName: lastName,
      });
      setShowCreateDialog(true);
    }
  };

  const handleSendEmail = async () => {
    try {
      if (!composeForm.to || !composeForm.subject) {
        toast.error("Bitte f\u00fclle Empf\u00e4nger und Betreff aus");
        return;
      }

      const response = await fetch("http://127.0.0.1:8080/api/gmail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("jeremia_token")}`,
        },
        body: JSON.stringify({
          to: composeForm.to,
          subject: composeForm.subject,
          body: composeForm.body,
        }),
      });

      if (!response.ok) {
        throw new Error("Fehler beim Senden");
      }

      toast.success("E-Mail erfolgreich gesendet!");
      setShowComposeDialog(false);
      setShowReplyBox(false);
      setComposeForm({
        to: "",
        subject: "",
        body: "",
      });
    } catch (error) {
      toast.error("Fehler beim Senden der E-Mail");
      console.error(error);
    }
  };

  const replyToEmail = () => {
    if (selectedEmail) {
      const quotedText = selectedEmail.body_text.split("\n").join("\n> ");
      const defaultSig = signatures.find(s => s.isDefault);
      const replyBody = `

---
Am ${new Date(selectedEmail.date).toLocaleString("de-DE")} schrieb ${selectedEmail.from_name}:
> ${quotedText}`;
      
      setComposeForm({
        to: selectedEmail.from,
        subject: selectedEmail.subject.startsWith("Re: ") 
          ? selectedEmail.subject 
          : `Re: ${selectedEmail.subject}`,
        body: defaultSig ? replyBody + "\n\n" + defaultSig.content : replyBody,
      });
      if (defaultSig) {
        setSelectedSignatureId(defaultSig.id);
      }
      setShowReplyBox(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Lade E-Mails...</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Gmail verbinden
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Verbinde dein Gmail-Konto, um E-Mails direkt in Jeremias zu verwalten.
            </p>
            <Button onClick={connectGmail} className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              Mit Google verbinden
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-64 bg-white border-r flex flex-col">
          <div className="p-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Mail className="h-6 w-6 text-red-500" />
                <h1 className="text-xl font-bold">Mailbox</h1>
              </div>
              <Button
                onClick={() => setShowSidebar(false)}
                size="icon"
                variant="ghost"
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
            
            <Button onClick={() => setShowComposeDialog(true)} className="w-full mb-6 bg-emerald-500 hover:bg-emerald-600">
              <Mail className="h-4 w-4 mr-2" />
              Neue Nachricht
            </Button>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700">
                <div className="flex items-center gap-2">
                  <Inbox className="h-4 w-4" />
                  <span className="text-sm font-medium">Inbox</span>
                </div>
                {emails.length > 0 && (
                  <Badge className="bg-emerald-600">{emails.filter(e => !e.is_read).length}</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Toggle Sidebar Button (when hidden) */}
      {!showSidebar && (
        <div className="w-12 bg-white border-r flex items-start justify-center pt-4">
          <Button
            onClick={() => setShowSidebar(true)}
            size="icon"
            variant="ghost"
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Email List */}
      {showEmailList && (
        <div className="w-96 bg-white border-r flex flex-col">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-gray-100 border-0"
              />
            </div>
            <Button
              onClick={() => setShowEmailList(false)}
              size="icon"
              variant="ghost"
              className="h-8 w-8 ml-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          {filteredEmails.map((email) => {
            const initials = email.from_name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            
            const colors = [
              "bg-blue-500",
              "bg-green-500",
              "bg-purple-500",
              "bg-pink-500",
              "bg-yellow-500",
              "bg-red-500",
            ];
            const colorIndex = email.from.charCodeAt(0) % colors.length;

            return (
              <div
                key={email.id}
                onClick={() => loadEmailDetails(email.id)}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedEmail?.id === email.id ? "bg-gray-100" : ""
                }`}
              >
                <div className="flex gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold ${colors[colorIndex]}`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <p className={`text-sm truncate ${
                        !email.is_read ? "font-bold" : "font-medium"
                      }`}>
                        {email.from_name}
                      </p>
                      <span className="text-xs text-gray-500 ml-2">{formatDate(email.date)}</span>
                    </div>
                    <p className="text-sm text-gray-600 truncate mb-1">{email.subject}</p>
                    <p className="text-xs text-gray-400 line-clamp-1">{email.snippet}</p>
                    {!email.is_read && (
                      <Badge className="mt-1 h-5 bg-emerald-600">1</Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </ScrollArea>
        </div>
      )}
      
      {/* Toggle Email List Button (when hidden) */}
      {!showEmailList && (
        <div className="w-12 bg-white border-r flex items-start justify-center pt-4">
          <Button
            onClick={() => setShowEmailList(true)}
            size="icon"
            variant="ghost"
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Email Detail */}
      {showEmailDetail && selectedEmail && (
      <div className="flex-1 bg-white">
        {selectedEmail ? (
          <div className="h-full flex flex-col">
            <div className="p-6 border-b">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">
                    {new Date(selectedEmail.date).toLocaleDateString("de-DE", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <h2 className="text-2xl font-bold">{selectedEmail.subject}</h2>
                </div>
                <div className="flex gap-2">
                  <Button onClick={prefillFromEmail} size="sm" className="bg-emerald-500 hover:bg-emerald-600">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Lead/Kunde anlegen
                  </Button>
                  <Button
                    onClick={() => setShowEmailDetail(false)}
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                  {selectedEmail.from_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold">{selectedEmail.from_name}</p>
                  <p className="text-sm text-gray-500">{selectedEmail.from}</p>
                </div>
              </div>
              
              {selectedEmail.has_attachments && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Anhänge:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedEmail.attachments.map((att) => (
                      <Badge key={att.id} variant="outline" className="flex items-center gap-1">
                        <Paperclip className="h-3 w-3" />
                        {att.filename}
                        <span className="text-muted-foreground">({formatFileSize(att.size)})</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <ScrollArea className="flex-1 p-6">
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedEmail.body_html || selectedEmail.body_text }}
              />
              
              {!showReplyBox && (
                <div className="mt-6 pt-6 border-t">
                  <Button onClick={replyToEmail} variant="outline" className="w-full">
                    <Reply className="h-4 w-4 mr-2" />
                    Antworten
                  </Button>
                </div>
              )}
              
              {showReplyBox && (
                <div className="mt-6 pt-6 border-t space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Antwort verfassen</h3>
                    <Button onClick={() => setShowReplyBox(false)} variant="ghost" size="sm">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm">An</Label>
                      <Input
                        type="email"
                        value={composeForm.to}
                        onChange={(e) => setComposeForm({ ...composeForm, to: e.target.value })}
                        placeholder="empfaenger@example.com"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm">Betreff</Label>
                      <Input
                        value={composeForm.subject}
                        onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                        placeholder="Betreff"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm">Nachricht</Label>
                      <textarea
                        className="w-full min-h-[200px] p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={composeForm.body}
                        onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })}
                        placeholder="Deine Nachricht..."
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm">Signatur</Label>
                      <div className="flex gap-2">
                        <Select value={selectedSignatureId} onValueChange={setSelectedSignatureId}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Signatur wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {signatures.map((sig) => (
                              <SelectItem key={sig.id} value={sig.id}>
                                {sig.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button onClick={insertSignature} variant="outline" size="sm" disabled={!selectedSignatureId}>
                          Einfügen
                        </Button>
                        <Button onClick={() => setShowSignatureDialog(true)} variant="outline" size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button onClick={() => setShowReplyBox(false)} variant="outline" className="flex-1">
                        Abbrechen
                      </Button>
                      <Button onClick={handleSendEmail} className="flex-1 bg-emerald-500 hover:bg-emerald-600">
                        <Mail className="h-4 w-4 mr-2" />
                        Senden
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Mail className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p>Wähle eine E-Mail aus, um sie anzuzeigen</p>
            </div>
          </div>
        )}
      </div>
      )}
      
      {/* Toggle Email Detail Button (when hidden) */}
      {!showEmailDetail && selectedEmail && (
        <div className="w-12 bg-white flex items-start justify-center pt-4">
          <Button
            onClick={() => setShowEmailDetail(true)}
            size="icon"
            variant="ghost"
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Create Lead/Customer Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lead/Kunde anlegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>E-Mail *</Label>
              <Input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vorname *</Label>
                <Input
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                  placeholder="Max"
                />
              </div>
              <div className="space-y-2">
                <Label>Nachname *</Label>
                <Input
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                  placeholder="Mustermann"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Firma</Label>
              <Input
                value={createForm.companyName}
                onChange={(e) => setCreateForm({ ...createForm, companyName: e.target.value })}
                placeholder="Firma GmbH"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Segment *</Label>
              <Select value={createForm.segment} onValueChange={(value) => setCreateForm({ ...createForm, segment: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENDKUNDE">Endkunde</SelectItem>
                  <SelectItem value="ENERGIEBERATER">Energieberater</SelectItem>
                  <SelectItem value="HEIZUNGSBAUER">Heizungsbauer</SelectItem>
                  <SelectItem value="HANDWERKER_KOOPERATION">Handwerker Kooperation</SelectItem>
                  <SelectItem value="PROJEKTGESCHAEFT">Projektgeschäft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Phase *</Label>
              <Select value={createForm.stage} onValueChange={(value) => setCreateForm({ ...createForm, stage: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEAD_LIST">Lead Liste</SelectItem>
                  <SelectItem value="FOLLOW_UP">Follow-Up</SelectItem>
                  <SelectItem value="PRE_STAGE">Pre-Stage</SelectItem>
                  <SelectItem value="STAGE">Stage</SelectItem>
                  <SelectItem value="KUNDE">Kunde</SelectItem>
                  <SelectItem value="BESTANDSKUNDE">Bestandskunde</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button onClick={() => setShowCreateDialog(false)} variant="outline" className="flex-1">
                Abbrechen
              </Button>
              <Button onClick={handleCreateLeadOrCustomer} className="flex-1 bg-emerald-500 hover:bg-emerald-600">
                Anlegen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Compose Email Dialog */}
      <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Neue E-Mail verfassen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>An *</Label>
              <Input
                type="email"
                value={composeForm.to}
                onChange={(e) => setComposeForm({ ...composeForm, to: e.target.value })}
                placeholder="empfaenger@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Betreff *</Label>
              <Input
                value={composeForm.subject}
                onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                placeholder="E-Mail-Betreff"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Nachricht</Label>
              <textarea
                value={composeForm.body}
                onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })}
                placeholder="Schreibe deine Nachricht..."
                className="w-full min-h-[200px] p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Signatur</Label>
              <div className="flex gap-2">
                <Select value={selectedSignatureId} onValueChange={setSelectedSignatureId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Signatur wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {signatures.map((sig) => (
                      <SelectItem key={sig.id} value={sig.id}>
                        {sig.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={insertSignature} variant="outline" size="sm" disabled={!selectedSignatureId}>
                  Einfügen
                </Button>
                <Button onClick={() => setShowSignatureDialog(true)} variant="outline" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button onClick={() => setShowComposeDialog(false)} variant="outline" className="flex-1">
                Abbrechen
              </Button>
              <Button onClick={handleSendEmail} className="flex-1 bg-emerald-500 hover:bg-emerald-600">
                <Mail className="h-4 w-4 mr-2" />
                Senden
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Management Dialog */}
      <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Signaturen verwalten</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Add New Signature */}
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
              <h3 className="font-semibold">Neue Signatur erstellen</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={newSignature.name}
                    onChange={(e) => setNewSignature({ ...newSignature, name: e.target.value })}
                    placeholder="z.B. Geschäftlich, Privat, Support..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Signatur *</Label>
                  <textarea
                    value={newSignature.content}
                    onChange={(e) => setNewSignature({ ...newSignature, content: e.target.value })}
                    placeholder="Mit freundlichen Grüßen,\nMax Mustermann\nTelefon: +49 123 456789"
                    className="w-full min-h-[120px] p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <Button onClick={saveSignature} className="w-full bg-emerald-500 hover:bg-emerald-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Signatur speichern
                </Button>
              </div>
            </div>
            
            {/* Existing Signatures */}
            <div className="space-y-3">
              <h3 className="font-semibold">Gespeicherte Signaturen</h3>
              {signatures.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">Noch keine Signaturen vorhanden</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {signatures.map((sig) => (
                    <div key={sig.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1">
                          <Button 
                            onClick={() => setDefaultSignature(sig.id)} 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            title={sig.isDefault ? "Standard-Signatur" : "Als Standard setzen"}
                          >
                            <Star className={`h-4 w-4 ${sig.isDefault ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                          </Button>
                          <p className="font-medium">{sig.name}</p>
                          {sig.isDefault && (
                            <Badge variant="secondary" className="text-xs">Standard</Badge>
                          )}
                        </div>
                        <Button onClick={() => deleteSignature(sig.id)} variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans">{sig.content}</pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end pt-4">
              <Button onClick={() => setShowSignatureDialog(false)} variant="outline">
                Schließen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
