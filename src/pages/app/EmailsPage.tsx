/**
 * EmailsPage - Linear/Superhuman inspired Email Dashboard
 * 
 * Features:
 * - Clean left sidebar with navigation
 * - Compact email list with keyboard hints
 * - Generous detail area with CRM integration
 * - Teal accent color, Inter font
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { API_CONFIG, TOKEN_KEY } from "@/config/api";
import * as emailAccountsApi from "@/lib/emailAccountsApi";
import type { EmailAccount as UnifiedEmailAccount, EmailProvider } from "@/types";

import {
  InboxIcon,
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
  DocumentTextIcon,
  ArrowUturnRightIcon,
  StarIcon,
  ChevronRightIcon,
  CommandLineIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid, EnvelopeIcon as EnvelopeIconSolid } from "@heroicons/react/24/solid";

// ============= Types =============

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
  account_type?: "gmail" | "microsoft";
  account_email?: string;
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

interface EmailAccountLocal {
  id: string;
  email: string | null;
  display_name?: string | null;
  is_primary: boolean;
  type?: "gmail" | "microsoft";
  status?: string;
  needs_reauth?: boolean;
}

// ============= Component =============

export const EmailsPage = () => {
  // State
  const [emails, setEmails] = useState<Email[]>([]);
  const [filteredEmails, setFilteredEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [showCreateLeadDialog, setShowCreateLeadDialog] = useState(false);
  const [showAccountsDialog, setShowAccountsDialog] = useState(false);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [replyForm, setReplyForm] = useState({ body: "" });
  const [allAccounts, setAllAccounts] = useState<EmailAccountLocal[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedAccountType, setSelectedAccountType] = useState<"gmail" | "microsoft" | "all" | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>("INBOX");
  const [composeForm, setComposeForm] = useState({ to: "", subject: "", body: "", accountId: "" });
  const [createForm, setCreateForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    companyName: "",
    segment: "ENDKUNDE",
  });
  
  const emailListRef = useRef<HTMLDivElement>(null);

  // ============= Effects =============

  useEffect(() => {
    checkConnection();
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

  // Auto-scroll to selected email
  useEffect(() => {
    const selectedElement = emailListRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedIndex]);

  // ============= API Functions =============

  const checkConnection = async () => {
    try {
      const data = await emailAccountsApi.listEmailAccounts();
      
      const convertAccount = (acc: UnifiedEmailAccount): EmailAccountLocal => ({
        id: acc.id,
        email: acc.email,
        display_name: acc.display_name,
        is_primary: acc.is_primary,
        type: acc.provider as "gmail" | "microsoft",
        status: acc.status,
        needs_reauth: acc.needs_reauth,
      });
      
      const activeAccounts = data.accounts
        .filter(acc => acc.status === "active")
        .map(convertAccount);
      
      setAllAccounts(activeAccounts);
      setIsConnected(data.has_connected_accounts);
      
      const primaryAccount = activeAccounts.find(acc => acc.is_primary);
      if (primaryAccount) {
        setSelectedAccountId(primaryAccount.id);
        setSelectedAccountType(primaryAccount.type || "gmail");
      } else if (activeAccounts.length > 0) {
        setSelectedAccountId(activeAccounts[0].id);
        setSelectedAccountType(activeAccounts[0].type || "gmail");
      }
      
      if (data.has_connected_accounts) {
        loadEmails();
      }
    } catch (error) {
      console.error("Error checking connection:", error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const loadEmails = async (accountId?: string, accountType?: "gmail" | "microsoft" | "all", folderId?: string) => {
    try {
      setLoading(true);
      const type = accountType || selectedAccountType || "gmail";
      const folder = folderId || selectedFolder;
      
      const baseUrl = type === "microsoft" ? "/api/microsoft-mail" : "/api/gmail";
      let url = `${baseUrl}/emails`;
      const params = new URLSearchParams();
      
      if (type === "gmail" && (accountId || selectedAccountId)) {
        params.append("account_id", accountId || selectedAccountId || "");
        if (folder && folder !== "INBOX") {
          params.append("label_id", folder);
        }
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(`${API_CONFIG.BASE_URL}${url.replace('/api', '')}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
      });
      const data = await response.json();
      const emailsWithSource = (data.emails || []).map((email: Email) => ({
        ...email,
        account_type: type,
        account_email: data.account_email,
      }));
      setEmails(emailsWithSource);
      setFilteredEmails(emailsWithSource);
      setSelectedIndex(0);
    } catch (error) {
      toast.error("Fehler beim Laden der E-Mails");
    } finally {
      setLoading(false);
    }
  };

  const loadEmailDetails = async (emailId: string, accountType?: "gmail" | "microsoft") => {
    try {
      setLoadingDetail(true);
      const type = accountType || selectedAccountType || "gmail";
      const baseUrl = type === "microsoft" ? "/api/microsoft-mail" : "/api/gmail";
      
      let url = `${baseUrl}/emails/${emailId}`;
      if (type === "gmail" && selectedAccountId) {
        url += `?account_id=${selectedAccountId}`;
      }
      
      const response = await fetch(`${API_CONFIG.BASE_URL}${url.replace('/api', '')}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
      });
      const data = await response.json();
      setSelectedEmail(data);
      
      // Mark as read
      if (!data.is_read) {
        await fetch(`${API_CONFIG.BASE_URL}${baseUrl.replace('/api', '')}/emails/${emailId}/mark-read${type === "gmail" && selectedAccountId ? `?account_id=${selectedAccountId}` : ""}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
        });
        setEmails(emails.map(e => e.id === emailId ? { ...e, is_read: true } : e));
      }
    } catch (error) {
      toast.error("Fehler beim Laden der E-Mail");
    } finally {
      setLoadingDetail(false);
    }
  };

  const connectEmailAccount = async (provider: EmailProvider) => {
    try {
      const data = await emailAccountsApi.connectEmailAccount(provider);
      window.location.href = data.auth_url;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Verbindung fehlgeschlagen";
      toast.error(message);
    }
  };

  const disconnectAccount = async (accountId: string) => {
    try {
      await emailAccountsApi.disconnectEmailAccount(accountId);
      await checkConnection();
      toast.success("E-Mail-Konto getrennt");
    } catch (error) {
      toast.error("Fehler beim Trennen");
    }
  };

  const archiveEmail = async (emailId?: string) => {
    const id = emailId || selectedEmail?.id;
    if (!id) {
      toast.error("Keine E-Mail ausgewählt");
      return;
    }
    try {
      const type = selectedAccountType || "gmail";
      const baseUrl = type === "microsoft" ? "/api/microsoft-mail" : "/api/gmail";
      const url = `${baseUrl}/emails/${id}/archive${type === "gmail" && selectedAccountId ? `?account_id=${selectedAccountId}` : ""}`;
      
      await fetch(`${API_CONFIG.BASE_URL}${url.replace('/api', '')}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
      });
      
      toast.success("E-Mail archiviert");
      setSelectedEmail(null);
      setEmails(emails.filter(e => e.id !== id));
      setFilteredEmails(filteredEmails.filter(e => e.id !== id));
    } catch (error) {
      toast.error("Fehler beim Archivieren");
    }
  };

  const trashEmail = async (emailId?: string) => {
    const id = emailId || selectedEmail?.id;
    if (!id) {
      toast.error("Keine E-Mail ausgewählt");
      return;
    }
    try {
      const type = selectedAccountType || "gmail";
      const baseUrl = type === "microsoft" ? "/api/microsoft-mail" : "/api/gmail";
      const url = `${baseUrl}/emails/${id}/trash${type === "gmail" && selectedAccountId ? `?account_id=${selectedAccountId}` : ""}`;
      
      await fetch(`${API_CONFIG.BASE_URL}${url.replace('/api', '')}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
      });
      
      toast.success("E-Mail gelöscht");
      setSelectedEmail(null);
      setEmails(emails.filter(e => e.id !== id));
      setFilteredEmails(filteredEmails.filter(e => e.id !== id));
    } catch (error) {
      toast.error("Fehler beim Löschen");
    }
  };

  // Keyboard navigation (must be after archiveEmail/trashEmail definitions)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredEmails.length - 1));
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          if (filteredEmails[selectedIndex]) {
            loadEmailDetails(filteredEmails[selectedIndex].id, filteredEmails[selectedIndex].account_type);
          }
          break;
        case 'c':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            setShowComposeDialog(true);
          }
          break;
        case 'r':
          if (!e.metaKey && !e.ctrlKey && selectedEmail) {
            e.preventDefault();
            setShowReplyDialog(true);
          }
          break;
        case '/':
          e.preventDefault();
          document.querySelector<HTMLInputElement>('[data-search-input]')?.focus();
          break;
        case 'e':
          if (!e.metaKey && !e.ctrlKey && selectedEmail) {
            e.preventDefault();
            archiveEmail();
          }
          break;
        case '#':
          if (selectedEmail) {
            e.preventDefault();
            trashEmail();
          }
          break;
        case 'Escape':
          setSelectedEmail(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredEmails, selectedIndex, selectedEmail, archiveEmail, trashEmail]);

  const handleSendEmail = async () => {
    if (!composeForm.to || !composeForm.subject) {
      toast.error("Bitte Empfänger und Betreff ausfüllen");
      return;
    }
    try {
      await fetch(`${API_CONFIG.BASE_URL}/gmail/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
        },
        body: JSON.stringify({
          to: composeForm.to,
          subject: composeForm.subject,
          body: composeForm.body,
          account_id: composeForm.accountId || selectedAccountId,
        }),
      });
      toast.success("E-Mail gesendet");
      setShowComposeDialog(false);
      setComposeForm({ to: "", subject: "", body: "", accountId: "" });
      loadEmails();
    } catch (error) {
      toast.error("Fehler beim Senden");
    }
  };

  const handleCreateLead = async () => {
    if (!createForm.email || !createForm.firstName || !createForm.lastName) {
      toast.error("Bitte alle Pflichtfelder ausfüllen");
      return;
    }
    try {
      await fetch(`${API_CONFIG.BASE_URL}/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
        },
        body: JSON.stringify({
          email: createForm.email,
          first_name: createForm.firstName,
          last_name: createForm.lastName,
          company_name: createForm.companyName,
          segment: createForm.segment,
          stage: "LEAD_LIST",
        }),
      });
      toast.success("Lead angelegt");
      setShowCreateLeadDialog(false);
      setCreateForm({ email: "", firstName: "", lastName: "", companyName: "", segment: "ENDKUNDE" });
    } catch (error) {
      toast.error("Fehler beim Anlegen");
    }
  };

  const prefillFromEmail = () => {
    if (selectedEmail) {
      const nameParts = selectedEmail.from_name.split(" ");
      const domain = selectedEmail.from.split("@")[1]?.split(".")[0] || "";
      const commonProviders = ["gmail", "yahoo", "outlook", "hotmail", "icloud"];
      const companyName = commonProviders.includes(domain.toLowerCase()) ? "" : domain.charAt(0).toUpperCase() + domain.slice(1);
      
      setCreateForm({
        email: selectedEmail.from,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        companyName,
        segment: "ENDKUNDE",
      });
      setShowCreateLeadDialog(true);
    }
  };

  // ============= Helpers =============

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isThisYear = date.getFullYear() === now.getFullYear();
    
    if (isToday) {
      return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    }
    if (isThisYear) {
      return date.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
    }
    return date.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "2-digit" });
  };

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (name: string | undefined | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  };

  const unreadCount = emails.filter(e => !e.is_read).length;
  const currentAccount = allAccounts.find(acc => acc.id === selectedAccountId);

  // ============= Render: Loading =============

  if (loading && !isConnected) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)] -m-4 md:-m-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Lade E-Mails...</p>
        </div>
      </div>
    );
  }

  // ============= Render: Not Connected =============

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)] -m-4 md:-m-8">
        <div className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
            <EnvelopeIconSolid className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold mb-2">E-Mail verbinden</h1>
          <p className="text-muted-foreground mb-8">
            Verbinde dein E-Mail-Konto, um Nachrichten direkt im CRM zu verwalten.
          </p>
          <div className="space-y-3">
            <Button onClick={() => connectEmailAccount("gmail")} className="w-full h-11" size="lg">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Gmail verbinden
            </Button>
            <Button onClick={() => connectEmailAccount("microsoft")} variant="outline" className="w-full h-11" size="lg">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
              Microsoft verbinden
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            Wir greifen nur auf E-Mails zu, um sie anzuzeigen und zu versenden.
          </p>
        </div>
      </div>
    );
  }

  // ============= Render: Main Layout =============

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-[calc(100vh-8rem)] -m-4 md:-m-8 bg-background">
        
        {/* ===== Top Quick Menu ===== */}
        <div className="h-12 border-b border-border bg-card flex items-center justify-between px-4 flex-shrink-0">
          {/* Left: Quick Actions */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowComposeDialog(true)}
                  className="gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Verfassen</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Neue E-Mail <span className="kbd ml-1">C</span></TooltipContent>
            </Tooltip>

            <div className="w-px h-5 bg-border mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => loadEmails(selectedAccountId || undefined, selectedAccountType || undefined)}
                  disabled={loading}
                >
                  <ArrowUturnLeftIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Aktualisieren</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => archiveEmail()}
                  disabled={!selectedEmail}
                >
                  <ArchiveBoxIcon className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Archivieren <span className="kbd ml-1">E</span></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => trashEmail()}
                  disabled={!selectedEmail}
                  className="hover:text-destructive"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Löschen <span className="kbd ml-1">#</span></TooltipContent>
            </Tooltip>
          </div>

          {/* Center: Status */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {currentAccount && (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="hidden md:inline truncate max-w-[200px]">{currentAccount.email}</span>
              </>
            )}
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount} ungelesen
              </Badge>
            )}
          </div>

          {/* Right: Settings & Search */}
          <div className="flex items-center gap-1">
            <div className="relative hidden sm:block">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                data-search-input
                placeholder="Suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 h-8 pl-8 text-sm bg-secondary/50 border-0"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 kbd text-[10px]">/</span>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => setShowAccountsDialog(true)}>
                  <Cog6ToothIcon className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Konten verwalten</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ===== Main Content Area ===== */}
        <div className="flex flex-1 min-h-0">
        
        {/* ===== Left Sidebar ===== */}
        <aside className="w-56 border-r border-border bg-sidebar-background flex flex-col min-h-0">
          {/* Account Selector */}
          <div className="p-3 border-b border-border">
            <Select
              value={selectedAccountType === "all" ? "all" : selectedAccountId || ""}
              onValueChange={(value) => {
                if (value === "all") {
                  setSelectedAccountType("all");
                  setSelectedAccountId(null);
                } else {
                  const acc = allAccounts.find(a => a.id === value);
                  if (acc) {
                    setSelectedAccountId(acc.id);
                    setSelectedAccountType(acc.type || "gmail");
                    loadEmails(acc.id, acc.type || "gmail");
                  }
                }
              }}
            >
              <SelectTrigger className="h-9 text-sm bg-background">
                <SelectValue placeholder="Konto wählen" />
              </SelectTrigger>
              <SelectContent>
                {allAccounts.length > 1 && <SelectItem value="all">Alle Konten</SelectItem>}
                {allAccounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    <span className="truncate">{acc.email || "Verbunden"}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Compose Button */}
          <div className="p-3">
            <Button onClick={() => setShowComposeDialog(true)} className="w-full justify-start gap-2" size="sm">
              <PlusIcon className="w-4 h-4" />
              Neue E-Mail
              <span className="ml-auto kbd">C</span>
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
            <NavItem 
              icon={<InboxIcon className="w-4 h-4" />} 
              label="Posteingang" 
              count={unreadCount}
              active={selectedFolder === "INBOX"}
              onClick={() => { setSelectedFolder("INBOX"); loadEmails(selectedAccountId || undefined, selectedAccountType || undefined, "INBOX"); }}
            />
            <NavItem 
              icon={<StarIcon className="w-4 h-4" />} 
              label="Markiert"
              active={selectedFolder === "STARRED"}
              onClick={() => { setSelectedFolder("STARRED"); loadEmails(selectedAccountId || undefined, selectedAccountType || undefined, "STARRED"); }}
            />
            <NavItem 
              icon={<PaperAirplaneIcon className="w-4 h-4" />} 
              label="Gesendet"
              active={selectedFolder === "SENT"}
              onClick={() => { setSelectedFolder("SENT"); loadEmails(selectedAccountId || undefined, selectedAccountType || undefined, "SENT"); }}
            />
            <NavItem 
              icon={<DocumentTextIcon className="w-4 h-4" />} 
              label="Entwürfe"
              active={selectedFolder === "DRAFT"}
              onClick={() => { setSelectedFolder("DRAFT"); loadEmails(selectedAccountId || undefined, selectedAccountType || undefined, "DRAFT"); }}
            />
            <NavItem 
              icon={<ArchiveBoxIcon className="w-4 h-4" />} 
              label="Archiv"
              active={selectedFolder === "ARCHIVE"}
              onClick={() => { setSelectedFolder("ARCHIVE"); loadEmails(selectedAccountId || undefined, selectedAccountType || undefined, "ARCHIVE"); }}
            />
            <NavItem 
              icon={<TrashIcon className="w-4 h-4" />} 
              label="Papierkorb"
              active={selectedFolder === "TRASH"}
              onClick={() => { setSelectedFolder("TRASH"); loadEmails(selectedAccountId || undefined, selectedAccountType || undefined, "TRASH"); }}
            />
          </nav>

          {/* Settings */}
          <div className="p-2 border-t border-border">
            <button
              onClick={() => setShowAccountsDialog(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md transition-colors"
            >
              <Cog6ToothIcon className="w-4 h-4" />
              Einstellungen
            </button>
          </div>
        </aside>

        {/* ===== Email List ===== */}
        <div className="w-80 border-r border-border flex flex-col bg-background min-h-0">
          {/* List Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-medium text-sm">{
                selectedFolder === "INBOX" ? "Posteingang" :
                selectedFolder === "STARRED" ? "Markiert" :
                selectedFolder === "SENT" ? "Gesendet" :
                selectedFolder === "DRAFT" ? "Entwürfe" :
                selectedFolder === "ARCHIVE" ? "Archiv" :
                selectedFolder === "TRASH" ? "Papierkorb" : "E-Mails"
              }</h2>
              <p className="text-xs text-muted-foreground">
                {filteredEmails.length} {filteredEmails.length === 1 ? 'E-Mail' : 'E-Mails'}
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => loadEmails(selectedAccountId || undefined, selectedAccountType || undefined, selectedFolder)}
                  disabled={loading}
                  className="h-8 w-8 p-0"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Aktualisieren</TooltipContent>
            </Tooltip>
          </div>

          {/* Email List */}
          <div ref={emailListRef} className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <InboxIcon className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">Keine E-Mails</p>
              </div>
            ) : (
              filteredEmails.map((email, index) => (
                <EmailListItem
                  key={email.id}
                  email={email}
                  isSelected={selectedIndex === index}
                  isActive={selectedEmail?.id === email.id}
                  dataIndex={index}
                  onClick={() => {
                    setSelectedIndex(index);
                    loadEmailDetails(email.id, email.account_type);
                  }}
                  formatTime={formatTime}
                  getInitials={getInitials}
                />
              ))
            )}
          </div>

        </div>

        {/* ===== Detail Panel ===== */}
        <main className="flex-1 flex flex-col bg-background overflow-hidden min-h-0 min-w-0 border-r border-border">
          {selectedEmail ? (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={prefillFromEmail}>
                        <UserPlusIcon className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Als Lead anlegen</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => setShowReplyDialog(true)}>
                        <ArrowUturnLeftIcon className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Antworten <span className="kbd ml-1">R</span></TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <ArrowUturnRightIcon className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Weiterleiten</TooltipContent>
                  </Tooltip>

                  <div className="w-px h-5 bg-border mx-1" />
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => archiveEmail()}>
                        <ArchiveBoxIcon className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Archivieren <span className="kbd ml-1">E</span></TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => trashEmail()} className="hover:text-destructive">
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Löschen <span className="kbd ml-1">#</span></TooltipContent>
                  </Tooltip>
                </div>
                
                <Button variant="ghost" size="sm" onClick={() => setSelectedEmail(null)}>
                  <XMarkIcon className="w-4 h-4" />
                </Button>
              </div>

              {/* Email Content */}
              <div className="flex-1 overflow-y-auto p-6 min-h-0">
                {loadingDetail ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="max-w-3xl">
                    {/* Subject */}
                    <h1 className="text-xl font-semibold mb-4">{selectedEmail.subject || "(Kein Betreff)"}</h1>
                    
                    {/* Sender Info */}
                    <div className="flex items-start gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                        {getInitials(selectedEmail.from_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{selectedEmail.from_name}</span>
                          <span className="text-muted-foreground text-sm">&lt;{selectedEmail.from}&gt;</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          an mich · {formatFullDate(selectedEmail.date)}
                        </p>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="prose prose-sm max-w-none dark:prose-invert bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg p-4 border border-border shadow-sm">
                      <div 
                        className="email-content [&_*]:!max-w-full [&_img]:!max-w-full [&_table]:!max-w-full [&_*]:!box-border"
                        style={{ 
                          colorScheme: 'light dark',
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word'
                        }}
                        dangerouslySetInnerHTML={{ 
                          __html: selectedEmail.body_html || selectedEmail.body_text.replace(/\n/g, '<br/>') 
                        }} 
                      />
                    </div>

                    {/* Attachments */}
                    {selectedEmail.has_attachments && selectedEmail.attachments.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-border">
                        <p className="text-sm font-medium mb-3">
                          {selectedEmail.attachments.length} Anhang{selectedEmail.attachments.length > 1 ? 'e' : ''}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedEmail.attachments.map(att => (
                            <div 
                              key={att.id}
                              className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg text-sm hover:bg-secondary/80 cursor-pointer"
                            >
                              <PaperClipIcon className="w-4 h-4 text-muted-foreground" />
                              <span className="truncate max-w-[200px]">{att.filename}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <EnvelopeIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Wähle eine E-Mail aus</p>
                <p className="text-sm mt-1 opacity-60">oder drücke <kbd className="kbd">C</kbd> zum Verfassen</p>
              </div>
            </div>
          )}
        </main>
        </div>{/* End Main Content Area */}
      </div>

      {/* ===== Dialogs ===== */}
      
      {/* Compose Dialog */}
      <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Neue E-Mail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>An</Label>
              <Input 
                type="email" 
                value={composeForm.to} 
                onChange={(e) => setComposeForm({...composeForm, to: e.target.value})}
                placeholder="empfaenger@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Betreff</Label>
              <Input 
                value={composeForm.subject} 
                onChange={(e) => setComposeForm({...composeForm, subject: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Nachricht</Label>
              <textarea 
                value={composeForm.body} 
                onChange={(e) => setComposeForm({...composeForm, body: e.target.value})}
                className="w-full min-h-[200px] p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowComposeDialog(false)}>Abbrechen</Button>
              <Button onClick={handleSendEmail}>Senden</Button>
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
          <div className="space-y-4 pt-4">
            <div className="p-3 bg-secondary rounded-lg">
              <p className="text-sm text-muted-foreground">An: {selectedEmail?.from}</p>
              <p className="text-sm text-muted-foreground">Betreff: Re: {selectedEmail?.subject}</p>
            </div>
            <div className="space-y-2">
              <Label>Nachricht</Label>
              <textarea 
                value={replyForm.body} 
                onChange={(e) => setReplyForm({body: e.target.value})}
                className="w-full min-h-[200px] p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowReplyDialog(false)}>Abbrechen</Button>
              <Button onClick={() => {
                toast.success("Antwort gesendet");
                setShowReplyDialog(false);
                setReplyForm({ body: "" });
              }}>Senden</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Lead Dialog */}
      <Dialog open={showCreateLeadDialog} onOpenChange={setShowCreateLeadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lead anlegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>E-Mail *</Label>
              <Input 
                type="email" 
                value={createForm.email} 
                onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vorname *</Label>
                <Input 
                  value={createForm.firstName} 
                  onChange={(e) => setCreateForm({...createForm, firstName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Nachname *</Label>
                <Input 
                  value={createForm.lastName} 
                  onChange={(e) => setCreateForm({...createForm, lastName: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Firma</Label>
              <Input 
                value={createForm.companyName} 
                onChange={(e) => setCreateForm({...createForm, companyName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Segment</Label>
              <Select value={createForm.segment} onValueChange={(v) => setCreateForm({...createForm, segment: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENDKUNDE">Endkunde</SelectItem>
                  <SelectItem value="ENERGIEBERATER">Energieberater</SelectItem>
                  <SelectItem value="HEIZUNGSBAUER">Heizungsbauer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCreateLeadDialog(false)}>Abbrechen</Button>
              <Button onClick={handleCreateLead}>Anlegen</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Accounts Dialog */}
      <Dialog open={showAccountsDialog} onOpenChange={setShowAccountsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>E-Mail-Konten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {allAccounts.length > 0 ? (
              <div className="space-y-2">
                {allAccounts.map(account => (
                  <div key={account.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                        {getInitials(account.email?.split("@")[0] || "?")}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{account.email}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {account.type === "microsoft" ? "Microsoft" : "Gmail"}
                          </Badge>
                          {account.is_primary && <Badge variant="secondary" className="text-xs">Primär</Badge>}
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => disconnectAccount(account.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">Keine Konten verbunden</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => connectEmailAccount("gmail")} variant="outline" className="w-full">
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Gmail
              </Button>
              <Button onClick={() => connectEmailAccount("microsoft")} variant="outline" className="w-full">
                <svg className="w-4 h-4 mr-2" viewBox="0 0 23 23">
                  <path fill="#f35325" d="M1 1h10v10H1z"/>
                  <path fill="#81bc06" d="M12 1h10v10H12z"/>
                  <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                  <path fill="#ffba08" d="M12 12h10v10H12z"/>
                </svg>
                Microsoft
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

// ============= Sub-Components =============

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}

const NavItem = ({ icon, label, count, active, onClick }: NavItemProps) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${
      active 
        ? "bg-primary/10 text-primary font-medium" 
        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
    }`}
  >
    <div className="flex items-center gap-2">
      {icon}
      <span>{label}</span>
    </div>
    {count !== undefined && count > 0 && (
      <span className={`text-xs px-1.5 py-0.5 rounded ${active ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
        {count}
      </span>
    )}
  </button>
);

interface EmailListItemProps {
  email: Email;
  isSelected: boolean;
  isActive: boolean;
  dataIndex: number;
  onClick: () => void;
  formatTime: (date: string) => string;
  getInitials: (name: string) => string;
}

const EmailListItem = ({ email, isSelected, isActive, dataIndex, onClick, formatTime, getInitials }: EmailListItemProps) => (
  <button
    data-index={dataIndex}
    onClick={onClick}
    className={`w-full text-left px-3 py-3 border-b border-border transition-colors ${
      isActive ? "bg-primary/5 border-l-2 border-l-primary" : 
      isSelected ? "bg-secondary/50" : "hover:bg-secondary/30"
    }`}
  >
    <div className="flex items-start gap-3">
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
        email.is_read ? "bg-secondary text-muted-foreground" : "bg-primary/10 text-primary"
      }`}>
        {getInitials(email.from_name)}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={`text-sm truncate ${!email.is_read ? "font-semibold" : "text-muted-foreground"}`}>
            {email.from_name}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">{formatTime(email.date)}</span>
        </div>
        <p className={`text-sm truncate ${!email.is_read ? "font-medium" : "text-muted-foreground"}`}>
          {email.subject || "(Kein Betreff)"}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{email.snippet}</p>
      </div>
    </div>
    
    {/* Indicators */}
    <div className="flex items-center gap-1 mt-2 ml-11">
      {!email.is_read && <div className="w-2 h-2 rounded-full bg-primary" />}
      {email.has_attachments && <PaperClipIcon className="w-3 h-3 text-muted-foreground" />}
      {email.labels?.includes('STARRED') && <StarIconSolid className="w-3 h-3 text-amber-500" />}
    </div>
  </button>
);

export default EmailsPage;
