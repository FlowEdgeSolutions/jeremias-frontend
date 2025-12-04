import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

import {
  PencilSquareIcon,
  InboxIcon,
  StarIcon,
  PaperAirplaneIcon,
  ArchiveBoxIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowUturnLeftIcon,
  PaperClipIcon,
  UserPlusIcon,
  EnvelopeIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  Cog6ToothIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
  EllipsisHorizontalIcon,
  ArrowUturnRightIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

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
  account_email?: string;
}

interface EmailAccount {
  id: string;
  email: string;
  is_primary: boolean;
  type?: "gmail" | "microsoft"; // Account type
}

export const EmailsPage = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [filteredEmails, setFilteredEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAccountsDialog, setShowAccountsDialog] = useState(false);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [replyForm, setReplyForm] = useState({ body: "" });
  const [forwardForm, setForwardForm] = useState({ to: "", body: "", cc: "", bcc: "" });
  const [gmailAccounts, setGmailAccounts] = useState<EmailAccount[]>([]);
  const [microsoftAccounts, setMicrosoftAccounts] = useState<EmailAccount[]>([]);
  const [allAccounts, setAllAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedAccountType, setSelectedAccountType] = useState<"gmail" | "microsoft" | null>(null);
  const [composeForm, setComposeForm] = useState({
    to: "",
    subject: "",
    body: "",
    accountId: "",
  });
  const [createForm, setCreateForm] = useState({
    type: "lead" as "lead" | "customer",
    stage: "LEAD_LIST" as string,
    segment: "ENDKUNDE" as string,
    email: "",
    firstName: "",
    lastName: "",
    companyName: "",
  });

  useEffect(() => {
    checkConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
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
      // Check Gmail connection
      const gmailResponse = await fetch("http://127.0.0.1:8080/api/gmail/connection-status", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("jeremia_token")}`,
        },
      });
      const gmailData = await gmailResponse.json();
      const gmailAccs = (gmailData.accounts || []).map((acc: EmailAccount) => ({ ...acc, type: "gmail" as const }));
      setGmailAccounts(gmailAccs);
      
      // Check Microsoft Mail connection
      const microsoftResponse = await fetch("http://127.0.0.1:8080/api/microsoft-mail/connection-status", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("jeremia_token")}`,
        },
      });
      const microsoftData = await microsoftResponse.json();
      const microsoftAccs = (microsoftData.accounts || []).map((acc: EmailAccount) => ({ ...acc, type: "microsoft" as const }));
      setMicrosoftAccounts(microsoftAccs);
      
      // Combine all accounts
      const combined = [...gmailAccs, ...microsoftAccs];
      setAllAccounts(combined);
      setIsConnected(gmailData.is_connected || microsoftData.is_connected);
      
      // Set default account
      const primaryAccount = combined.find((acc: EmailAccount) => acc.is_primary);
      if (primaryAccount) {
        setSelectedAccountId(primaryAccount.id);
        setSelectedAccountType(primaryAccount.type || "gmail");
      } else if (combined.length > 0) {
        setSelectedAccountId(combined[0].id);
        setSelectedAccountType(combined[0].type || "gmail");
      }
      
      if (gmailData.is_connected || microsoftData.is_connected) {
        loadEmails();
      }
    } catch (error) {
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const loadEmails = async (accountId?: string, accountType?: "gmail" | "microsoft") => {
    try {
      setLoading(true);
      const type = accountType || selectedAccountType || "gmail";
      const baseUrl = type === "microsoft" ? "/api/microsoft-mail" : "/api/gmail";
      
      let url = `${baseUrl}/emails`;
      if (type === "gmail" && accountId) {
        url += `?account_id=${accountId}`;
      }
      
      const response = await fetch(`http://127.0.0.1:8080${url}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("jeremia_token")}`,
        },
      });
      const data = await response.json();
      setEmails(data.emails || []);
      setFilteredEmails(data.emails || []);
    } catch (error) {
      toast.error("Fehler beim Laden der E-Mails");
    } finally {
      setLoading(false);
    }
  };

  const loadEmailDetails = async (emailId: string) => {
    try {
      const type = selectedAccountType || "gmail";
      const baseUrl = type === "microsoft" ? "/api/microsoft-mail" : "/api/gmail";
      
      let url = `${baseUrl}/emails/${emailId}`;
      if (type === "gmail" && selectedAccountId) {
        url += `?account_id=${selectedAccountId}`;
      }
      
      const response = await fetch(`http://127.0.0.1:8080${url}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("jeremia_token")}`,
        },
      });
      const data = await response.json();
      setSelectedEmail(data);
      
      if (!data.is_read) {
        await fetch(`http://127.0.0.1:8080${baseUrl}/emails/${emailId}/mark-read`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("jeremia_token")}`,
          },
        });
        setEmails(emails.map(e => e.id === emailId ? { ...e, is_read: true } : e));
      }
    } catch (error) {
      toast.error("Fehler beim Laden der E-Mail");
    }
  };

  const connectGmail = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8080/api/gmail/auth-url", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("jeremia_token")}`,
        },
      });
      const data = await response.json();
      window.location.href = data.auth_url;
    } catch (error) {
      toast.error("Gmail-Verbindung fehlgeschlagen");
    }
  };

  const setAccountAsPrimary = async (accountId: string) => {
    try {
      await fetch(`http://127.0.0.1:8080/api/gmail/accounts/${accountId}/set-primary`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("jeremia_token")}` },
      });
      setGmailAccounts(accounts => accounts.map(acc => ({ ...acc, is_primary: acc.id === accountId })));
      toast.success("Primäres Konto geändert");
    } catch (error) {
      toast.error("Fehler");
    }
  };

  const disconnectAccount = async (accountId: string) => {
    try {
      await fetch(`http://127.0.0.1:8080/api/gmail/accounts/${accountId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("jeremia_token")}` },
      });
      await checkConnection();
      toast.success("Gmail-Konto getrennt");
    } catch (error) {
      toast.error("Fehler");
    }
  };

  const switchAccount = (accountId: string) => {
    setSelectedAccountId(accountId);
    setSelectedEmail(null);
    loadEmails(accountId);
  };

  const handleSendEmail = async () => {
    try {
      if (!composeForm.to || !composeForm.subject) {
        toast.error("Bitte fülle Empfänger und Betreff aus");
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
          account_id: composeForm.accountId || selectedAccountId,
        }),
      });
      if (!response.ok) throw new Error("Fehler");
      toast.success("E-Mail gesendet!");
      setShowComposeDialog(false);
      setComposeForm({ to: "", subject: "", body: "", accountId: "" });
      loadEmails();
    } catch (error) {
      toast.error("Fehler beim Senden");
    }
  };

  const handleCreateLead = async () => {
    try {
      if (!createForm.email || !createForm.firstName || !createForm.lastName) {
        toast.error("Bitte fülle alle Pflichtfelder aus");
        return;
      }
      const response = await fetch("http://127.0.0.1:8080/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("jeremia_token")}`,
        },
        body: JSON.stringify({
          email: createForm.email,
          first_name: createForm.firstName,
          last_name: createForm.lastName,
          company_name: createForm.companyName || "",
          segment: createForm.segment,
          stage: createForm.stage,
        }),
      });
      if (!response.ok) throw new Error("Fehler");
      toast.success("Lead angelegt!");
      setShowCreateDialog(false);
      setCreateForm({ type: "lead", stage: "LEAD_LIST", segment: "ENDKUNDE", email: "", firstName: "", lastName: "", companyName: "" });
    } catch (error) {
      toast.error("Fehler beim Anlegen");
    }
  };

  const prefillFromEmail = () => {
    if (selectedEmail) {
      const nameParts = selectedEmail.from_name.split(" ");
      setCreateForm({
        ...createForm,
        email: selectedEmail.from,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
      });
      setShowCreateDialog(true);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", {
      month: "long",
      day: "2-digit",
      year: "numeric",
    }) + ", " + date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-orange-500", "bg-teal-500", "bg-blue-500", "bg-purple-600",
      "bg-rose-500", "bg-emerald-500", "bg-indigo-500", "bg-cyan-500",
      "bg-amber-500", "bg-pink-500", "bg-violet-500", "bg-lime-600",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getCurrentAccountEmail = () => {
    const account = allAccounts.find(acc => acc.id === selectedAccountId);
    return account?.email || "";
  };

  const unreadCount = emails.filter(e => !e.is_read).length;

  // Loading
  if (loading && !isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  // Not connected
  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Card className="w-[420px]">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center mb-3">
              <EnvelopeIcon className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-xl">Gmail verbinden</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Verbinde dein Gmail-Konto, um E-Mails direkt in Jeremias zu verwalten und Kunden-Korrespondenz zu organisieren.
            </p>
            <div className="bg-muted/50 rounded-lg p-3 text-left text-xs space-y-1">
              <p className="font-medium text-sm mb-2">Nach der Verbindung kannst du:</p>
              <p className="text-muted-foreground">✓ E-Mails lesen und senden</p>
              <p className="text-muted-foreground">✓ Kontakte als Leads anlegen</p>
              <p className="text-muted-foreground">✓ Mehrere Gmail-Konten verwalten</p>
              <p className="text-muted-foreground">✓ Verbindung bleibt dauerhaft gespeichert</p>
            </div>
            <Button onClick={connectGmail} className="w-full bg-teal-600 hover:bg-teal-700">
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Mit Google verbinden
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex bg-background overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-[200px] bg-card border-r border-border flex flex-col overflow-hidden">
        {/* User Info */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-semibold text-xs">
              {getInitials(getCurrentAccountEmail().split('@')[0] || "U")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{getCurrentAccountEmail().split('@')[0]}</p>
              <p className="text-[10px] text-muted-foreground truncate">{getCurrentAccountEmail()}</p>
            </div>
          </div>
        </div>

        {/* Compose Button */}
        <div className="p-2">
          <Button 
            onClick={() => setShowComposeDialog(true)} 
            className="w-full bg-teal-600 hover:bg-teal-700 text-white h-8 gap-2 text-sm"
          >
            <PencilSquareIcon className="h-4 w-4" />
            Verfassen
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <nav className="px-2 space-y-0.5">
            <button className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 font-medium">
              <div className="flex items-center gap-2">
                <InboxIcon className="h-4 w-4" />
                <span>Posteingang</span>
              </div>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-teal-600 text-white px-1.5 py-0.5 rounded">{unreadCount}</span>
              )}
            </button>
            
            <button className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted">
              <div className="flex items-center gap-2">
                <StarIcon className="h-4 w-4" />
                <span>Markiert</span>
              </div>
            </button>
            
            <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted">
              <PaperAirplaneIcon className="h-4 w-4" />
              <span>Gesendet</span>
            </button>
            
            <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted">
              <DocumentTextIcon className="h-4 w-4" />
              <span>Entwürfe</span>
            </button>
            
            <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted">
              <ArchiveBoxIcon className="h-4 w-4" />
              <span>Archiv</span>
            </button>
            
            <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted">
              <TrashIcon className="h-4 w-4" />
              <span>Papierkorb</span>
            </button>
          </nav>

          {/* Labels Section */}
          <div className="px-2 mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Labels</span>
              <button className="p-0.5 hover:bg-muted rounded">
                <PlusIcon className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-0.5">
              <button className="w-full flex items-center gap-2 px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span>Kunden</span>
              </button>
              <button className="w-full flex items-center gap-2 px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span>Projekte</span>
              </button>
              <button className="w-full flex items-center gap-2 px-2 py-1 rounded text-xs text-muted-foreground hover:bg-muted">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span>Anfragen</span>
              </button>
            </div>
          </div>
        </ScrollArea>

        {/* Bottom Actions */}
        <div className="p-2 border-t border-border space-y-1">
          <button 
            onClick={() => setShowAccountsDialog(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted"
          >
            <Cog6ToothIcon className="h-5 w-5" />
            <span>Einstellungen</span>
          </button>
        </div>
      </div>

      {/* Email List */}
      <div className="w-[280px] border-r border-border flex flex-col bg-card overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <h2 className="font-semibold text-sm">Posteingang</h2>
              <ChevronDownIcon className="h-3 w-3 text-muted-foreground" />
            </div>
            <button onClick={() => loadEmails(selectedAccountId || undefined)} className="p-1 hover:bg-muted rounded" title="Aktualisieren">
              <ArrowUturnLeftIcon className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mb-2">{filteredEmails.length} Nachrichten</p>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-7 text-xs bg-muted/50 border-0"
            />
          </div>
        </div>

        {/* Email List */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-600 mx-auto"></div>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <InboxIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Keine E-Mails</p>
            </div>
          ) : (
            <div>
              {filteredEmails.map((email) => (
                <button
                  key={email.id}
                  onClick={() => loadEmailDetails(email.id)}
                  className={`w-full text-left px-3 py-2 hover:bg-muted/50 border-b border-border transition-colors ${
                    selectedEmail?.id === email.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex gap-2">
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full ${getAvatarColor(email.from_name)} flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0`}>
                      {getInitials(email.from_name)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span 
                          className={`text-xs ${!email.is_read ? "font-semibold text-foreground" : "text-gray-600 dark:text-gray-400"}`}
                          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: '130px' }}
                        >
                          {email.from_name}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 flex-shrink-0">{formatTime(email.date)}</span>
                      </div>
                      <p 
                        className={`text-xs ${!email.is_read ? "font-medium text-foreground" : "text-gray-600 dark:text-gray-400"}`}
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
                      >
                        {email.subject || "(Kein Betreff)"}
                      </p>
                      <p 
                        className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5"
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
                      >
                        {email.snippet}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Email Detail */}
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        {selectedEmail ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <Button onClick={prefillFromEmail} size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700">
                  <UserPlusIcon className="h-4 w-4" />
                  Als Lead anlegen
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1.5"
                  onClick={() => {
                    setReplyForm({ body: "" });
                    setShowReplyDialog(true);
                  }}
                >
                  <ArrowUturnLeftIcon className="h-4 w-4" />
                  Antworten
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1.5"
                  onClick={() => {
                    setForwardForm({ to: "", body: "", cc: "", bcc: "" });
                    setShowForwardDialog(true);
                  }}
                >
                  <ArrowUturnRightIcon className="h-4 w-4" />
                  Weiterleiten
                </Button>
                <div className="w-px h-6 bg-border mx-1"></div>
                <button 
                  className="p-2 hover:bg-muted rounded-lg" 
                  title="Archivieren"
                  onClick={async () => {
                    if (!selectedEmail) return;
                    try {
                      const type = selectedAccountType || "gmail";
                      const baseUrl = type === "microsoft" ? "/api/microsoft-mail" : "/api/gmail";
                      const res = await fetch(`http://127.0.0.1:8080${baseUrl}/emails/${selectedEmail.id}/archive`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${localStorage.getItem("jeremia_token")}` },
                      });
                      if (!res.ok) throw new Error();
                      toast.success("E-Mail archiviert");
                      setSelectedEmail(null);
                      loadEmails(selectedAccountId || undefined, selectedAccountType || undefined);
                    } catch {
                      toast.error("Fehler beim Archivieren");
                    }
                  }}
                >
                  <ArchiveBoxIcon className="h-4 w-4 text-muted-foreground" />
                </button>
                <button 
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" 
                  title="Löschen"
                  onClick={async () => {
                    if (!selectedEmail) return;
                    try {
                      const type = selectedAccountType || "gmail";
                      const baseUrl = type === "microsoft" ? "/api/microsoft-mail" : "/api/gmail";
                      const res = await fetch(`http://127.0.0.1:8080${baseUrl}/emails/${selectedEmail.id}/trash`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${localStorage.getItem("jeremia_token")}` },
                      });
                      if (!res.ok) throw new Error();
                      toast.success("E-Mail gelöscht");
                      setSelectedEmail(null);
                      loadEmails(selectedAccountId || undefined, selectedAccountType || undefined);
                    } catch {
                      toast.error("Fehler beim Löschen");
                    }
                  }}
                >
                  <TrashIcon className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                </button>
                <button 
                  className="p-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg" 
                  title="Mit Stern markieren"
                  onClick={async () => {
                    if (!selectedEmail) return;
                    const isStarred = selectedEmail.labels?.includes('STARRED');
                    try {
                      const res = await fetch(`http://127.0.0.1:8080/api/gmail/emails/${selectedEmail.id}/${isStarred ? 'unstar' : 'star'}`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${localStorage.getItem("jeremia_token")}` },
                      });
                      if (!res.ok) throw new Error();
                      toast.success(isStarred ? "Markierung entfernt" : "E-Mail markiert");
                      // Update local state
                      setSelectedEmail({
                        ...selectedEmail,
                        labels: isStarred 
                          ? selectedEmail.labels.filter(l => l !== 'STARRED')
                          : [...(selectedEmail.labels || []), 'STARRED']
                      });
                    } catch {
                      toast.error("Fehler beim Markieren");
                    }
                  }}
                >
                  {selectedEmail?.labels?.includes('STARRED') 
                    ? <StarIconSolid className="h-4 w-4 text-amber-500" />
                    : <StarIcon className="h-4 w-4 text-muted-foreground hover:text-amber-500" />
                  }
                </button>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>1 von {filteredEmails.length}</span>
                <button className="p-1 hover:bg-muted rounded">←</button>
                <button className="p-1 hover:bg-muted rounded">→</button>
              </div>
            </div>

            {/* Email Content */}
            <ScrollArea className="flex-1 overflow-auto">
              <div className="p-4">
                {/* Date & Subject */}
                <p className="text-xs text-muted-foreground mb-1">{formatFullDate(selectedEmail.date)}</p>
                <h1 className="text-lg font-semibold mb-4">{selectedEmail.subject || "(Kein Betreff)"}</h1>

                {/* Message Card */}
                <div className="bg-card border border-border rounded-lg p-4">
                  {/* Sender Info */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex gap-2">
                      <div className={`w-9 h-9 rounded-full ${getAvatarColor(selectedEmail.from_name)} flex items-center justify-center text-white text-sm font-semibold`}>
                        {getInitials(selectedEmail.from_name)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{selectedEmail.from_name}</p>
                        <p className="text-xs text-muted-foreground">{selectedEmail.from}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatTime(selectedEmail.date)}</span>
                  </div>

                  {/* To field */}
                  <div className="flex items-center gap-2 mb-3 text-xs">
                    <span className="text-muted-foreground">An</span>
                    <div className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full">
                      <span className="text-xs">Ich</span>
                    </div>
                  </div>

                  {/* Email Body */}
                  <div className="prose prose-sm max-w-none dark:prose-invert text-sm">
                    <div dangerouslySetInnerHTML={{ __html: selectedEmail.body_html || selectedEmail.body_text.replace(/\n/g, '<br/>') }} />
                  </div>

                  {/* Attachments */}
                  {selectedEmail.has_attachments && selectedEmail.attachments.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-border">
                      <p className="text-xs font-medium mb-2">Anhänge ({selectedEmail.attachments.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedEmail.attachments.map((att) => (
                          <div key={att.id} className="flex items-center gap-2 px-2 py-1.5 bg-muted rounded text-xs hover:bg-muted/80 cursor-pointer">
                            <PaperClipIcon className="h-4 w-4 text-red-500" />
                            <span className="truncate max-w-[150px]">{att.filename}</span>
                            <span className="text-muted-foreground text-xs">{formatFileSize(att.size)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <EnvelopeIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Wähle eine E-Mail aus der Liste</p>
            </div>
          </div>
        )}
      </div>

      {/* Compose Dialog */}
      <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Neue E-Mail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {allAccounts.length > 1 && (
              <div className="space-y-2">
                <Label>Von</Label>
                <Select value={composeForm.accountId || selectedAccountId || ""} onValueChange={(v) => setComposeForm({ ...composeForm, accountId: v })}>
                  <SelectTrigger><SelectValue placeholder="Absender" /></SelectTrigger>
                  <SelectContent>
                    {allAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.email} {acc.type === "microsoft" && "(Microsoft)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>An *</Label>
              <Input type="email" value={composeForm.to} onChange={(e) => setComposeForm({ ...composeForm, to: e.target.value })} placeholder="empfaenger@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Betreff *</Label>
              <Input value={composeForm.subject} onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })} placeholder="Betreff" />
            </div>
            <div className="space-y-2">
              <Label>Nachricht</Label>
              <textarea value={composeForm.body} onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })} placeholder="Nachricht..." className="w-full min-h-[200px] p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 bg-background" />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={() => setShowComposeDialog(false)} variant="outline" className="flex-1">Abbrechen</Button>
              <Button onClick={handleSendEmail} className="flex-1 bg-teal-600 hover:bg-teal-700">Senden</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Lead Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lead anlegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>E-Mail *</Label>
              <Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vorname *</Label>
                <Input value={createForm.firstName} onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nachname *</Label>
                <Input value={createForm.lastName} onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Firma</Label>
              <Input value={createForm.companyName} onChange={(e) => setCreateForm({ ...createForm, companyName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Segment</Label>
              <Select value={createForm.segment} onValueChange={(v) => setCreateForm({ ...createForm, segment: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENDKUNDE">Endkunde</SelectItem>
                  <SelectItem value="ENERGIEBERATER">Energieberater</SelectItem>
                  <SelectItem value="HEIZUNGSBAUER">Heizungsbauer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={() => setShowCreateDialog(false)} variant="outline" className="flex-1">Abbrechen</Button>
              <Button onClick={handleCreateLead} className="flex-1 bg-teal-600 hover:bg-teal-700">Anlegen</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={showReplyDialog} onOpenChange={setShowReplyDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Antworten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>An</Label>
              <Input 
                value={selectedEmail?.from || ""} 
                disabled 
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Betreff</Label>
              <Input 
                value={selectedEmail?.subject?.startsWith("Re:") ? selectedEmail.subject : `Re: ${selectedEmail?.subject || ""}`} 
                disabled 
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Nachricht</Label>
              <textarea 
                value={replyForm.body} 
                onChange={(e) => setReplyForm({ ...replyForm, body: e.target.value })} 
                placeholder="Nachricht..." 
                className="w-full min-h-[200px] p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 bg-background" 
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={() => setShowReplyDialog(false)} variant="outline" className="flex-1">Abbrechen</Button>
              <Button 
                onClick={async () => {
                  if (!selectedEmail || !replyForm.body.trim()) {
                    toast.error("Bitte gib eine Nachricht ein");
                    return;
                  }
                  try {
                    const type = selectedAccountType || "gmail";
                    const baseUrl = type === "microsoft" ? "/api/microsoft-mail" : "/api/gmail";
                    const accountIdParam = type === "gmail" && selectedAccountId ? `?account_id=${selectedAccountId}` : "";
                    const res = await fetch(`http://127.0.0.1:8080${baseUrl}/emails/${selectedEmail.id}/reply${accountIdParam}`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("jeremia_token")}`,
                      },
                      body: JSON.stringify({
                        body: replyForm.body,
                        account_id: selectedAccountId,
                      }),
                    });
                    if (!res.ok) throw new Error();
                    toast.success("Antwort gesendet!");
                    setShowReplyDialog(false);
                    setReplyForm({ body: "" });
                    loadEmails(selectedAccountId || undefined, selectedAccountType || undefined);
                  } catch {
                    toast.error("Fehler beim Senden der Antwort");
                  }
                }} 
                className="flex-1 bg-teal-600 hover:bg-teal-700"
              >
                Senden
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Forward Dialog */}
      <Dialog open={showForwardDialog} onOpenChange={setShowForwardDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Weiterleiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {allAccounts.length > 1 && (
              <div className="space-y-2">
                <Label>Von</Label>
                <Select value={selectedAccountId || ""} onValueChange={(v) => setSelectedAccountId(v)}>
                  <SelectTrigger><SelectValue placeholder="Absender" /></SelectTrigger>
                  <SelectContent>
                    {allAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.email} {acc.type === "microsoft" && "(Microsoft)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>An *</Label>
              <Input 
                type="email" 
                value={forwardForm.to} 
                onChange={(e) => setForwardForm({ ...forwardForm, to: e.target.value })} 
                placeholder="empfaenger@example.com" 
              />
            </div>
            <div className="space-y-2">
              <Label>CC</Label>
              <Input 
                type="email" 
                value={forwardForm.cc} 
                onChange={(e) => setForwardForm({ ...forwardForm, cc: e.target.value })} 
                placeholder="cc@example.com" 
              />
            </div>
            <div className="space-y-2">
              <Label>BCC</Label>
              <Input 
                type="email" 
                value={forwardForm.bcc} 
                onChange={(e) => setForwardForm({ ...forwardForm, bcc: e.target.value })} 
                placeholder="bcc@example.com" 
              />
            </div>
            <div className="space-y-2">
              <Label>Betreff</Label>
              <Input 
                value={selectedEmail?.subject?.startsWith("Fwd:") ? selectedEmail.subject : `Fwd: ${selectedEmail?.subject || ""}`} 
                disabled 
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Nachricht</Label>
              <textarea 
                value={forwardForm.body} 
                onChange={(e) => setForwardForm({ ...forwardForm, body: e.target.value })} 
                placeholder="Nachricht..." 
                className="w-full min-h-[200px] p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 bg-background" 
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={() => setShowForwardDialog(false)} variant="outline" className="flex-1">Abbrechen</Button>
              <Button 
                onClick={async () => {
                  if (!selectedEmail || !forwardForm.to.trim()) {
                    toast.error("Bitte gib einen Empfänger ein");
                    return;
                  }
                  try {
                    const type = selectedAccountType || "gmail";
                    const baseUrl = type === "microsoft" ? "/api/microsoft-mail" : "/api/gmail";
                    const accountIdParam = type === "gmail" && selectedAccountId ? `?account_id=${selectedAccountId}` : "";
                    const res = await fetch(`http://127.0.0.1:8080${baseUrl}/emails/${selectedEmail.id}/forward${accountIdParam}`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("jeremia_token")}`,
                      },
                      body: JSON.stringify({
                        to: forwardForm.to,
                        body: forwardForm.body,
                        cc: forwardForm.cc || undefined,
                        bcc: forwardForm.bcc || undefined,
                        account_id: selectedAccountId,
                      }),
                    });
                    if (!res.ok) throw new Error();
                    toast.success("Weiterleitung gesendet!");
                    setShowForwardDialog(false);
                    setForwardForm({ to: "", body: "", cc: "", bcc: "" });
                    loadEmails(selectedAccountId || undefined, selectedAccountType || undefined);
                  } catch {
                    toast.error("Fehler beim Senden der Weiterleitung");
                  }
                }} 
                className="flex-1 bg-teal-600 hover:bg-teal-700"
              >
                Senden
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Accounts Dialog */}
      <Dialog open={showAccountsDialog} onOpenChange={setShowAccountsDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>E-Mail-Konten verwalten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Microsoft Mail Account */}
            {microsoftAccounts.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Microsoft Mail</h3>
                {microsoftAccounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${getAvatarColor(account.email.split('@')[0])} flex items-center justify-center text-white text-sm font-semibold`}>
                        {getInitials(account.email.split('@')[0])}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{account.email}</p>
                        <p className="text-xs text-muted-foreground">Microsoft Mail</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Microsoft
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            
            {/* Gmail Accounts */}
            {gmailAccounts.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Gmail Konten</h3>
                {gmailAccounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${getAvatarColor(account.email)} flex items-center justify-center text-white font-semibold`}>
                    {getInitials(account.email.split('@')[0])}
                  </div>
                  <div>
                    <p className="font-medium">{account.email}</p>
                    {account.is_primary && <Badge variant="secondary" className="text-xs">Primär</Badge>}
                  </div>
                </div>
                <div className="flex gap-1">
                  {!account.is_primary && (
                    <Button onClick={() => setAccountAsPrimary(account.id)} variant="ghost" size="sm">
                      <CheckIcon className="h-4 w-4" />
                    </Button>
                  )}
                  <Button onClick={() => disconnectAccount(account.id)} variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
                ))}
                <Button onClick={connectGmail} className="w-full bg-teal-600 hover:bg-teal-700">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Weiteres Gmail-Konto verbinden
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
